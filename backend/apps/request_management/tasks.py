from celery import shared_task
from django.conf import settings
from django.utils import timezone

from apps.clients.models import Client
from apps.common.ai.client import AIService
from apps.common.ai.exceptions import AIRateLimitError, AIServiceError
from apps.common.logger import logger
from apps.request_management.models import File, Request
from config.celery import app

from .models import InternalNote, Request, RequestActivity
from .repositories import RequestActivityRepository

CATEGORY_OPTIONS = ["design", "dev", "content", "feedback"]

# @app.task(bind=True, max_retries=3, default_retry_delay=10)
# def generate_ai_summary(self, request_id: str):
#     """
#     Generate a 2-3 sentence summary for a request.
#     Stores result in requests.ai_summary.
#     TODO: implement with OpenAI when ready.
#     """
#     pass


# @app.task(bind=True, max_retries=3, default_retry_delay=10)
# def generate_ai_category(self, request_id: str):
#     """
#     Assign a category to a request (design, dev, content, feedback).
#     Stores result in requests.ai_category.
#     TODO: implement with OpenAI when ready.
#     """
#     pass


@app.task
def purge_soft_deleted_records():
    """
    Nightly — hard-delete records soft-deleted more than 30 days ago.
    Covers: Request, Client, File.
    """

    cutoff = timezone.now() - timezone.timedelta(days=30)

    deleted_requests, _ = Request.objects.filter(
        is_deleted=True,
        deleted_at__lt=cutoff,
    ).delete()

    deleted_clients, _ = Client.objects.filter(
        is_deleted=True,
        deleted_at__lt=cutoff,
    ).delete()

    deleted_files, _ = File.objects.filter(
        is_deleted=True,
        deleted_at__lt=cutoff,
    ).delete()

    logger.info(
        f"[purge_soft_deleted_records] "
        f"Requests: {deleted_requests}, "
        f"Clients: {deleted_clients}, "
        f"Files: {deleted_files}"
    )

    return {
        "requests": deleted_requests,
        "clients": deleted_clients,
        "files": deleted_files,
    }


@shared_task(
    bind=True,
    autoretry_for=(AIRateLimitError,),
    retry_backoff=True,
    retry_backoff_max=120,
    max_retries=3,
)
def categorise_request(self, request_id):
    try:
        request_obj = Request.objects.get(id=request_id, is_deleted=False)
    except Request.DoesNotExist:
        logger.warning(f"[categorise_request] Request {request_id} not found.")
        return

    try:
        category = (
            AIService.complete(
                system=(
                    "Categorise this freelance client request into exactly one word: "
                    f"one of {', '.join(CATEGORY_OPTIONS)}. Reply with only that single word, lowercase."
                ),
                user=f"Title: {request_obj.title}\nDescription: {request_obj.description}",
                model=settings.AI_MODEL_FAST,
                max_tokens=10,
                temperature=0,
            )
            .lower()
            .strip()
        )
    except AIServiceError as e:
        logger.error(f"[categorise_request] AI call failed for {request_id}: {e}")
        return

    if category not in CATEGORY_OPTIONS:
        category = "feedback"

    Request.objects.filter(id=request_id).update(ai_category=category)


@shared_task(
    bind=True,
    autoretry_for=(AIRateLimitError,),
    retry_backoff=True,
    retry_backoff_max=120,
    max_retries=3,
)
def generate_request_summary(self, request_id):
    try:
        request_obj = Request.objects.get(id=request_id, is_deleted=False)
    except Request.DoesNotExist:
        logger.warning(f"[generate_request_summary] Request {request_id} not found.")
        return

    try:
        summary = AIService.complete(
            system="Summarise this client request in 2-3 plain sentences for the service provider. No preamble.",
            user=f"Title: {request_obj.title}\nDescription: {request_obj.description}",
            model=settings.AI_MODEL_QUALITY,
            max_tokens=500,
        )
    except AIServiceError as e:
        logger.error(f"[generate_request_summary] AI call failed for {request_id}: {e}")
        return

    Request.objects.filter(id=request_id).update(ai_summary=summary)

    RequestActivityRepository.log(
        request_obj=request_obj,
        event_type=RequestActivity.EventType.AI_SUMMARY_GENERATED,
        description="AI summary generated.",
        actor=None,
        actor_source=RequestActivity.ActorSource.AI,
    )


@shared_task(
    bind=True,
    autoretry_for=(AIRateLimitError,),
    retry_backoff=True,
    retry_backoff_max=120,
    max_retries=3,
)
def generate_triage_note(self, request_id):
    try:
        request_obj = Request.objects.select_related("tenant", "provider").get(
            id=request_id, is_deleted=False
        )
    except Request.DoesNotExist:
        logger.warning(f"[generate_triage_note] Request {request_id} not found.")
        return

    try:
        note_text = AIService.complete(
            system=(
                "Write a short internal triage note for the provider (2-3 sentences): "
                "a rough effort estimate (quick / moderate / involved) and anything unclear or risky. "
                "No greeting, no sign-off."
            ),
            user=f"Title: {request_obj.title}\nDescription: {request_obj.description}",
            model=settings.AI_MODEL_QUALITY,
            max_tokens=500,
        )
    except AIServiceError as e:
        logger.error(f"[generate_triage_note] AI call failed for {request_id}: {e}")
        return

    InternalNote.objects.create(
        request=request_obj,
        tenant=request_obj.tenant,
        user=request_obj.provider,
        content=note_text,
        is_ai_generated=True,
    )

    RequestActivityRepository.log(
        request_obj=request_obj,
        event_type=RequestActivity.EventType.NOTE_ADDED,
        description="AI triage note added.",
        actor=None,
        actor_source=RequestActivity.ActorSource.AI,
    )
