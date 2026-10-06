import { useCallback, useEffect, useState } from "react";
import { api, dateTime, list, num } from "../api";
import Modal from "../components/Modal.jsx";
import Notice from "../components/Notice.jsx";
import ProductPicker from "../components/ProductPicker.jsx";

const TYPES = {
  PURCHASE: "Purchase", SALE: "Sale", SALE_CANCEL: "Bill cancelled", ADJUSTMENT: "Adjustment", DAMAGE: "Damage / expired",
};

function AdjustForm({ onClose, onSaved }) {
  const [product, setProduct] = useState(null);
  const [direction, setDirection] = useState("add");
  const [qty, setQty] = useState("");
  const [type, setType] = useState("ADJUSTMENT");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault();
    if (!product) { setError("Choose a product first."); return; }
    const amount = Math.abs(Number(qty));
    const sign = type === "DAMAGE" || direction === "remove" ? -1 : 1;
    try {
      await api(`/products/${product.id}/adjust_stock/`, {
        method: "POST", body: { qty_change: sign * amount, type, remarks },
      });
      onSaved(`${product.name}: stock ${sign > 0 ? "increased" : "reduced"} by ${num(amount)}.`);
    } catch (err) { setError(err.message); }
  }

  return (
    <Modal title="Adjust stock" onClose={onClose}>
      <form className="form" onSubmit={save}>
        {product ? (
          <div className="picked">
            <div><strong>{product.name}</strong><div className="muted small">Now in stock: {num(product.current_stock)} {product.unit.toLowerCase()}</div></div>
            <button type="button" className="link" onClick={() => setProduct(null)}>Change</button>
          </div>
        ) : <ProductPicker autoFocus onPick={setProduct} onNotFound={(c) => setError(`No product matches "${c}".`)} />}
        <label className="field"><span>Reason</span>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ADJUSTMENT">Opening stock or count correction</option>
            <option value="DAMAGE">Damaged or expired (removes stock)</option>
          </select>
        </label>
        {type === "ADJUSTMENT" && (
          <div className="row gap">
            <label className="check"><input type="radio" checked={direction === "add"} onChange={() => setDirection("add")} /> Add to stock</label>
            <label className="check"><input type="radio" checked={direction === "remove"} onChange={() => setDirection("remove")} /> Remove from stock</label>
          </div>
        )}
        <label className="field"><span>Quantity *</span>
          <input className="input" type="number" min="0.001" step="0.001" required value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <label className="field"><span>Note</span>
          <input className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. counted on 2 Oct" />
        </label>
        <Notice error={error} />
        <div className="row gap end">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary">Save adjustment</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Stock() {
  const [low, setLow] = useState([]);
  const [moves, setMoves] = useState([]);
  const [filterProduct, setFilterProduct] = useState(null);
  const [adjusting, setAdjusting] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const [l, m] = await Promise.all([
        api("/reports/low-stock/"),
        list("/stock-movements/", { product: filterProduct?.id, page_size: 200 }),
      ]);
      setLow(l); setMoves(m); setError("");
    } catch (e) { setError(e.message); }
  }, [filterProduct]);

  useEffect(() => { load(); }, [load]);

  return (
    <section>
      <header className="page-head">
        <div><h1>Stock</h1><p className="muted">What needs reordering, and every movement in and out of the shelves.</p></div>
        <button className="btn primary" onClick={() => setAdjusting(true)}>Adjust stock</button>
      </header>
      <Notice error={error} success={msg} onClose={() => { setError(""); setMsg(""); }} />

      <h2>Reorder now</h2>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Product</th><th>Category</th><th>Rack</th><th className="right">In stock</th><th className="right">Reorder at</th></tr></thead>
          <tbody>
            {low.length === 0 && <tr><td colSpan={5} className="empty">Everything is above its reorder level.</td></tr>}
            {low.map((p) => (
              <tr key={p.id}><td>{p.name}</td><td>{p.category__name}</td><td>{p.rack__rack_code || "–"}</td>
                <td className="right"><span className="badge warn">{num(p.current_stock)}</span></td><td className="right">{num(p.reorder_level)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row between section-gap">
        <h2>Stock history</h2>
        {filterProduct
          ? <span>Showing <strong>{filterProduct.name}</strong> <button className="link" onClick={() => setFilterProduct(null)}>Show all</button></span>
          : <div className="narrow"><ProductPicker onPick={setFilterProduct} placeholder="Filter by product" showStock={false} /></div>}
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>When</th><th>Product</th><th>Movement</th><th>Reference</th><th className="right">Change</th><th className="right">Balance</th></tr></thead>
          <tbody>
            {moves.length === 0 && <tr><td colSpan={6} className="empty">No stock movements yet.</td></tr>}
            {moves.map((m) => (
              <tr key={m.id}>
                <td className="nowrap">{dateTime(m.created_at)}</td><td>{m.product_name}</td>
                <td>{TYPES[m.movement_type]}{m.remarks && <div className="muted small">{m.remarks}</div>}</td>
                <td>{m.reference}</td>
                <td className={`right strong ${Number(m.qty_change) < 0 ? "text-danger" : "text-good"}`}>
                  {Number(m.qty_change) > 0 ? "+" : ""}{num(m.qty_change)}
                </td>
                <td className="right">{num(m.balance_after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adjusting && <AdjustForm onClose={() => setAdjusting(false)} onSaved={(t) => { setAdjusting(false); setMsg(t); load(); }} />}
    </section>
  );
}
