from rest_framework import serializers

from .models import Category, Product, Rack, StockMovement


class CategorySerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "full_name", "parent", "description", "is_active"]

    def get_full_name(self, obj):
        return str(obj)


class RackSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(source="products.count", read_only=True)

    class Meta:
        model = Rack
        fields = ["id", "rack_code", "section", "description", "capacity", "is_active", "product_count"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    rack_code = serializers.CharField(source="rack.rack_code", read_only=True, default=None)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = ["id", "barcode", "sku", "name", "category", "category_name", "rack", "rack_code",
                  "unit", "cost_price", "selling_price", "gst_rate", "hsn_code",
                  "current_stock", "reorder_level", "is_low_stock", "is_active"]
        read_only_fields = ["current_stock", "cost_price"]


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = StockMovement
        fields = ["id", "product", "product_name", "movement_type", "qty_change",
                  "balance_after", "reference", "remarks", "created_at"]
