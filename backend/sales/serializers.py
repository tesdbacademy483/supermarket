from rest_framework import serializers

from inventory.models import Product
from .models import Customer, Sale, SaleItem


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"


class SaleItemSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.filter(is_active=True))
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = SaleItem
        fields = ["product", "product_name", "quantity", "discount", "selling_price",
                  "gst_rate", "tax_amount", "line_total"]
        read_only_fields = ["selling_price", "gst_rate", "tax_amount", "line_total"]


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    cashier_name = serializers.CharField(source="cashier.username", read_only=True)

    class Meta:
        model = Sale
        fields = ["id", "bill_no", "sale_date", "customer", "cashier_name", "subtotal",
                  "discount_amount", "tax_amount", "total_amount", "payment_mode", "status", "items"]
        read_only_fields = ["bill_no", "subtotal", "discount_amount", "tax_amount",
                            "total_amount", "status"]

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("Bill must have at least one item.")
        return items
