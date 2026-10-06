from decimal import Decimal

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from datetime import timedelta

from django.db.models.functions import Coalesce, TruncDate

from inventory.models import Product
from purchases.models import Purchase
from sales.models import Sale, SaleItem
from .models import Expense

ZERO = Decimal("0")
MONEY = DecimalField(max_digits=14, decimal_places=2)


def _sum(field):
    return Coalesce(Sum(field), ZERO, output_field=MONEY)


def daily_sales_summary(day):
    sales = Sale.objects.filter(sale_date__date=day, status=Sale.Status.COMPLETED)
    data = sales.aggregate(
        total_bills=Count("id"),
        net_sales=_sum("total_amount"),
        gst_collected=_sum("tax_amount"),
        discount=_sum("discount_amount"),
    )
    data["by_payment_mode"] = {
        row["payment_mode"]: row["total"]
        for row in sales.values("payment_mode").annotate(total=_sum("total_amount"))
    }
    return data


def _completed_items(day):
    return SaleItem.objects.filter(sale__sale_date__date=day, sale__status=Sale.Status.COMPLETED)


def _profit_expr():
    return ExpressionWrapper(
        F("line_total") - F("tax_amount") - F("quantity") * F("cost_price"), output_field=MONEY
    )


def daily_product_sales(day):
    return list(
        _completed_items(day)
        .values("product_id", "product__name", "product__category__name")
        .annotate(qty_sold=Sum("quantity"), revenue=_sum("line_total"), profit=Sum(_profit_expr()))
        .order_by("-revenue")
    )


def daily_category_sales(day):
    return list(
        _completed_items(day)
        .values(category=F("product__category__name"))
        .annotate(qty_sold=Sum("quantity"), revenue=_sum("line_total"), profit=Sum(_profit_expr()))
        .order_by("-revenue")
    )


def daily_finance(day):
    s = daily_sales_summary(day)
    cogs = _completed_items(day).aggregate(
        v=Coalesce(Sum(ExpressionWrapper(F("quantity") * F("cost_price"), output_field=MONEY)),
                   ZERO, output_field=MONEY))["v"]
    expenses = Expense.objects.filter(expense_date=day).aggregate(v=_sum("amount"))["v"]
    purchases = Purchase.objects.filter(purchase_date=day).aggregate(
        total=_sum("total_amount"), paid=_sum("paid_amount"))

    sales_ex_gst = s["net_sales"] - s["gst_collected"]
    gross_profit = sales_ex_gst - cogs
    return {
        "date": str(day),
        "total_sales": s["net_sales"],
        "gst_collected": s["gst_collected"],
        "sales_excluding_gst": sales_ex_gst,
        "cost_of_goods_sold": cogs,
        "gross_profit": gross_profit,
        "expenses": expenses,
        "net_profit": gross_profit - expenses,
        "purchases_made": purchases["total"],
        "supplier_paid": purchases["paid"],
        "cash_in_hand_from_sales": s["by_payment_mode"].get("CASH", ZERO),
    }


def low_stock():
    return list(
        Product.objects.filter(is_active=True, current_stock__lte=F("reorder_level"))
        .values("id", "name", "category__name", "rack__rack_code", "current_stock", "reorder_level")
    )


def sales_trend(start, end):
    """Daily sales + profit between two dates (inclusive), zero-filled."""
    rows = {
        r["day"]: r for r in
        SaleItem.objects.filter(sale__sale_date__date__gte=start, sale__sale_date__date__lte=end,
                                sale__status=Sale.Status.COMPLETED)
        .annotate(day=TruncDate("sale__sale_date"))
        .values("day")
        .annotate(sales=_sum("line_total"), profit=Sum(_profit_expr()))
    }
    out, d = [], start
    while d <= end:
        r = rows.get(d, {})
        out.append({"date": str(d), "sales": r.get("sales", ZERO), "profit": r.get("profit") or ZERO})
        d += timedelta(days=1)
    return out
