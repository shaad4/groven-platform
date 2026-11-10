from django.urls import path

from .views import (ConfirmUploadView, DeliveryReviewView, DeliveryView,
                    InternalNoteView, PresignedUploadView,
                    RegenerateSummaryView, RequestActivityView,
                    RequestDetailView, RequestDueDateView, RequestFilesView,
                    RequestFlagView, RequestListCreateView, RequestStatusView,
                    SuggestDeliveryMessageView, SuggestRepliesView)

urlpatterns = [
    path("", RequestListCreateView.as_view(), name="request-list-create"),
    path("<uuid:request_id>/", RequestDetailView.as_view(), name="request-detail"),
    path(
        "<uuid:request_id>/status/", RequestStatusView.as_view(), name="request-status"
    ),
    path("<uuid:request_id>/flag/", RequestFlagView.as_view(), name="request-flag"),
    path(
        "<uuid:request_id>/due-date/",
        RequestDueDateView.as_view(),
        name="request-due-date",
    ),
    path(
        "<uuid:request_id>/activity/",
        RequestActivityView.as_view(),
        name="request-activity",
    ),
    path("<uuid:request_id>/notes/", InternalNoteView.as_view(), name="request-notes"),
    path(
        "<uuid:request_id>/deliveries/",
        DeliveryView.as_view(),
        name="request-deliveries",
    ),
    path("files/upload/presign/", PresignedUploadView.as_view(), name="file-presign"),
    path("files/upload/confirm/", ConfirmUploadView.as_view(), name="file-confirm"),
    path("<uuid:request_id>/files/", RequestFilesView.as_view(), name="request-files"),
    path(
        "<uuid:request_id>/deliveries/<uuid:delivery_id>/review/",
        DeliveryReviewView.as_view(),
        name="delivery-review",
    ),
    path("<uuid:request_id>/suggest-replies/", SuggestRepliesView.as_view()),
    path(
        "<uuid:request_id>/suggest-delivery-message/",
        SuggestDeliveryMessageView.as_view(),
    ),
    path("<uuid:request_id>/regenerate-summary/", RegenerateSummaryView.as_view()),
]
