import CrudPage from "../components/CrudPage.jsx";
import { money, num } from "../api";

const UNITS = ["PCS", "KG", "GRAM", "LITRE", "ML", "PACK", "BOX"].map((u) => ({ value: u, label: u.toLowerCase() }));
const GST = [0, 5, 12, 18, 28].map((g) => ({ value: String(g), label: `${g}%` }));

export default function Products() {
  return (
    <CrudPage
      title="Products"
      intro="Stock can't be typed in here. It goes up with purchases and down with bills. Use Stock › Adjust for opening stock."
      endpoint="/products/"
      searchPlaceholder="Search name or barcode"
      filters={[
        { name: "category", label: "Category", optionsFrom: { endpoint: "/categories/", label: (c) => c.full_name } },
        { name: "rack", label: "Rack", optionsFrom: { endpoint: "/racks/", label: (r) => r.rack_code } },
        { name: "low_stock", label: "Low stock only", type: "checkbox" },
      ]}
      fields={[
        { name: "name", label: "Product name", required: true },
        { name: "barcode", label: "Barcode", help: "Scan it into this box with the barcode scanner." },
        { name: "sku", label: "SKU / item code" },
        { name: "category", label: "Category", type: "select", required: true,
          optionsFrom: { endpoint: "/categories/", label: (c) => c.full_name } },
        { name: "rack", label: "Rack", type: "select", optionsFrom: { endpoint: "/racks/", label: (r) => `${r.rack_code} ${r.section}` } },
        { name: "unit", label: "Unit", type: "select", options: UNITS, required: true, default: "PCS" },
        { name: "selling_price", label: "Selling price / MRP incl. GST (₹)", type: "number", step: "0.01", min: 0, required: true },
        { name: "gst_rate", label: "GST", type: "select", options: GST, required: true, default: "0" },
        { name: "hsn_code", label: "HSN code" },
        { name: "reorder_level", label: "Reorder level", type: "number", step: "0.001", min: 0, default: "0",
          help: "Shows in low stock when stock falls to this number." },
        { name: "is_active", label: "Available for billing", type: "checkbox" },
      ]}
      columns={[
        { key: "name", label: "Product", render: (r) => <><div>{r.name}</div><div className="muted small">{r.barcode}</div></> },
        { key: "category_name", label: "Category" },
        { key: "rack_code", label: "Rack", render: (r) => r.rack_code || <span className="muted">–</span> },
        { key: "selling_price", label: "Price", align: "right", render: (r) => money(r.selling_price) },
        { key: "gst_rate", label: "GST", align: "right", render: (r) => `${Number(r.gst_rate)}%` },
        { key: "cost_price", label: "Cost", align: "right", render: (r) => money(r.cost_price) },
        { key: "current_stock", label: "Stock", align: "right", render: (r) => (
          <span className={r.is_low_stock ? "badge warn" : ""}>{num(r.current_stock)} {r.unit.toLowerCase()}</span>
        ) },
      ]}
      emptyText="No products found."
    />
  );
}
