import CrudPage from "../components/CrudPage.jsx";
import { money, today } from "../api";

const CATS = ["RENT", "SALARY", "ELECTRICITY", "TRANSPORT", "MAINTENANCE", "OTHER"]
  .map((c) => ({ value: c, label: c[0] + c.slice(1).toLowerCase() }));

export default function Expenses() {
  return (
    <CrudPage
      title="Expenses"
      intro="Shop running costs. These are subtracted from gross profit in the daily finance report."
      endpoint="/expenses/"
      fields={[
        { name: "expense_date", label: "Date", type: "date", required: true, default: today() },
        { name: "category", label: "Type", type: "select", options: CATS, required: true },
        { name: "description", label: "Description" },
        { name: "amount", label: "Amount (₹)", type: "number", step: "0.01", min: 0, required: true },
      ]}
      columns={[
        { key: "expense_date", label: "Date" },
        { key: "category", label: "Type", render: (r, l) => l.category[r.category] },
        { key: "description", label: "Description" },
        { key: "amount", label: "Amount", align: "right", render: (r) => money(r.amount) },
      ]}
      emptyText="No expenses recorded."
    />
  );
}
