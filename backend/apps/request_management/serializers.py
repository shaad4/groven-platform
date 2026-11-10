from rest_framework import serializers

from .models import Delivery, File, InternalNote, Request, RequestActivity
from .services import FileService


class FileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = File
        fields = [
            "id",
            "file_name",
            "download_url",
            "file_size_bytes",
            "file_type",
            "file_extension",
            "is_delivery_file",
            "uploaded_by_name",
            "created_at",
        ]

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.display_name if obj.uploaded_by else None

    def get_download_url(self, obj):
        return FileService.generate_download_url(obj.s3_key)


class DeliverySerializer(serializers.ModelSerializer):
    files = FileSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Delivery
        fields = [
            "id",
            "delivery_number",
            "message",
            "links",
            "created_by_name",
            "files",
            "created_at",
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.display_name if obj.created_by else None


class RequestActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = RequestActivity
        fields = [
            "id",
            "event_type",
            "actor_source",
            "description",
            "metadata",
            "actor_name",
            "created_at",
        ]

    def get_actor_name(self, obj):
        return obj.actor.display_name if obj.actor else "System"


class InternalNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = InternalNote
        fields = [
            "id",
            "content",
            "is_ai_generated",
            "author_name",
            "created_at",
            "updated_at",
        ]

    def get_author_name(self, obj):
        return obj.user.display_name if obj.user else None


class RequestListSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    client_email = serializers.SerializerMethodField()
    client_avatar_url = serializers.SerializerMethodField()
    file_count = serializers.SerializerMethodField()
    client_id = serializers.UUIDField(source="client.id", read_only=True)

    class Meta:
        model = Request
        fields = [
            "id",
            "title",
            "status",
            "is_urgent",
            "due_date",
            "ai_category",
            "client_name",
            "client_email",
            "client_avatar_url",
            "file_count",
            "created_at",
            "updated_at",
            "client_id",
        ]

    def get_client_name(self, obj):
        if obj.client.user:
            return obj.client.user.display_name
        return obj.client.client_name

    def get_client_email(self, obj):
        if obj.client.user:
            return obj.client.user.email
        return obj.client.client_email

    def get_client_avatar_url(self, obj):
        return obj.client.user.avatar_url if obj.client.user else None

    def get_file_count(self, obj):
        if hasattr(obj, "active_file_count"):
            return obj.active_file_count
        try:
            return obj.files.filter(is_deleted=False).count()
        except Exception:
            return 0


class RequestDetailSerializer(RequestListSerializer):
    files = serializers.SerializerMethodField()
    deliveries = DeliverySerializer(many=True, read_only=True)

    class Meta(RequestListSerializer.Meta):
        fields = RequestListSerializer.Meta.fields + [
            "description",
            "ai_summary",
            "files",
            "deliveries",
        ]

    def get_files(self, obj):
        non_delivery_files = [
            f for f in obj.files.all() if not f.is_delivery_file and not f.is_deleted
        ]
        return FileSerializer(non_delivery_files, many=True).data


class CreateRequestSerializer(serializers.Serializer):
    title = serializers.CharField(min_length=3, max_length=500)
    description = serializers.CharField(min_length=10)


class UpdateRequestSerializer(serializers.Serializer):
    """Client edit — only while status == received."""

    title = serializers.CharField(min_length=3, max_length=500, required=False)
    description = serializers.CharField(min_length=10, required=False)

    def validate(self, data):
        if not data.get("title") and not data.get("description"):
            raise serializers.ValidationError("Provide at least one field to update.")
        return data


class UpdateStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Request.Status.choices)


class SetUrgentSerializer(serializers.Serializer):
    is_urgent = serializers.BooleanField()


class SetDueDateSerializer(serializers.Serializer):
    due_date = serializers.DateField(allow_null=True)


class AddNoteSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1)


class CreateDeliverySerializer(serializers.Serializer):
    message = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    links = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True,
    )
    file_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )

    def validate_links(self, value):
        for link in value:
            if "url" not in link:
                raise serializers.ValidationError("Each link must have a 'url' field.")
        return value


class PresignedUploadSerializer(serializers.Serializer):
    file_name = serializers.CharField(max_length=500)
    file_type = serializers.CharField(max_length=100)
    request_id = serializers.UUIDField()


class ConfirmUploadSerializer(serializers.Serializer):
    request_id = serializers.UUIDField()
    file_name = serializers.CharField(max_length=500)
    s3_key = serializers.CharField()
    file_size_bytes = serializers.IntegerField(min_value=1)
    file_type = serializers.CharField(max_length=100)


class DeliveryReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "rework"])
    message = serializers.CharField(required=False, allow_blank=True, allow_null=True)
