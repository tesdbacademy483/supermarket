import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, money, num } from "../api";
import Modal from "../components/Modal.jsx";
import Notice from "../components/Notice.jsx";
import ProductPicker from "../components/ProductPicker.jsx";
import Receipt from "../components/Receipt.jsx";

const MODES = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
];
const isLoose = (unit) => ["KG", "GRAM", "LITRE", "ML"].includes(unit);

// Same maths as the Django service: prices include GST.
function lineMath(line) {
  const gross = Math.max(line.qty * Number(line.product.selling_price) - (Number(line.discount) || 0), 0);
  const rate = Number(line.product.gst_rate);
  const tax = (gross * rate) / (100 + rate);
  return { gross, tax };
}

export default function Billing() {
  const [cart, setCart] = useState([]);
  const [mode, setMode] = useState("CASH");
  const [received, setReceived] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const pickerRef = useRef(null);

  const addProduct = useCallback((p) => {
    setError("");
    setCart((c) => {
      const i = c.findIndex((l) => l.product.id === p.id);
      if (i >= 0) {
        const copy = [...c];
        copy[i] = { ...copy[i], qty: copy[i].qty + 1 };
        // move the scanned line to the top so the cashier sees it
        return [copy[i], ...copy.filter((_, j) => j !== i)];
      }
      return [{ product: p, qty: 1, discount: "" }, ...c];
    });
  }, []);

  const update = (id, patch) => setCart((c) => c.map((l) => (l.product.id === id ? { ...l, ...patch } : l)));
  const remove = (id) => setCart((c) => c.filter((l) => l.product.id !== id));

  const totals = useMemo(() => {
    let gross = 0, tax = 0, discount = 0, qty = 0;
    cart.forEach((l) => {
      const m = lineMath(l);
      gross += m.gross; tax += m.tax; discount += Number(l.discount) || 0; qty += l.qty;
    });
    return { gross, tax, taxable: gross - tax, discount, qty };
  }, [cart]);

  const shortItems = cart.filter((l) => l.qty > Number(l.product.current_stock));
  const change = mode === "CASH" && received ? Number(received) - totals.gross : null;

  const complete = useCallback(async () => {
    if (!cart.length || busy) return;
    if (cart.some((l) => !(l.qty > 0))) { setError("Every item needs a quantity above zero."); return; }
    setBusy(true); setError("");
    try {
      const sale = await api("/sales/", {
        method: "POST",
        body: {
          payment_mode: mode,
          items: cart.map((l) => ({ product: l.product.id, quantity: l.qty, discount: Number(l.discount) || 0 })),
        },
      });
      setLastSale(sale);
      setCart([]); setReceived(""); setMode("CASH");
      setTimeout(() => window.print(), 300);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [cart, mode, busy]);

  // Keyboard shortcuts: F2 = scan box, F8 = complete bill
  useEffect(() => {
    const onKey = (e) => {
      if (lastSale) return;
      if (e.key === "F2") { e.preventDefault(); pickerRef.current?.focus(); }
      if (e.key === "F8") { e.preventDefault(); complete(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [complete, lastSale]);

  function newBill() {
    setLastSale(null);
    setTimeout(() => pickerRef.current?.focus(), 50);
  }

  return (
    <section className="billing">
      <div className="bill-main">
        <header className="page-head tight">
          <h1>New bill</h1>
          <span className="muted small">Press F2 to scan, F8 to complete</span>
        </header>

        <ProductPicker
          ref={pickerRef}
          autoFocus
          onPick={addProduct}
          onNotFound={(code) => setError(`No active product matches "${code}". Check the barcode or add the product first.`)}
        />
        <Notice error={error} onClose={() => setError("")} />

        <div className="table-wrap cart">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="right">Rate</th>
                <th className="center">Qty</th>
                <th className="right">Disc ₹</th>
                <th className="right">Amount</th>
                <th aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 && (
                <tr><td colSpan={6} className="empty">Scan a barcode or search a product to start the bill.</td></tr>
              )}
              {cart.map((l) => {
                const short = l.qty > Number(l.product.current_stock);
                const step = isLoose(l.product.unit) ? 0.05 : 1;
                return (
                  <tr key={l.product.id} className={short ? "row-warn" : ""}>
                    <td>
                      <div>{l.product.name}</div>
                      <div className={`small ${short ? "text-danger" : "muted"}`}>
                        {short ? `Only ${num(l.product.current_stock)} in stock` : `GST ${Number(l.product.gst_rate)}%, rack ${l.product.rack_code || "not set"}`}
                      </div>
                    </td>
                    <td className="right">{money(l.product.selling_price)}</td>
                    <td className="center nowrap">
                      <div className="qty">
                        <button className="btn ghost small" aria-label="Less"
                                onClick={() => update(l.product.id, { qty: Math.max(+(l.qty - step).toFixed(3), step) })}>−</button>
                        <input className="input qty-input" type="number" min={step} step={isLoose(l.product.unit) ? "0.001" : "1"}
                               value={l.qty} aria-label="Quantity"
                               onChange={(e) => update(l.product.id, { qty: Number(e.target.value) })} />
                        <button className="btn ghost small" aria-label="More"
                                onClick={() => update(l.product.id, { qty: +(l.qty + step).toFixed(3) })}>+</button>
                      </div>
                      <div className="muted small">{l.product.unit.toLowerCase()}</div>
                    </td>
                    <td className="right">
                      <input className="input disc-input" type="number" min="0" step="0.01" value={l.discount}
                             aria-label="Discount" placeholder="0"
                             onChange={(e) => update(l.product.id, { discount: e.target.value })} />
                    </td>
                    <td className="right strong">{money(lineMath(l).gross)}</td>
                    <td className="right"><button className="link danger" onClick={() => remove(l.product.id)}>Remove</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="tape">
        <div className="tape-row"><span>Items</span><span>{cart.length} lines, {num(totals.qty)} qty</span></div>
        <div className="tape-row"><span>Taxable value</span><span>{money(totals.taxable)}</span></div>
        <div className="tape-row"><span>GST</span><span>{money(totals.tax)}</span></div>
        {totals.discount > 0 && <div className="tape-row"><span>Discount</span><span>− {money(totals.discount)}</span></div>}
        <div className="tape-total">
          <span>Total</span>
          <strong>{money(totals.gross)}</strong>
        </div>

        <div className="modes" role="radiogroup" aria-label="Payment mode">
          {MODES.map((m) => (
            <button key={m.value} role="radio" aria-checked={mode === m.value}
                    className={`mode ${mode === m.value ? "on" : ""}`} onClick={() => setMode(m.value)}>
              {m.label}
            </button>
          ))}
        </div>

        {mode === "CASH" && (
          <label className="field on-dark">
            <span>Cash received</span>
            <input className="input" type="number" min="0" step="1" value={received}
                   onChange={(e) => setReceived(e.target.value)} placeholder="0" />
            {change !== null && (
              <span className={change < 0 ? "change short" : "change"}>
                {change < 0 ? `Short by ${money(-change)}` : `Return ${money(change)}`}
              </span>
            )}
          </label>
        )}

        {shortItems.length > 0 && (
          <p className="tape-warn">Reduce quantity for items marked in red. The bill can't be saved with more than what's in stock.</p>
        )}

        <button className="btn pay" disabled={!cart.length || busy || shortItems.length > 0} onClick={complete}>
          {busy ? "Saving bill…" : "Complete bill and print"}
        </button>
        {cart.length > 0 && (
          <button className="btn ghost on-dark" onClick={() => confirm("Clear all items from this bill?") && setCart([])}>
            Clear bill
          </button>
        )}
      </aside>

      {lastSale && (
        <Modal title={`Bill ${lastSale.bill_no} saved`} onClose={newBill}>
          <div className="print-area"><Receipt sale={lastSale} /></div>
          <div className="row gap end">
            <button className="btn ghost" onClick={() => window.print()}>Print again</button>
            <button className="btn primary" autoFocus onClick={newBill}>Start new bill</button>
          </div>
        </Modal>
      )}
    </section>
  );
}
