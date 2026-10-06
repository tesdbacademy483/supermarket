from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.views import UserViewSet, login, logout, me
from finance.views import ExpenseViewSet, daily_report, low_stock_report, sales_trend
from inventory.views import CategoryViewSet, ProductViewSet, RackViewSet, StockMovementViewSet
from purchases.views import PurchaseViewSet, SupplierViewSet
from sales.views import CustomerViewSet, SaleViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet)
router.register("racks", RackViewSet)
router.register("products", ProductViewSet, basename="product")
router.register("stock-movements", StockMovementViewSet, basename="stock-movement")
router.register("suppliers", SupplierViewSet)
router.register("purchases", PurchaseViewSet)
router.register("customers", CustomerViewSet)
router.register("sales", SaleViewSet, basename="sale")
router.register("expenses", ExpenseViewSet)
router.register("users", UserViewSet)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/reports/daily/", daily_report),
    path("api/reports/low-stock/", low_stock_report),
    path("api/reports/trend/", sales_trend),
    path("api/auth/login/", login),
    path("api/auth/logout/", logout),
    path("api/auth/me/", me),
    path("api-auth/", include("rest_framework.urls")),
]
