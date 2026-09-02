"""Survey dispatch, reply parsing and outcome materialization."""
from __future__ import annotations

import re
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.employment_outcome import EmploymentOutcome
from app.models.survey_response import SurveyResponse
from app.models.survey_schedule import SurveySchedule
from app.models.survey_template import SurveyTemplate

settings = get_settings()

# Map survey interval to a phone-friendly reply option set.
INTERVAL_REPLY_KEYS = {
    "3_month": ["1", "2"],
    "6_month": ["1", "2"],
    "12_month": ["1", "2"],
}

MONTHLY_SALARY_RE = re.compile(r"salary\s*[:\-]?\s*([\d,]+)", re.IGNORECASE)


async def get_template_for_interval(
    db: AsyncSession, interval: str, channel: str
) -> SurveyTemplate | None:
    result = await db.execute(
        select(SurveyTemplate).where(
            SurveyTemplate.interval == interval,
            SurveyTemplate.channel == channel,
            SurveyTemplate.is_active == True,
        ).order_by(SurveyTemplate.version.desc())
    )
    return result.scalars().first()


def render_template_body(template: SurveyTemplate, variables: dict[str, str]) -> str:
    """Substitute {{key}} and {key} placeholders in a template body."""
    body = template.body
    for k, v in variables.items():
        body = body.replace("{{" + k + "}}", v).replace("{" + k + "}", v)
    return body


def build_dispatch_payload(
    template: SurveyTemplate,
    candidate_name: str,
    interval_display: str,
    web_url: str,
) -> dict[str, str]:
    """Collate ordered variables for Twilio content variables (1..N)."""
    variables = {}
    slots = template.variables or []
    for i, slot in enumerate(slots, start=1):
        key = slot.get("key") if isinstance(slot, dict) else str(slot)
        if key == "firstName":
            variables[str(i)] = candidate_name.split()[0] if candidate_name else "there"
        elif key == "interval":
            variables[str(i)] = interval_display
        elif key == "surveyLink":
            variables[str(i)] = web_url
    return variables


def dispatch_via_service(
    channel: str, phone: str, body: str, variables: dict[str, str], template_sid: str | None
) -> str | None:
    """Dispatch a message by channel; returns provider message id or None on failure.

    Uses the matching transport helper synchronously (Twilio SDK is thread-safe).
    """
    if channel == "sms":
        from app.integrations.sms_gateway import send_sms_msg91
        import asyncio
        return asyncio.run(send_sms_msg91(phone, body))
    # whatsapp default
    import asyncio
    from app.integrations.twilio_whatsapp import send_whatsapp_message
    return asyncio.run(send_whatsapp_message(
        to_phone=phone,
        template_sid=template_sid or "HX_template_placeholder",
        variables=variables,
    ))


async def dispatch_one(
    db: AsyncSession,
    schedule: SurveySchedule,
    force_channel: str | None = None,
) -> str:
    """Dispatch a single survey, applying retry/expiry logic and SMS fallback.

    Returns the resulting status: sent | scheduled | failed | expired.
    """
    now = datetime.utcnow()
    if schedule.status == "expired":
        return "expired"

    # Expiry check: no response within the expiry window.
    created = schedule.created_at or now
    if schedule.status == "scheduled" and (
        now - created > timedelta(days=settings.SURVEY_EXPIRY_DAYS)
    ) and schedule.attempts >= settings.SURVEY_MAX_ATTEMPTS:
        schedule.status = "expired"
        await db.flush()
        return "expired"

    channel = force_channel or settings.SURVEY_CHANNEL_PREFERENCE
    template = await get_template_for_interval(db, schedule.scheduled_interval, channel)
    if not template:
        # Try the other channel before failing.
        fallback_channel = "sms" if channel == "whatsapp" else "whatsapp"
        template = await get_template_for_interval(db, schedule.scheduled_interval, fallback_channel)
        if template:
            channel = fallback_channel

    # Resolve candidate + enrollment for name/link.
    name = schedule.candidate.full_name if schedule.candidate else ""
    phone = schedule.candidate.phone if schedule.candidate else ""
    web_url = f"{settings.PUBLIC_APP_BASE_URL}/survey/{schedule.id}"

    if template:
        payload = build_dispatch_payload(template, name, schedule.scheduled_interval, web_url)
        body = render_template_body(template, payload)

        msg_id = dispatch_via_service(
            channel, phone, body, payload, template.template_sid
        )
        if msg_id:
            schedule.status = "sent"
            schedule.channel = channel
            schedule.message_template_id = msg_id
            schedule.last_attempt_at = now
            schedule.attempts = (schedule.attempts or 0) + 1
            await db.flush()
            return "sent"
        else:
            # First attempt failed -> leave scheduled for retry; mark failed otherwise.
            if (schedule.attempts or 0) >= settings.SURVEY_MAX_ATTEMPTS - 1:
                schedule.status = "failed"
            schedule.last_attempt_at = now
            schedule.attempts = (schedule.attempts or 0) + 1
            await db.flush()
            return "failed"

    schedule.status = "failed"
    await db.flush()
    return "failed"


