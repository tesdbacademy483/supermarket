from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsOwnerOrManager, is_manager
from .models import Customer, Sale
from .serializers import CustomerSerializer, SaleSerializer
from .services import cancel_sale, create_sale


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("-id")
    serializer_class = CustomerSerializer


class SaleViewSet(mixins.CreateModelMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = SaleSerializer

    def get_queryset(self):
        qs = Sale.objects.select_related("cashier").prefetch_related("items__product").order_by("-id")
        p = self.request.query_params
        if not is_manager(self.request.user):
            qs = qs.filter(cashier=self.request.user)      # cashier sees own bills only
        if day := p.get("date"):
            qs = qs.filter(sale_date__date=day)
        if bill := (p.get("bill_no") or p.get("search")):
            qs = qs.filter(bill_no__icontains=bill)
        if status := p.get("status"):
            qs = qs.filter(status=status)
        return qs

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        sale = create_sale(items=d["items"], cashier=request.user,
                           payment_mode=d.get("payment_mode", "CASH"), customer=d.get("customer"))
        return Response(SaleSerializer(sale).data, status=201)

    @action(detail=True, methods=["post"], permission_classes=[IsOwnerOrManager])
    def cancel(self, request, pk=None):
        sale = cancel_sale(self.get_object(), request.user)
        return Response(SaleSerializer(sale).data)
