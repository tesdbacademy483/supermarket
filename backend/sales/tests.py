from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from finance import reports
from inventory.models import Category, Product, Rack
from purchases.models import Supplier


class StockFlowTest(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user("owner", password="x", role="OWNER")
        self.api = APIClient()
        self.api.force_authenticate(self.owner)
        grocery = Category.objects.create(name="Groceries")
        rice = Category.objects.create(name="Rice & Dal", parent=grocery)
        rack = Rack.objects.create(rack_code="R-A1", section="Aisle 1")
        self.rice = Product.objects.create(name="Ponni Rice 5kg", category=rice, rack=rack,
                                           selling_price=350, gst_rate=5, reorder_level=5)
        self.supplier = Supplier.objects.create(name="Chennai Wholesale")

    def test_purchase_sale_cancel_and_reports(self):
        r = self.api.post("/api/purchases/", {
            "supplier": self.supplier.id, "invoice_no": "INV-1", "purchase_date": str(date.today()),
            "paid_amount": 6000, "items": [{"product": self.rice.id, "quantity": 20, "cost_price": 300}],
        }, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.rice.refresh_from_db()
        self.assertEqual(self.rice.current_stock, 20)          # stock added
        self.assertEqual(self.rice.cost_price, 300)

        r = self.api.post("/api/sales/", {"payment_mode": "UPI",
                          "items": [{"product": self.rice.id, "quantity": 3}]}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.rice.refresh_from_db()
        self.assertEqual(self.rice.current_stock, 17)          # stock reduced
        self.assertEqual(Decimal(str(r.data["total_amount"])), Decimal("1050.00"))

        # selling more than available fails and changes nothing
        r = self.api.post("/api/sales/", {"items": [{"product": self.rice.id, "quantity": 100}]}, format="json")
        self.assertEqual(r.status_code, 400)
        self.rice.refresh_from_db()
        self.assertEqual(self.rice.current_stock, 17)

        fin = reports.daily_finance(date.today())
        self.assertEqual(fin["total_sales"], Decimal("1050.00"))
        self.assertEqual(fin["cost_of_goods_sold"], Decimal("900.00"))
        self.assertEqual(fin["gross_profit"], Decimal("100.00"))   # 1000 ex-GST - 900 cost

        r = self.api.get("/api/reports/daily/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["sales_summary"]["by_payment_mode"]["UPI"], Decimal("1050.00"))

        sale_id = self.api.get("/api/sales/").data["results"][0]["id"]
        self.api.post(f"/api/sales/{sale_id}/cancel/")
        self.rice.refresh_from_db()
        self.assertEqual(self.rice.current_stock, 20)          # stock returned
        self.assertEqual(self.rice.movements.count(), 3)


class PermissionTest(TestCase):
    def test_cashier_cannot_open_reports_but_can_login(self):
        User.objects.create_user("c1", password="secret1", role="CASHIER")
        api = APIClient()
        r = api.post("/api/auth/login/", {"username": "c1", "password": "secret1"}, format="json")
        self.assertEqual(r.status_code, 200)
        api.credentials(HTTP_AUTHORIZATION="Token " + r.data["token"])
        self.assertEqual(api.get("/api/products/").status_code, 200)
        self.assertEqual(api.get("/api/reports/daily/").status_code, 403)
        self.assertEqual(api.post("/api/categories/", {"name": "X"}).status_code, 403)
