"""Sprint 9 — Notification engine.

Pure helpers for rendering templates and dispatching messages, plus default
template seeds. The worker + router orchestrate DB persistence; these
functions stay DB-agnostic and testable.
"""
from __future__ import annotations


APPLICATION_STATUS_NOTIFICATIONS = {
    "shortlisted": {
        "kind": "application_status",
        "title": "Application Shortlisted",
        "template": "You have been shortlisted for {jobTitle} at {company}. "
                    "The employer will contact you for the next round.",
    },
    "interview": {
        "kind": "application_status",
        "title": "Interview Scheduled",
        "template": "Great news! You have been selected for an interview for "
                    "{jobTitle} at {company}. Prepare well!",
    },
    "offered": {
        "kind": "application_status",
        "title": "Job Offer",
        "template": "Congratulations! You have received a job offer for "
                    "{jobTitle} at {company}. Review and accept it on the portal.",
    },
    "hired": {
        "kind": "application_status",
        "title": "You're Hired!",
        "template": "Celebrations! You have been hired for {jobTitle} at "
                    "{company}. Welcome aboard!",
    },
    "rejected": {
        "kind": "application_status",
        "title": "Application Update",
        "template": "We regret to inform you that your application for "
                    "{jobTitle} at {company} was not shortlisted this time. "
                    "Keep applying — more opportunities await on the portal.",
    },
}


def render_template(body: str, variables: dict[str, str]) -> str:
    """Substitute {{key}} and {key} placeholders in a template body."""
    for k, v in (variables or {}).items():
        body = body.replace("{{" + k + "}}", v).replace("{" + k + "}", v)
    return body


def build_application_status_variables(
    job_title: str, company: str | None
) -> dict[str, str]:
    return {
        "jobTitle": job_title or "your job application",
        "company": company or "the employer",
    }


def dispatch_via_service(
    channel: str,
    phone: str,
    body: str,
    variables: dict[str, str] | None = None,
    template_sid: str | None = None,
) -> str:
    """Send a message by channel; returns provider message id or '' on failure.

    Synchronous wrapper around the async transport helpers.
    """
    import asyncio

    if channel == "sms":
        from app.integrations.sms_gateway import send_sms_msg91

        msg_id = asyncio.run(send_sms_msg91(phone, body))
        return msg_id or ""
    from app.integrations.twilio_whatsapp import send_whatsapp_message

    msg_id = asyncio.run(
        send_whatsapp_message(
            to_phone=phone,
            template_sid=template_sid or "HX_template_placeholder",
            variables=variables or {},
        )
    )
    return msg_id or ""


DEFAULT_TEMPLATES: list[dict] = [
    {
        "name": "job_alert",
        "channel": "whatsapp",
        "kind": "job_alert",
        "variables": [{"key": "jobTitle", "label": "Job Title"}],
        "body": "New opportunity: {jobTitle} is now available for you. "
                "Check your SkillTrace portal for matching jobs.",
    },
    {
        "name": "app_shortlisted",
        "channel": "whatsapp",
        "kind": "application_status",
        "variables": [
            {"key": "jobTitle", "label": "Job Title"},
            {"key": "company", "label": "Company"},
        ],
        "body": APPLICATION_STATUS_NOTIFICATIONS["shortlisted"]["template"],
    },
    {
        "name": "app_interview",
        "channel": "whatsapp",
        "kind": "application_status",
        "variables": [
            {"key": "jobTitle", "label": "Job Title"},
            {"key": "company", "label": "Company"},
        ],
        "body": APPLICATION_STATUS_NOTIFICATIONS["interview"]["template"],
    },
    {
        "name": "app_offered",
        "channel": "whatsapp",
        "kind": "application_status",
        "variables": [
            {"key": "jobTitle", "label": "Job Title"},
            {"key": "company", "label": "Company"},
        ],
        "body": APPLICATION_STATUS_NOTIFICATIONS["offered"]["template"],
    },
    {
        "name": "app_hired",
        "channel": "whatsapp",
        "kind": "application_status",
        "variables": [
            {"key": "jobTitle", "label": "Job Title"},
            {"key": "company", "label": "Company"},
        ],
        "body": APPLICATION_STATUS_NOTIFICATIONS["hired"]["template"],
    },
    {
        "name": "app_rejected",
        "channel": "whatsapp",
        "kind": "application_status",
        "variables": [
            {"key": "jobTitle", "label": "Job Title"},
            {"key": "company", "label": "Company"},
        ],
        "body": APPLICATION_STATUS_NOTIFICATIONS["rejected"]["template"],
    },
]
