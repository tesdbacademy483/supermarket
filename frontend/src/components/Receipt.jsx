import { dateTime, money, num } from "../api";

const env = import.meta.env;

/** Thermal-printer style bill (80mm). Printed with window.print(). */
export default function Receipt({ sale }) {
  if (!sale) return null;
  const gst = {};
  sale.items.forEach((i) => {
    const r = Number(i.gst_rate);
    gst[r] = (gst[r] || 0) + Number(i.tax_amount);
  });
  const qty = sale.items.reduce((s, i) => s + Number(i.quantity), 0);

  return (
    <div className="receipt">
      <div className="r-center r-shop">{env.VITE_SHOP_NAME || "Supermarket"}</div>
      {env.VITE_SHOP_ADDRESS && <div className="r-center">{env.VITE_SHOP_ADDRESS}</div>}
      {env.VITE_SHOP_PHONE && <div className="r-center">Ph: {env.VITE_SHOP_PHONE}</div>}
      {env.VITE_SHOP_GSTIN && <div className="r-center">GSTIN: {env.VITE_SHOP_GSTIN}</div>}
      <div className="r-rule" />
      <div className="r-row"><span>Bill: {sale.bill_no}</span><span>{sale.payment_mode}</span></div>
      <div className="r-row"><span>{dateTime(sale.sale_date)}</span><span>{sale.cashier_name}</span></div>
      {sale.status === "CANCELLED" && <div className="r-center r-cancel">CANCELLED</div>}
      <div className="r-rule" />
      <div className="r-row r-head"><span className="r-name">Item</span><span>Qty</span><span>Rate</span><span>Amt</span></div>
      {sale.items.map((i, idx) => (
        <div key={idx} className="r-item">
          <div className="r-name-full">{i.product_name}</div>
          <div className="r-row">
            <span className="r-name" />
            <span>{num(i.quantity)}</span>
            <span>{Number(i.selling_price).toFixed(2)}</span>
            <span>{Number(i.line_total).toFixed(2)}</span>
          </div>
        </div>
      ))}
      <div className="r-rule" />
      <div className="r-row"><span>Items {sale.items.length} / Qty {num(qty)}</span></div>
      <div className="r-row"><span>Taxable value</span><span>{Number(sale.subtotal).toFixed(2)}</span></div>
      {Object.entries(gst).filter(([r]) => Number(r) > 0).map(([r, amt]) => (
        <div key={r}>
          <div className="r-row"><span>CGST {Number(r) / 2}%</span><span>{(amt / 2).toFixed(2)}</span></div>
          <div className="r-row"><span>SGST {Number(r) / 2}%</span><span>{(amt / 2).toFixed(2)}</span></div>
        </div>
      ))}
      {Number(sale.discount_amount) > 0 && (
        <div className="r-row"><span>You saved</span><span>{Number(sale.discount_amount).toFixed(2)}</span></div>
      )}
      <div className="r-rule" />
      <div className="r-row r-total"><span>TOTAL</span><span>{money(sale.total_amount)}</span></div>
      <div className="r-rule" />
      <div className="r-center">Prices include GST. Thank you, visit again!</div>
    </div>
  );
}
