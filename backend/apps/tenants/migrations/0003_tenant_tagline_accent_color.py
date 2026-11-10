from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="tagline",
            field=models.CharField(max_length=255, null=True, blank=True),
        ),
        migrations.AddField(
            model_name="tenant",
            name="accent_color",
            field=models.CharField(max_length=7, null=True, blank=True),
        ),
    ]
