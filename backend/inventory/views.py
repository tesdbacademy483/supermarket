from django.db.models import F, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsOwnerOrManager, ReadOnlyOrManager

from .models import Category, Product, Rack, StockMovement
from .serializers import CategorySerializer, ProductSerializer, RackSerializer, StockMovementSerializer
from .services import change_stock


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.select_related("parent").order_by("parent__name", "name")
    serializer_class = CategorySerializer
    permission_classes = [ReadOnlyOrManager]


class RackViewSet(viewsets.ModelViewSet):
    queryset = Rack.objects.all().order_by("rack_code")
    serializer_class = RackSerializer
    permission_classes = [ReadOnlyOrManager]


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [ReadOnlyOrManager]

    def get_queryset(self):
        qs = Product.objects.select_related("category", "rack").order_by("name")
        p = self.request.query_params
        if p.get("barcode"):
            qs = qs.filter(barcode=p["barcode"])          # billing screen scanner lookup
        if p.get("search"):
            qs = qs.filter(Q(name__icontains=p["search"]) | Q(barcode__startswith=p["search"]))
        if p.get("active") == "1":
            qs = qs.filter(is_active=True)
        if p.get("low_stock") == "1":
            qs = qs.filter(current_stock__lte=F("reorder_level"))
        if p.get("category"):
            qs = qs.filter(category_id=p["category"])
        if p.get("rack"):
            qs = qs.filter(rack_id=p["rack"])
        return qs

    @action(detail=True, methods=["post"], permission_classes=[IsOwnerOrManager])
    def adjust_stock(self, request, pk=None):
        """Manual correction: {"qty_change": -2, "type": "DAMAGE", "remarks": "broken"}"""
        product = change_stock(
            pk, request.data["qty_change"], request.data.get("type", StockMovement.Type.ADJUSTMENT),
            user=request.user, remarks=request.data.get("remarks", ""),
        )
        return Response(ProductSerializer(product).data)


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StockMovementSerializer
    permission_classes = [IsOwnerOrManager]

    def get_queryset(self):
        qs = StockMovement.objects.select_related("product")
        if pid := self.request.query_params.get("product"):
            qs = qs.filter(product_id=pid)
        return qs
