from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import Product, StockMovement


@transaction.atomic
def change_stock(product_id, qty_change, movement_type, user=None,
                 reference="", remarks="", new_cost_price=None):
    """
    The ONLY place where stock is changed.
    +qty_change = stock in (purchase), -qty_change = stock out (sale).
    select_for_update() locks the product row, so two cashiers billing the
    same item at the same moment can't both sell the last piece.
    """
    product = Product.objects.select_for_update().get(pk=product_id)
    qty_change = Decimal(qty_change)
    new_balance = product.current_stock + qty_change

    if new_balance < 0:
        raise ValidationError(
            f"Insufficient stock for '{product.name}'. Available: {product.current_stock}"
        )

    product.current_stock = new_balance
    fields = ["current_stock", "updated_at"]
    if new_cost_price is not None:
        product.cost_price = new_cost_price
        fields.append("cost_price")
    product.save(update_fields=fields)

    StockMovement.objects.create(
        product=product, movement_type=movement_type, qty_change=qty_change,
        balance_after=new_balance, reference=reference, remarks=remarks, created_by=user,
    )
    return product
