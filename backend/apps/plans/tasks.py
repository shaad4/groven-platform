from apps.common.logger import logger
from config.celery import app

from .services import BillingService


@app.task(bind=True, max_retries=3, default_retry_delay=10)
def sync_billing_event(self, event_type, event_data):
    """
    Async — records a BillingHistory row from a Stripe webhook payload.
    Called by the webhook view after the synchronous plan-change logic
    has already run, so the user isn't blocked on this.
    """
    try:
        BillingService.record_billing_history(event_data, event_type)
    except Exception as e:
        logger.error(f"[sync_billing_event] Failed for event {event_type}: {e}")
        raise self.retry(exc=e)
