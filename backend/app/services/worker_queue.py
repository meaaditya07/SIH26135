"""Sprint 9 — Celery bridge.

Thin helper to enqueue background delivery of a Notification row. Safe when
the broker is unavailable: any Celery import/broker error is swallowed so the
API stays up; a Notification that could not be queued remains `queued` and can
be retried by the worker later.
"""


def enqueue_delivery(notification_id: str) -> None:
    """Dispatch a notification id to the Celery worker (fire-and-forget)."""
    try:
        from workers.tasks.notification_dispatch import deliver_notification
        deliver_notification.delay(notification_id)
    except Exception:
        # No broker / celery not importable in-process: leave the row queued
        # for a manual or periodic retry rather than failing the API call.
        return None
