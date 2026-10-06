import { useEffect, useMemo, useState } from "react";
import { api, list, money, num, today } from "../api";
import CrudPage from "../components/CrudPage.jsx";
import Modal from "../components/Modal.jsx";
import Notice from "../components/Notice.jsx";
import ProductPicker from "../components/ProductPicker.jsx";

const STATUS = { PAID: "Paid", PARTIAL: "Part paid", UNPAID: "Unpaid" };

function lineTotal(l) {
  const base = Number(l.quantity || 0) * Number(l.cost_price || 0);
  return base + (base * Number(l.gst_rate || 0)) / 100;
}

function NewPurchase({ onClose, onSaved }) {
  const [suppliers, setSuppliers] = useState([]);
  const [head, setHead] = useState({ supplier: "", invoice_no: "", purchase_date: today(), paid_amount: "" });
  const [lines, setLines] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { list("/suppliers/").then(setSuppliers).catch((e) => setError(e.message)); }, []);

  const total = useMemo(() => lines.reduce((s, l) => s + lineTotal(l), 0), [lines]);

  function add(p) {
    if (lines.some((l) => l.product.id === p.id)) { setError(`${p.name} is already in this purchase.`); return; }
    setError("");
    setLines((ls) => [...ls, {
      product: p, quantity: "", cost_price: Number(p.cost_price) || "", gst_rate: Number(p.gst_rate),
      batch_no: "", expiry_date: "",
    }]);
  }
  const update = (id, patch) => setLines((ls) => ls.map((l) => (l.product.id === id ? { ...l, ...patch } : l)));

  async function save(e) {
    e.preventDefault();
    if (!lines.length) { setError("Add at least one product."); return; }
    setBusy(true); setError("");
    try {
      await api("/purchases/", {
        method: "POST",
        body: {
          ...head,
          supplier: Number(head.supplier),
          paid_amount: Number(head.paid_amount) || 0,
          items: lines.map((l) => ({
            product: l.product.id, quantity: Number(l.quantity), cost_price: Number(l.cost_price),
            gst_rate: Number(l.gst_rate), batch_no: l.batch_no, expiry_date: l.expiry_date || null,
          })),
        },
      });
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="New purchase" onClose={onClose} wide>
      <form onSubmit={save} className="form">
        <div className="grid-4">
          <label className="field"><span>Supplier *</span>
            <select className="input" required value={head.supplier} onChange={(e) => setHead({ ...head, supplier: e.target.value })}>
              <option value="">Choose…</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Supplier invoice no. *</span>
            <input className="input" required value={head.invoice_no} onChange={(e) => setHead({ ...head, invoice_no: e.target.value })} />
          </label>
          <label className="field"><span>Invoice date *</span>
            <input className="input" type="date" required value={head.purchase_date} onChange={(e) => setHead({ ...head, purchase_date: e.target.value })} />
          </label>
          <label className="field"><span>Amount paid now (₹)</span>
            <div className="row gap">
              <input className="input" type="number" min="0" step="0.01" value={head.paid_amount}
                     onChange={(e) => setHead({ ...head, paid_amount: e.target.value })} />
              <button type="button" className="btn ghost small" onClick={() => setHead({ ...head, paid_amount: total.toFixed(2) })}>Full</button>
            </div>
          </label>
        </div>

        <ProductPicker onPick={add} placeholder="Scan or search a product to add it" showStock
                       onNotFound={(c) => setError(`No product matches "${c}". Add it in Products first.`)} />

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Product</th><th className="right">Qty *</th><th className="right">Cost price ₹ *</th>
                <th className="right">GST %</th><th>Batch</th><th>Expiry</th><th className="right">Line total</th><th /></tr>
            </thead>
            <tbody>
              {lines.length === 0 && <tr><td colSpan={8} className="empty">Add the products on the supplier's invoice.</td></tr>}
              {lines.map((l) => (
                <tr key={l.product.id}>
                  <td><div>{l.product.name}</div><div className="muted small">In stock: {num(l.product.current_stock)}</div></td>
                  <td className="right"><input className="input num-input" type="number" min="0.001" step="0.001" required
                         value={l.quantity} onChange={(e) => update(l.product.id, { quantity: e.target.value })} /></td>
                  <td className="right"><input className="input num-input" type="number" min="0" step="0.01" required
                         value={l.cost_price} onChange={(e) => update(l.product.id, { cost_price: e.target.value })} /></td>
                  <td className="right"><select className="input" value={l.gst_rate} onChange={(e) => update(l.product.id, { gst_rate: e.target.value })}>
                    {[0, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}</option>)}</select></td>
                  <td><input className="input" value={l.batch_no} onChange={(e) => update(l.product.id, { batch_no: e.target.value })} /></td>
                  <td><input className="input" type="date" value={l.expiry_date} onChange={(e) => update(l.product.id, { expiry_date: e.target.value })} /></td>
                  <td className="right strong">{money(lineTotal(l))}</td>
                  <td><button type="button" className="link danger" onClick={() => setLines((ls) => ls.filter((x) => x !== l))}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Notice error={error} />
        <div className="row gap end">
          <span className="grand">Invoice total {money(total)}</span>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save purchase and add stock"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Purchases() {
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saved, setSaved] = useState("");

  return (
    <>
      <Notice success={saved} onClose={() => setSaved("")} />
      <CrudPage
        title="Purchases"
        intro="Enter each supplier invoice. Saving it adds the quantities to stock and updates the cost price."
        endpoint="/purchases/"
        canEdit={false}
        refreshKey={refreshKey}
        toolbar={<button className="btn primary" onClick={() => setCreating(true)}>New purchase</button>}
        columns={[
          { key: "purchase_date", label: "Date" },
          { key: "invoice_no", label: "Invoice" },
          { key: "supplier_name", label: "Supplier" },
          { key: "items", label: "Items", align: "right", render: (r) => r.items.length },
          { key: "total_amount", label: "Total", align: "right", render: (r) => money(r.total_amount) },
          { key: "paid_amount", label: "Paid", align: "right", render: (r) => money(r.paid_amount) },
          { key: "payment_status", label: "Status", render: (r) => (
            <span className={r.payment_status === "PAID" ? "" : "badge warn"}>{STATUS[r.payment_status]}</span>
          ) },
        ]}
        rowActions={(r) => <button className="link" onClick={() => setViewing(r)}>Open</button>}
        emptyText="No purchases yet. Enter your first supplier invoice."
      />
      {creating && (
        <NewPurchase onClose={() => setCreating(false)}
                     onSaved={() => { setCreating(false); setRefreshKey((k) => k + 1); setSaved("Purchase saved. Stock has been added."); }} />
      )}
      {viewing && (
        <Modal title={`Invoice ${viewing.invoice_no}`} onClose={() => setViewing(null)} wide>
          <p className="muted">{viewing.supplier_name}, {viewing.purchase_date}</p>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Product</th><th className="right">Qty</th><th className="right">Cost</th><th className="right">GST</th><th>Batch</th><th>Expiry</th><th className="right">Total</th></tr></thead>
              <tbody>
                {viewing.items.map((i, k) => (
                  <tr key={k}><td>{i.product_name}</td><td className="right">{num(i.quantity)}</td><td className="right">{money(i.cost_price)}</td>
                    <td className="right">{Number(i.gst_rate)}%</td><td>{i.batch_no}</td><td>{i.expiry_date}</td><td className="right">{money(i.line_total)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row gap end"><span className="grand">Total {money(viewing.total_amount)}, paid {money(viewing.paid_amount)}</span></div>
        </Modal>
      )}
    </>
  );
}
