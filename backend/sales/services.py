from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from inventory.models import Product, StockMovement
from inventory.services import change_stock
from .models import Sale, SaleItem

TWO = Decimal("0.01")


def next_bill_no():
    today = timezone.localdate().strftime("%Y%m%d")
    count = Sale.objects.filter(bill_no__startswith=f"B{today}").count() + 1
    return f"B{today}-{count:04d}"


@transaction.atomic
def create_sale(*, items, cashier, payment_mode="CASH", customer=None):
    """
    items = [{"product": <Product>, "quantity": 2, "discount": 0}]
    Selling price is taken from the product (GST-inclusive, like Indian MRP).
    Stock is REDUCED automatically; the whole bill fails if any item is short.
    """
    sale = Sale.objects.create(bill_no=next_bill_no(), cashier=cashier,
                               payment_mode=payment_mode, customer=customer)
    subtotal = tax = discount_total = Decimal("0")

    for it in items:
        product = Product.objects.get(pk=it["product"].pk)
        qty = Decimal(it["quantity"])
        discount = Decimal(it.get("discount", 0))
        gross = (qty * product.selling_price - discount).quantize(TWO)
        # GST is inside the price: tax = gross * rate / (100 + rate)
        line_tax = (gross * product.gst_rate / (100 + product.gst_rate)).quantize(TWO)

        change_stock(product.id, -qty, StockMovement.Type.SALE, user=cashier, reference=sale.bill_no)
        SaleItem.objects.create(
            sale=sale, product=product, quantity=qty, selling_price=product.selling_price,
            cost_price=product.cost_price, discount=discount, gst_rate=product.gst_rate,
            tax_amount=line_tax, line_total=gross,
        )
        subtotal += gross - line_tax
        tax += line_tax
        discount_total += discount

    sale.subtotal, sale.tax_amount, sale.discount_amount = subtotal, tax, discount_total
    sale.total_amount = subtotal + tax
    sale.save()
    return sale


@transaction.atomic
def cancel_sale(sale, user):
    sale = Sale.objects.select_for_update().get(pk=sale.pk)
    if sale.status == Sale.Status.CANCELLED:
        raise ValidationError("Bill is already cancelled.")
    for item in sale.items.all():
        change_stock(item.product_id, item.quantity, StockMovement.Type.SALE_CANCEL,
                     user=user, reference=sale.bill_no, remarks="Bill cancelled")
    sale.status = Sale.Status.CANCELLED
    sale.save(update_fields=["status"])
    return sale
