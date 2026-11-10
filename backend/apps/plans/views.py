import json

import stripe
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.logger import logger
from apps.tenants.models import Plan, TenantMembership

from .repositories import BillingHistoryRepository
from .services import (BillingService, CheckoutSessionError,
                       PortalSessionError, StripeConfigError)
from .tasks import sync_billing_event


def _is_provider(request):
    m = getattr(request, "tenant_membership", None)
    return m is not None and m.role == TenantMembership.Role.PROVIDER


class CreateCheckoutSessionView(APIView):
    """Provider clicks 'Upgrade to Pro'  returns a Stripe Checkout URL to redirect to"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _is_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        tenant = request.tenant

        success_url = (
            request.data.get("success_url")
            or f"{settings.FRONTEND_URL}/dashboard?upgraded=true"
        )
        cancel_url = (
            request.data.get("cancel_url") or f"{settings.FRONTEND_URL}/upgrade"
        )

        try:
            checkout_url = BillingService.create_checkout_session(
                tenant=tenant,
                user_email=request.user.email,
                success_url=success_url,
                cancel_url=cancel_url,
            )
        except StripeConfigError as e:
            return Response({"success": False, "message": str(e)}, status=503)
        except CheckoutSessionError as e:
            return Response({"success": False, "message": str(e)}, status=502)

        return Response({"success": True, "data": {"checkout_url": checkout_url}})


class BillingPortalView(APIView):
    """Provider clicks 'Manage Billing' returns a Stripe Customer Portal URL."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _is_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        tenant = request.tenant
        return_url = (
            request.data.get("return_url") or f"{settings.FRONTEND_URL}/dashboard"
        )

        try:
            portal_url = BillingService.create_portal_session(
                tenant=tenant, return_url=return_url
            )
        except PortalSessionError as e:
            return Response({"success": False, "message": str(e)}, status=400)

        return Response({"success": True, "data": {"portal_url": portal_url}})


class BillingHistoryView(APIView):
    """Returns the invoice history for the current tenant."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        history = BillingHistoryRepository.get_for_tenant(request.tenant.id)

        data = [
            {
                "id": str(h.id),
                "amount": str(h.amount),
                "currency": h.currency,
                "status": h.status,
                "period_start": h.period_start,
                "period_end": h.period_end,
                "created_at": h.created_at,
            }
            for h in history
        ]

        return Response({"success": True, "data": data})


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """
    Receives Stripe webhook events. No auth — verified via signature instead.
    Handles: checkout.session.completed, customer.subscription.deleted, invoice.payment_failed
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            logger.error(f"[StripeWebhookView] Signature verification failed: {e}")
            return Response({"success": False}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event["type"]
        event_data = event["data"]["object"]

        if event_type == "checkout.session.completed":
            BillingService.handle_checkout_completed(event_data)
        elif event_type == "customer.subscription.deleted":
            BillingService.handle_subscription_deleted(event_data)
        elif event_type == "invoice.payment_failed":
            BillingService.handle_payment_failed(event_data)
        else:
            logger.info(f"[StripeWebhookView] Unhandled event type: {event_type}")
            return Response({"success": True})

        safe_event_data = json.loads(str(event_data))

        sync_billing_event.delay(
            event_type,
            safe_event_data,
        )

        return Response({"success": True})


class PublicPlanPricingView(APIView):
    """Public pricing data for the landing/upgrade pages. No auth required."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        plans = Plan.objects.filter(is_active=True, name__in=["free", "pro"])
        data = {
            p.name: {
                "price_monthly": str(p.price_monthly),
                "client_limit": p.client_limit,
                "request_limit": p.request_limit,
            }
            for p in plans
        }
        return Response({"success": True, "data": data})
