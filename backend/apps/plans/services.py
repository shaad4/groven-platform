from datetime import date

import stripe
from django.conf import settings
from django.db import transaction

from apps.common.logger import logger
from apps.tenants.models import BillingHistory, Plan, Tenant

from .repositories import BillingHistoryRepository

stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeConfigError(Exception):
    pass


class CheckoutSessionError(Exception):
    pass


class PortalSessionError(Exception):
    pass


class BillingService:

    _BILLING_EVENT_STATUS = {
        "checkout.session.completed": BillingHistory.Status.PAID,
        "invoice.payment_succeeded": BillingHistory.Status.PAID,
        "invoice.payment_failed": BillingHistory.Status.FAILED,
    }

    @staticmethod
    def _get_or_create_stripe_customer(tenant, user_email):
        """Ensures the tenant has a Stripe customer, creating one if needed"""
        if tenant.stripe_customer_id:
            return tenant.stripe_customer_id

        customer = stripe.Customer.create(
            email=user_email,
            name=tenant.name,
            metadata={"tenant_id": str(tenant.id), "tenant_slug": tenant.slug},
        )
        Tenant.objects.filter(id=tenant.id).update(stripe_customer_id=customer.id)
        return customer.id

    @staticmethod
    def create_checkout_session(tenant, user_email, success_url, cancel_url):
        pro_plan = Plan.objects.filter(name="pro").first()
        if not pro_plan or not pro_plan.stripe_price_id:
            raise StripeConfigError(
                "Pro plan is not configured with a Stripe price yet."
            )

        customer_id = BillingService._get_or_create_stripe_customer(tenant, user_email)

        try:
            session = stripe.checkout.Session.create(
                customer=customer_id,
                mode="subscription",
                line_items=[{"price": pro_plan.stripe_price_id, "quantity": 1}],
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={"tenant_id": str(tenant.id)},
                subscription_data={"metadata": {"tenant_id": str(tenant.id)}},
            )
        except stripe.error.StripeError as e:
            logger.error(
                f"[create_checkout_session] Stripe error for tenant {tenant.id}: {e}"
            )
            raise CheckoutSessionError(str(e))

        return session.url

    @staticmethod
    def create_portal_session(tenant, return_url):
        if not tenant.stripe_customer_id:
            raise PortalSessionError("No billing account found for this workspace yet.")

        try:
            session = stripe.billing_portal.Session.create(
                customer=tenant.stripe_customer_id,
                return_url=return_url,
            )
        except stripe.error.StripeError as e:
            logger.error(
                f"[create_portal_session] Stripe error for tenant {tenant.id}: {e}"
            )
            raise PortalSessionError(str(e))

        return session.url

    # Webhook Handlers

    @staticmethod
    @transaction.atomic
    def handle_checkout_completed(event_data):

        tenant_id = event_data["metadata"]["tenant_id"]

        if not tenant_id:
            logger.warning(
                "[handle_checkout_completed] No tenant_id in session metadata."
            )
            return

        tenant = Tenant.objects.select_for_update().filter(id=tenant_id).first()

        if not tenant:
            logger.warning(f"[handle_checkout_completed] Tenant {tenant_id} not found.")
            return

        pro_plan = Plan.objects.filter(name="pro").first()

        if not pro_plan:
            logger.error("[handle_checkout_completed] Pro plan missing from DB.")
            return

        subscription_id = event_data["subscription"]

        Tenant.objects.filter(id=tenant.id).update(
            plan=pro_plan,
            stripe_subscription_id=subscription_id,
        )

        logger.info(f"[handle_checkout_completed] Tenant {tenant.id} upgraded to Pro.")

    @staticmethod
    @transaction.atomic
    def handle_subscription_deleted(event_data):
        subscription_id = event_data["id"]
        tenant = (
            Tenant.objects.select_for_update()
            .filter(stripe_subscription_id=subscription_id)
            .first()
        )
        if not tenant:
            logger.warning(
                f"[handle_subscription_deleted] No tenant found for subscription {subscription_id}."
            )
            return

        free_plan = Plan.objects.filter(name="free").first()
        if not free_plan:
            logger.error("[handle_subscription_deleted] Free plan missing from DB.")
            return

        Tenant.objects.filter(id=tenant.id).update(
            plan=free_plan,
            stripe_subscription_id=None,
        )

        logger.info(
            f"[handle_subscription_deleted] Tenant {tenant.id} downgraded to Free."
        )

    @staticmethod
    def handle_payment_failed(event_data):
        customer_id = event_data.get("customer")
        tenant = Tenant.objects.filter(stripe_customer_id=customer_id).first()
        if not tenant:
            logger.warning(
                f"[handle_payment_failed] No tenant found for customer {customer_id}."
            )
            return

        logger.warning(
            f"[handle_payment_failed] Payment failed for tenant {tenant.id}."
        )
        # Downgrade happens via customer.subscription.deleted once Stripe's
        # dunning process exhausts retries no immediate action here.

    @staticmethod
    def record_billing_history(event_data, event_type):
        """Writes a BillingHistory row from a Stripe event payload."""

        if event_type not in BillingService._BILLING_EVENT_STATUS:
            # Not a payment/invoice event (e.g. subscription cancellation) —
            # nothing to record here.
            return

        customer_id = event_data.get("customer")
        tenant = Tenant.objects.filter(stripe_customer_id=customer_id).first()
        if not tenant:
            logger.warning(
                f"[record_billing_history] No tenant for customer {customer_id}."
            )
            return

        invoice_id = (
            event_data.get("id")
            if event_type != "checkout.session.completed"
            else event_data.get("invoice")
        )

        if BillingHistoryRepository.exists_for_invoice(invoice_id):
            return

        amount_cents = (
            event_data.get("amount_total") or event_data.get("amount_paid") or 0
        )
        currency = (event_data.get("currency") or "usd").upper()

        period = (
            event_data.get("lines", {}).get("data", [{}])[0].get("period", {})
            if event_data.get("lines")
            else {}
        )
        period_start = (
            date.fromtimestamp(period["start"]) if period.get("start") else date.today()
        )
        period_end = (
            date.fromtimestamp(period["end"]) if period.get("end") else date.today()
        )

        pro_plan = Plan.objects.filter(name="pro").first()

        BillingHistoryRepository.create(
            tenant=tenant,
            plan=pro_plan or tenant.plan,
            amount=amount_cents / 100,
            currency=currency,
            status=BillingService._BILLING_EVENT_STATUS[event_type],
            period_start=period_start,
            period_end=period_end,
            stripe_invoice_id=invoice_id,
            stripe_payment_intent_id=event_data.get("payment_intent"),
        )
