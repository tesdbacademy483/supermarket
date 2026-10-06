# Supermarket Billing - Django + PostgreSQL backend

## Setup
```bash
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
# create the database in PostgreSQL:  CREATE DATABASE supermarket;
# set DB_NAME / DB_USER / DB_PASSWORD / DB_HOST if different from defaults
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
Admin panel: http://localhost:8000/admin/   API: http://localhost:8000/api/

## Apps
| App        | Tables                               |
|------------|--------------------------------------|
| accounts   | User (OWNER / MANAGER / CASHIER)     |
| inventory  | Category, Rack, Product, StockMovement |
| purchases  | Supplier, Purchase, PurchaseItem     |
| sales      | Customer, Sale, SaleItem             |
| finance    | Expense + reports.py                 |

## Stock rule
`Product.current_stock` is changed ONLY by `inventory/services.py -> change_stock()`.
- Purchase saved  -> stock +qty, cost price updated
- Bill saved      -> stock -qty (whole bill rejected if any item is short)
- Bill cancelled  -> stock returned
Every change is written to `StockMovement`.

## Main API endpoints
| Method | URL | Purpose |
|---|---|---|
| CRUD | /api/categories/ | categories & sub-categories |
| CRUD | /api/racks/ | racks |
| CRUD | /api/products/?barcode=&search=&category=&rack= | products |
| POST | /api/products/{id}/adjust_stock/ | damage / manual correction |
| GET  | /api/stock-movements/?product= | stock history |
| CRUD | /api/suppliers/ | suppliers |
| POST | /api/purchases/ | purchase entry (adds stock) |
| POST | /api/sales/ | create bill (reduces stock) |
| POST | /api/sales/{id}/cancel/ | cancel bill (returns stock) |
| CRUD | /api/expenses/ | rent, salary, etc. |
| GET  | /api/reports/daily/?date=YYYY-MM-DD | sales + product + category + finance |
| GET  | /api/reports/low-stock/ | reorder alerts |
| GET  | /api/reports/trend/?from=&to= | day-by-day sales and profit |
| POST | /api/auth/login/ | returns token + user role |
| POST | /api/auth/logout/ | deletes token |
| GET  | /api/auth/me/ | current user |
| CRUD | /api/users/ | owner only |

## Roles
- CASHIER: billing, own bills, view products
- MANAGER: everything except users
- OWNER (or Django superuser): everything

### Example: create bill
```json
POST /api/sales/
{ "payment_mode": "UPI", "items": [ { "product": 1, "quantity": 2, "discount": 0 } ] }
```
### Example: purchase entry
```json
POST /api/purchases/
{ "supplier": 1, "invoice_no": "INV-1001", "purchase_date": "2026-10-02", "paid_amount": 6000,
  "items": [ { "product": 1, "quantity": 20, "cost_price": 300, "gst_rate": 5 } ] }
```

## Tests
`python manage.py test`
