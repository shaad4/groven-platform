from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('notifications', '0003_alter_notification_event_type'), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [migrations.CreateModel(name='PushSubscription', fields=[
        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
        ('endpoint', models.URLField(max_length=2048, unique=True)),
        ('keys', models.JSONField()),
        ('updated_at', models.DateTimeField(auto_now=True)),
        ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='push_subscriptions', to='tenants.tenant')),
        ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='push_subscriptions', to=settings.AUTH_USER_MODEL)),
    ])]
