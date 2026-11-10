from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from rest_framework import serializers

from apps.request_management.models import Request

from .models import Client


class AddClientSerializer(serializers.Serializer):
    client_name = serializers.CharField(min_length=2, max_length=255)
    client_email = serializers.EmailField()
    business_type = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    private_note = serializers.CharField(required=False, allow_blank=True)
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True,
    )

    def validate_client_email(self, value):
        return value.lower().strip()


class AcceptInviteSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(
        write_only=True, min_length=8, required=False, allow_null=True
    )

    def validate_password(self, value):
        validate_password(value)
        return value


class TagSerializer(serializers.Serializer):
    name = serializers.CharField()
    color = serializers.CharField(allow_null=True)


class ClientListSerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    last_login = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    ai_insight = serializers.SerializerMethodField()

    open_request_count = serializers.SerializerMethodField()
    delivered_count = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id",
            "email",
            "display_name",
            "avatar_url",
            "status",
            "is_deactivated",
            "last_login",
            "joined_at",
            "created_at",
            "business_type",
            "private_note",
            "tags",
            "client_name",
            "client_email",
            "open_request_count",
            "delivered_count",
            "ai_insight",
        ]

    def get_email(self, obj):
        return obj.user.email if obj.user else obj.client_email

    def get_display_name(self, obj):
        return obj.user.display_name if obj.user else obj.client_name

    def get_avatar_url(self, obj):
        return obj.user.avatar_url if obj.user else None

    def get_last_login(self, obj):
        return obj.user.last_login if obj.user else None

    def get_ai_insight(self, obj):
        return cache.get(f"client_insight:{obj.id}")

    def get_tags(self, obj):
        return [
            {"name": tm.tag.name, "color": tm.tag.color} for tm in obj.tag_maps.all()
        ]

    def get_open_request_count(self, obj):
        return (
            Request.objects.filter(client=obj, is_deleted=False)
            .exclude(status__in=["delivered", "closed"])
            .count()
        )

    def get_delivered_count(self, obj):
        return Request.objects.filter(
            client=obj, is_deleted=False, status__in=["delivered", "closed"]
        ).count()


class ClientForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()


class ClientResetPasswordSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_password(self, value):
        validate_password(value)
        return value


class UpdateClientSerializer(serializers.Serializer):
    business_type = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    private_note = serializers.CharField(required=False, allow_blank=True)
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True,
    )


class RequestSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Request
        fields = [
            "id",
            "title",
            "description",
            "status",
            "is_urgent",
            "due_date",
            "created_at",
            "updated_at",
        ]


class ClientDetailSerializer(ClientListSerializer):
    requests = serializers.SerializerMethodField()
    open_request_count = serializers.SerializerMethodField()
    total_request_count = serializers.SerializerMethodField()
    delivered_count = serializers.SerializerMethodField()

    class Meta(ClientListSerializer.Meta):
        fields = ClientListSerializer.Meta.fields + [
            "requests",
            "open_request_count",
            "total_request_count",
            "delivered_count",
        ]

    def get_requests(self, obj):
        qs = Request.objects.filter(client=obj, is_deleted=False).order_by(
            "-created_at"
        )
        return RequestSummarySerializer(qs, many=True).data

    def get_open_request_count(self, obj):
        return (
            Request.objects.filter(client=obj, is_deleted=False)
            .exclude(status__in=["delivered", "closed"])
            .count()
        )

    def get_total_request_count(self, obj):
        return Request.objects.filter(client=obj, is_deleted=False).count()

    def get_delivered_count(self, obj):
        return Request.objects.filter(
            client=obj, is_deleted=False, status__in=["delivered", "closed"]
        ).count()
