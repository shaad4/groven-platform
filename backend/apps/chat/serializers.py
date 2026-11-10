from rest_framework import serializers

from apps.request_management.services import FileService

from .models import Message, MessageAttachment


class MessageAttachmentsSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="file.id", read_only=True)
    file_name = serializers.CharField(source="file.file_name", read_only=True)
    file_type = serializers.CharField(source="file.file_type", read_only=True)
    file_size_bytes = serializers.IntegerField(
        source="file.file_size_bytes", read_only=True
    )
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = MessageAttachment
        fields = ["id", "file_name", "file_type", "file_size_bytes", "download_url"]

    def get_download_url(self, obj):
        return FileService.generate_download_url(obj.file.s3_key)


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.display_name", read_only=True)
    sender_email = serializers.CharField(source="sender.email", read_only=True)
    attachments = MessageAttachmentsSerializer(many=True, read_only=True)
    attachment_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list, write_only=True
    )

    class Meta:
        model = Message
        fields = [
            "id",
            "request",
            "sender",
            "sender_name",
            "sender_email",
            "content",
            "is_read",
            "read_at",
            "created_at",
            "attachment_ids",
            "attachments",
        ]
        read_only_fields = [
            "id",
            "sender",
            "sender_name",
            "sender_email",
            "is_read",
            "read_at",
            "created_at",
            "attachments",
        ]
