# Generated by Django 5.1.7 on 2025-03-07 16:39

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chatbot', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='conversation',
            name='session_id',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
