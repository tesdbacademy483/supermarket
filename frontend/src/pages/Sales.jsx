import { useState } from "react";
import { api, dateTime, money, today } from "../api";
import { useAuth } from "../auth.jsx";
import CrudPage from "../components/CrudPage.jsx";
import Modal from "../components/Modal.jsx";
import Notice from "../components/Notice.jsx";
import Receipt from "../components/Receipt.jsx";

export default function Sales() {
  const { isManager } = useAuth();
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  async function cancel() {
    if (!confirm(`Cancel bill ${open.bill_no}? Stock for all its items goes back to the shelf.`)) return;
    try {
      const sale = await api(`/sales/${open.id}/cancel/`, { method: "POST" });
      setOpen(sale);
      setRefreshKey((k) => k + 1);
    } catch (e) { setError(e.message); }
  }

  return (
    <>
      <CrudPage
        title="Bills"
        intro={isManager ? "All bills. Open one to reprint it or cancel it." : "Your bills. Open one to reprint it."}
        endpoint="/sales/"
        canEdit={false}
        refreshKey={refreshKey}
        searchPlaceholder="Bill number"
        filters={[
          { name: "date", label: "Date", type: "date", default: today() },
          { name: "status", label: "Status", options: [{ value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" }] },
        ]}
        columns={[
          { key: "bill_no", label: "Bill" },
          { key: "sale_date", label: "Time", render: (r) => dateTime(r.sale_date) },
          { key: "cashier_name", label: "Cashier" },
          { key: "items", label: "Items", align: "right", render: (r) => r.items.length },
          { key: "payment_mode", label: "Paid by", render: (r) => r.payment_mode.toLowerCase() },
          { key: "total_amount", label: "Total", align: "right", render: (r) => (
            <span className={r.status === "CANCELLED" ? "strike muted" : "strong"}>{money(r.total_amount)}</span>
          ) },
          { key: "status", label: "Status", render: (r) => (
            r.status === "CANCELLED" ? <span className="badge danger">Cancelled</span> : "Completed"
          ) },
        ]}
        rowActions={(r) => <button className="link" onClick={() => { setError(""); setOpen(r); }}>Open</button>}
        emptyText="No bills for this date."
      />
      {open && (
        <Modal title={`Bill ${open.bill_no}`} onClose={() => setOpen(null)}>
          <div className="print-area"><Receipt sale={open} /></div>
          <Notice error={error} />
          <div className="row gap end">
            {isManager && open.status === "COMPLETED" && (
              <button className="btn danger-outline" onClick={cancel}>Cancel bill</button>
            )}
            <button className="btn primary" onClick={() => window.print()}>Print</button>
          </div>
        </Modal>
      )}
    </>
  );
}
