import stripe
from django.conf import settings
from django.core.management.base import BaseCommand

from apps.tenants.models import Plan

stripe.api_key = settings.STRIPE_SECRET_KEY


class Command(BaseCommand):
    help = (
        "One-time setup — creates a Stripe Product + Price for the Pro plan "
        "(if not already configured) and writes stripe_price_id back onto the "
        "Plan row. Idempotent — safe to re-run."
    )

    def handle(self, *args, **options):
        pro_plan = Plan.objects.filter(name="pro").first()

        if not pro_plan:
            self.stdout.write(
                self.style.ERROR(
                    "No 'pro' Plan row found. Seed your plans table first."
                )
            )
            return

        if pro_plan.stripe_price_id:
            self.stdout.write(
                self.style.WARNING(
                    f"Pro plan already has stripe_price_id={pro_plan.stripe_price_id}. Skipping."
                )
            )
            return

        product = stripe.Product.create(
            name="Groven Pro",
            description="Groven Pro plan — unlimited clients and requests.",
        )

        price = stripe.Price.create(
            product=product.id,
            unit_amount=int(pro_plan.price_monthly * 100),
            currency="usd",
            recurring={"interval": "month"},
        )

        Plan.objects.filter(id=pro_plan.id).update(stripe_price_id=price.id)

        self.stdout.write(
            self.style.SUCCESS(
                f"Created Stripe product {product.id} / price {price.id} "
                f"and linked to Plan '{pro_plan.name}'."
            )
        )
