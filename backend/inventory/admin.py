from django.contrib import admin

from .models import Category, Product, Rack, StockMovement

admin.site.register(Category)
admin.site.register(Rack)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "barcode", "category", "rack", "selling_price", "current_stock", "reorder_level"]
    list_filter = ["category", "rack"]
    search_fields = ["name", "barcode"]
    readonly_fields = ["current_stock", "cost_price"]


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ["product", "movement_type", "qty_change", "balance_after", "reference", "created_at"]
    list_filter = ["movement_type"]
