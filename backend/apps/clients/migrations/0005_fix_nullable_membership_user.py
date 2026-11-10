from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("clients", "0004_clienttagmap_tag_client_status_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE clients ALTER COLUMN membership_id DROP NOT NULL;
                ALTER TABLE clients ALTER COLUMN user_id DROP NOT NULL;
            """,
            reverse_sql="""
                ALTER TABLE clients ALTER COLUMN membership_id SET NOT NULL;
                ALTER TABLE clients ALTER COLUMN user_id SET NOT NULL;
            """,
        ),
    ]
