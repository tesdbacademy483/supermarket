# Supermarket billing system

React (Vite) frontend + Django REST backend + PostgreSQL.

```
supermarket_system/
  backend/    Django project (API, stock logic, reports)
  frontend/   React app (billing, dashboard, stock, purchases...)
```

## 1. Database
Install PostgreSQL, then:
```sql
CREATE DATABASE supermarket;
```

## 2. Backend (terminal 1)
```bash
cd backend
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
# if your postgres user/password are not postgres/postgres:
#   set DB_USER, DB_PASSWORD, DB_HOST, DB_NAME environment variables
python manage.py migrate
python manage.py createsuperuser     # this is the owner login
python manage.py runserver           # http://localhost:8000
```

## 3. Frontend (terminal 2)
```bash
cd frontend
npm install
cp .env.example .env                # put your shop name, address, GSTIN
npm run dev                         # http://localhost:5173
```
Vite forwards every `/api/...` call to Django on port 8000, so both run together with no CORS setup.

## 4. First-day setup (in the app, signed in as owner)
1. Users: add cashier accounts.
2. Categories: add main categories, then sub-categories.
3. Racks: add a rack for each shelf.
4. Products: add products with barcode, category, rack, MRP and GST.
5. Suppliers: add your wholesalers.
6. Opening stock: either enter a purchase, or use Stock > Adjust stock > "Opening stock".
7. Billing: scan and sell.

## Daily flow
| Who | Where | What happens |
|---|---|---|
| Cashier | Billing | Scan items, pick Cash/UPI/Card, F8 to save. Stock goes down, bill prints. |
| Cashier/Manager | Bills | Reprint a bill. Managers can cancel it; stock goes back. |
| Manager | Purchases | Enter the supplier invoice. Stock goes up, cost price updates. |
| Manager | Stock | See what to reorder and every movement in/out. Record damage. |
| Owner | Dashboard | Sales, GST, profit, expenses, payment split, 7-day trend, top products. |
| Manager | Expenses | Rent, salary, electricity, so net profit is correct. |

## Bill printer
The bill is laid out for an 80mm thermal printer. In the browser print dialog choose the
thermal printer, paper 80mm, margins none. In Chrome you can skip the dialog for a billing
counter by starting it with `--kiosk-printing`.

## Barcode scanner
Any USB scanner in keyboard mode works: it types the code and presses Enter.
Keep the cursor in the big scan box (press F2 to jump back to it).

## Production (one server)
```bash
cd frontend && npm run build     # creates frontend/dist
```
Serve `frontend/dist` with nginx, and proxy `/api/` and `/admin/` to Django running under gunicorn.
Set `DEBUG = False`, a real `SECRET_KEY` and `ALLOWED_HOSTS` in backend/config/settings.py.
