import { useEffect, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, money, num, today } from "../api";
import Notice from "../components/Notice.jsx";

const MODE_LABEL = { CASH: "Cash", UPI: "UPI", CARD: "Card", CREDIT: "Credit", MIXED: "Mixed" };

function Figure({ label, value, note, tone }) {
  return (
    <div className={`figure ${tone || ""}`}>
      <div className="figure-label">{label}</div>
      <div className="figure-value">{value}</div>
      {note && <div className="figure-note">{note}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [day, setDay] = useState(today());
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState([]);
  const [lowCount, setLowCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      api("/reports/daily/", { params: { date: day } }),
      api("/reports/trend/", { params: { to: day } }),
      api("/reports/low-stock/"),
    ]).then(([d, t, l]) => {
      if (!alive) return;
      setData(d);
      setTrend(t.map((r) => ({ ...r, label: new Date(r.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
                                sales: Number(r.sales), profit: Number(r.profit) })));
      setLowCount(l.length);
      setError("");
    }).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [day]);

  const f = data?.finance;
  const s = data?.sales_summary;
  const modes = s ? Object.entries(s.by_payment_mode) : [];
  const modeTotal = modes.reduce((a, [, v]) => a + Number(v), 0);

  return (
    <section>
      <header className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Sales, profit and stock for one day. Change the date to look back.</p>
        </div>
        <input type="date" className="input auto" value={day} max={today()} onChange={(e) => setDay(e.target.value)} aria-label="Report date" />
      </header>
      <Notice error={error} />

      {f && (
        <>
          <div className="day-hero">
            <div>
              <div className="figure-label">Sales</div>
              <div className="hero-value">{money(f.total_sales)}</div>
              <div className="figure-note">{s.total_bills} bills, GST collected {money(f.gst_collected)}</div>
            </div>
            <div className="split" aria-label="Payment modes">
              {modeTotal > 0 ? (
                <>
                  <div className="split-bar">
                    {modes.map(([m, v]) => (
                      <span key={m} className={`seg seg-${m.toLowerCase()}`} style={{ width: `${(Number(v) / modeTotal) * 100}%` }} />
                    ))}
                  </div>
                  <div className="split-legend">
                    {modes.map(([m, v]) => (
                      <span key={m}><i className={`dot seg-${m.toLowerCase()}`} />{MODE_LABEL[m]} {money(v)}</span>
                    ))}
                  </div>
                </>
              ) : <span className="figure-note">No bills on this day.</span>}
            </div>
          </div>

          <div className="figures">
            <Figure label="Gross profit" value={money(f.gross_profit)} note={`Cost of goods ${money(f.cost_of_goods_sold)}`} />
            <Figure label="Expenses" value={money(f.expenses)} />
            <Figure label="Net profit" value={money(f.net_profit)} tone={Number(f.net_profit) < 0 ? "bad" : "good"} />
            <Figure label="Purchases" value={money(f.purchases_made)} note={`Paid to suppliers ${money(f.supplier_paid)}`} />
            <Figure label="Cash in drawer from sales" value={money(f.cash_in_hand_from_sales)} />
            <Figure label="Low stock items" value={lowCount} note={lowCount ? "See Stock to reorder" : "All good"} tone={lowCount ? "warn" : ""} />
          </div>

          <div className="panel">
            <h2>Last 7 days</h2>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <ComposedChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#8e9e94" }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={70} tick={{ fill: "#8e9e94" }}
                         tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                  <Tooltip cursor={{ fill: "rgba(134,239,172,0.08)" }} contentStyle={{ background: "#111412", border: "1px solid #262c28", color: "#e9f5ec" }} formatter={(v, n) => [money(v), n === "sales" ? "Sales" : "Gross profit"]} />
                  <Bar dataKey="sales" fill="var(--leaf)" radius={[4, 4, 0, 0]} maxBarSize={44} />
                  <Line dataKey="profit" stroke="var(--mustard-dark)" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="muted small">Bars show sales, the line shows gross profit.</p>
          </div>

          <div className="two-col">
            <div className="panel">
              <h2>Products sold</h2>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Product</th><th className="right">Qty</th><th className="right">Sales</th><th className="right">Profit</th></tr></thead>
                  <tbody>
                    {data.products.length === 0 && <tr><td colSpan={4} className="empty">Nothing sold on this day.</td></tr>}
                    {data.products.map((p) => (
                      <tr key={p.product_id}>
                        <td>{p.product__name}<div className="muted small">{p.product__category__name}</div></td>
                        <td className="right">{num(p.qty_sold)}</td>
                        <td className="right">{money(p.revenue)}</td>
                        <td className="right">{money(p.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="panel">
              <h2>By category</h2>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Category</th><th className="right">Sales</th><th className="right">Profit</th></tr></thead>
                  <tbody>
                    {data.categories.length === 0 && <tr><td colSpan={3} className="empty">Nothing sold on this day.</td></tr>}
                    {data.categories.map((c) => (
                      <tr key={c.category}><td>{c.category}</td><td className="right">{money(c.revenue)}</td><td className="right">{money(c.profit)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
