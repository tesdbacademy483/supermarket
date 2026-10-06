from django.db import models


class Category(models.Model):
    """Main & sub categories. e.g. Groceries > Rice & Dal"""
    name = models.CharField(max_length=100)
    parent = models.ForeignKey("self", null=True, blank=True,
                               on_delete=models.PROTECT, related_name="children")
    description = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "categories"
        constraints = [models.UniqueConstraint(fields=["name", "parent"], name="uq_category_name_parent")]

    def __str__(self):
        return f"{self.parent} > {self.name}" if self.parent else self.name


class Rack(models.Model):
    rack_code = models.CharField(max_length=20, unique=True)   # e.g. R-A1
    section = models.CharField(max_length=100, blank=True)    # e.g. Aisle 1 - Grains
    description = models.CharField(max_length=255, blank=True)
    capacity = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.rack_code


class Product(models.Model):
    class Unit(models.TextChoices):
        PCS = "PCS"; KG = "KG"; GRAM = "GRAM"; LITRE = "LITRE"
        ML = "ML"; PACK = "PACK"; BOX = "BOX"

    barcode = models.CharField(max_length=50, unique=True, null=True, blank=True)
    sku = models.CharField(max_length=50, unique=True, null=True, blank=True)
    name = models.CharField(max_length=150, db_index=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    rack = models.ForeignKey(Rack, null=True, blank=True, on_delete=models.SET_NULL, related_name="products")
    unit = models.CharField(max_length=10, choices=Unit.choices, default=Unit.PCS)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)   # latest purchase price
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)      # 0/5/12/18/28
    hsn_code = models.CharField(max_length=20, blank=True)
    # NEVER edit current_stock directly - always use inventory.services.change_stock()
    current_stock = models.DecimalField(max_digits=12, decimal_places=3, default=0, editable=False)
    reorder_level = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def is_low_stock(self):
        return self.current_stock <= self.reorder_level


class StockMovement(models.Model):
    """Ledger: every stock IN / OUT is recorded here."""
    class Type(models.TextChoices):
        PURCHASE = "PURCHASE"
        SALE = "SALE"
        SALE_CANCEL = "SALE_CANCEL"
        ADJUSTMENT = "ADJUSTMENT"
        DAMAGE = "DAMAGE"

    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="movements")
    movement_type = models.CharField(max_length=15, choices=Type.choices)
    qty_change = models.DecimalField(max_digits=12, decimal_places=3)      # +in / -out
    balance_after = models.DecimalField(max_digits=12, decimal_places=3)
    reference = models.CharField(max_length=50, blank=True)               # bill no / invoice no
    remarks = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey("accounts.User", null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["product", "created_at"])]
        ordering = ["-created_at"]
