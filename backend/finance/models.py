from django.conf import settings
from django.db import models


class Expense(models.Model):
    class Category(models.TextChoices):
        RENT = "RENT"; SALARY = "SALARY"; ELECTRICITY = "ELECTRICITY"
        TRANSPORT = "TRANSPORT"; MAINTENANCE = "MAINTENANCE"; OTHER = "OTHER"

    expense_date = models.DateField(db_index=True)
    category = models.CharField(max_length=20, choices=Category.choices)
    description = models.CharField(max_length=255, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
