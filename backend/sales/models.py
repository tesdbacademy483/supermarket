from django.conf import settings
from django.db import models


class Customer(models.Model):
    name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=20, unique=True)
    email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name or self.phone


class Sale(models.Model):
    class PaymentMode(models.TextChoices):
        CASH = "CASH"; CARD = "CARD"; UPI = "UPI"; CREDIT = "CREDIT"; MIXED = "MIXED"

    class Status(models.TextChoices):
        COMPLETED = "COMPLETED"; CANCELLED = "CANCELLED"

    bill_no = models.CharField(max_length=30, unique=True)
    sale_date = models.DateTimeField(auto_now_add=True, db_index=True)
    customer = models.ForeignKey(Customer, null=True, blank=True, on_delete=models.SET_NULL)
    cashier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)       # before tax
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)   # amount paid
    payment_mode = models.CharField(max_length=10, choices=PaymentMode.choices, default=PaymentMode.CASH)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.COMPLETED)

    def __str__(self):
        return self.bill_no


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("inventory.Product", on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)   # MRP incl. GST
    # cost_price copied at billing time -> profit stays correct when purchase price changes later
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)      # incl. GST
