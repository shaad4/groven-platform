from apps.tenants.models import BillingHistory


class BillingHistoryRepository:

    @staticmethod
    def create(
        tenant,
        plan,
        amount,
        currency,
        status,
        period_start,
        period_end,
        stripe_invoice_id=None,
        stripe_payment_intent_id=None,
    ):
        return BillingHistory.objects.create(
            tenant=tenant,
            plan=plan,
            amount=amount,
            currency=currency,
            status=status,
            period_start=period_start,
            period_end=period_end,
            stripe_invoice_id=stripe_invoice_id,
            stripe_payment_intent_id=stripe_payment_intent_id,
        )

    @staticmethod
    def get_for_tenant(tenant_id):
        return (
            BillingHistory.objects.filter(tenant_id=tenant_id)
            .select_related("plan")
            .order_by("-created_at")
        )

    @staticmethod
    def exists_for_invoice(stripe_invoice_id):
        if not stripe_invoice_id:
            return False
        return BillingHistory.objects.filter(
            stripe_invoice_id=stripe_invoice_id
        ).exists()
