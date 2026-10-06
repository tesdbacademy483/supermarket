from datetime import date, timedelta

from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsOwnerOrManager
from . import reports
from .models import Expense
from .serializers import ExpenseSerializer


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by("-expense_date")
    serializer_class = ExpenseSerializer
    permission_classes = [IsOwnerOrManager]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


def _day(request):
    d = request.query_params.get("date")
    return date.fromisoformat(d) if d else date.today()


@api_view(["GET"])
@permission_classes([IsOwnerOrManager])
def daily_report(request):
    """GET /api/reports/daily/?date=2026-10-02  -> everything for the dashboard"""
    day = _day(request)
    return Response({
        "finance": reports.daily_finance(day),
        "sales_summary": reports.daily_sales_summary(day),
        "products": reports.daily_product_sales(day),
        "categories": reports.daily_category_sales(day),
    })


@api_view(["GET"])
@permission_classes([IsOwnerOrManager])
def low_stock_report(request):
    return Response(reports.low_stock())


@api_view(["GET"])
@permission_classes([IsOwnerOrManager])
def sales_trend(request):
    """GET /api/reports/trend/?from=2026-09-26&to=2026-10-02 -> one row per day"""
    end = date.fromisoformat(request.query_params["to"]) if request.query_params.get("to") else date.today()
    start = (date.fromisoformat(request.query_params["from"]) if request.query_params.get("from")
             else end - timedelta(days=6))
    return Response(reports.sales_trend(start, end))
