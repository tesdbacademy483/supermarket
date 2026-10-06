from rest_framework import serializers

from inventory.models import Product
from .models import Purchase, PurchaseItem, Supplier


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"


class PurchaseItemSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = PurchaseItem
        fields = ["product", "product_name", "quantity", "cost_price", "gst_rate",
                  "line_total", "batch_no", "expiry_date"]
        read_only_fields = ["line_total"]


class PurchaseSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = Purchase
        fields = ["id", "supplier", "supplier_name", "invoice_no", "purchase_date", "subtotal",
                  "tax_amount", "total_amount", "paid_amount", "payment_status", "items", "created_at"]
        read_only_fields = ["subtotal", "tax_amount", "total_amount", "payment_status"]
        validators = []   # replaced by the friendlier check below

    def validate(self, data):
        if Purchase.objects.filter(supplier=data["supplier"], invoice_no=data["invoice_no"]).exists():
            raise serializers.ValidationError(
                f"Invoice {data['invoice_no']} from this supplier is already entered.")
        if not data.get("items"):
            raise serializers.ValidationError("Add at least one product.")
        return data
