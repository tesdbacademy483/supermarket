from rest_framework import mixins, viewsets
from rest_framework.response import Response

from accounts.permissions import IsOwnerOrManager
from .models import Purchase, Supplier
from .serializers import PurchaseSerializer, SupplierSerializer
from .services import create_purchase


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by("name")
    serializer_class = SupplierSerializer
    permission_classes = [IsOwnerOrManager]


class PurchaseViewSet(mixins.CreateModelMixin, viewsets.ReadOnlyModelViewSet):
    """Purchases are not editable after saving (stock has already moved)."""
    queryset = Purchase.objects.select_related("supplier").prefetch_related("items__product").order_by("-id")
    serializer_class = PurchaseSerializer
    permission_classes = [IsOwnerOrManager]

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        purchase = create_purchase(
            supplier=d["supplier"], invoice_no=d["invoice_no"], purchase_date=d["purchase_date"],
            items=d["items"], user=request.user, paid_amount=d.get("paid_amount", 0),
        )
        return Response(PurchaseSerializer(purchase).data, status=201)
