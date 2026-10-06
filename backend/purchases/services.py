from decimal import Decimal

from django.db import transaction

from inventory.models import StockMovement
from inventory.services import change_stock
from .models import Purchase, PurchaseItem

TWO = Decimal("0.01")


@transaction.atomic
def create_purchase(*, supplier, invoice_no, purchase_date, items, user, paid_amount=0):
    """
    items = [{"product": <Product>, "quantity": 10, "cost_price": 300, "gst_rate": 5, ...}]
    Saves the purchase and ADDS quantity to the existing product stock.
    """
    purchase = Purchase.objects.create(
        supplier=supplier, invoice_no=invoice_no, purchase_date=purchase_date,
        paid_amount=paid_amount, created_by=user,
    )
    subtotal = tax = Decimal("0")

    for it in items:
        qty, cost = Decimal(it["quantity"]), Decimal(it["cost_price"])
        gst = Decimal(it.get("gst_rate", 0))
        base = (qty * cost).quantize(TWO)
        line_tax = (base * gst / 100).quantize(TWO)

        PurchaseItem.objects.create(
            purchase=purchase, product=it["product"], quantity=qty, cost_price=cost,
            gst_rate=gst, line_total=base + line_tax,
            batch_no=it.get("batch_no", ""), expiry_date=it.get("expiry_date"),
        )
        change_stock(it["product"].id, qty, StockMovement.Type.PURCHASE, user=user,
                     reference=invoice_no, new_cost_price=cost)
        subtotal += base
        tax += line_tax

    purchase.subtotal, purchase.tax_amount = subtotal, tax
    purchase.total_amount = subtotal + tax
    paid = Decimal(paid_amount)
    purchase.payment_status = (Purchase.PaymentStatus.PAID if paid >= purchase.total_amount
                               else Purchase.PaymentStatus.PARTIAL if paid > 0
                               else Purchase.PaymentStatus.UNPAID)
    purchase.save()
    return purchase