def parse_reply(raw_text: str) -> dict:
    """Parse a free-text WhatsApp/SMS reply into an outcome payload (best effort)."""
    text = (raw_text or "").strip()
    lower = text.lower()
    result: dict = {}

    # 1) Primary employability signal.
    if any(w in lower for w in ["yes", "employed", "working", "job"]) and "not" not in lower:
        result["is_employed"] = True
    elif any(w in lower for w in ["no", "unemployed", "not working", "seeking"]):
        result["is_employed"] = False

    # 2) Salary -> monthly_salary.
    m = MONTHLY_SALARY_RE.search(text)
    if m:
        try:
            result["monthly_salary"] = float(m.group(1).replace(",", ""))
        except ValueError:
            pass

    # 3) Job title heuristics.
    if " as " in lower:
        title = text.split(" as ", 1)[1].strip().rstrip(".")
        # Trim trailing salary/junk fragment.
        title = re.split(r",?\s*salary\b|[,.!]", title, flags=re.IGNORECASE)[0].strip()
        if title and title.lower() != "now":
            result["current_job_title"] = title

    # 4) Relevance to training.
    if "relevant" in lower or "related" in lower:
        result["is_job_relevant_to_training"] = True
    elif "not relevant" in lower or "unrelated" in lower:
        result["is_job_relevant_to_training"] = False

    return result


async def materialize_outcome(
    db: AsyncSession,
    schedule: SurveySchedule,
    parsed: dict,
    channel: str,
    raw_text: str,
    provider_message_id: str | None = None,
    from_phone: str | None = None,
) -> SurveyResponse:
    """Persist a response and create an EmploymentOutcome if a reliable signal exists."""
    response = SurveyResponse(
        survey_schedule_id=schedule.id,
        candidate_id=schedule.candidate_id,
        channel=channel,
        provider_message_id=provider_message_id,
        raw_text=raw_text,
        parsed=parsed,
        from_phone=from_phone,
    )

    interval = schedule.scheduled_interval
    outcome = None
    if parsed.get("is_employed") is not None:
        outcome = EmploymentOutcome(
            candidate_id=schedule.candidate_id,
            enrollment_id=schedule.enrollment_id,
            survey_interval=interval,
            survey_date=datetime.utcnow().date(),
            is_employed=parsed["is_employed"],
            current_job_title=parsed.get("current_job_title"),
            monthly_salary=parsed.get("monthly_salary"),
            job_location=parsed.get("job_location"),
            is_job_relevant_to_training=parsed.get("is_job_relevant_to_training"),
            skills_used=parsed.get("skills_used", []),
            response_channel=channel,
            self_reported=True,
        )
        db.add(outcome)
        await db.flush()
        response.outcome_id = outcome.id

    db.add(response)
    schedule.status = "responded"
    schedule.response_received_at = datetime.utcnow()
    await db.flush()
    return response
