import { useCallback, useEffect, useMemo, useState } from "react";
import { api, list } from "../api";
import { useAuth } from "../auth.jsx";
import Modal from "./Modal.jsx";
import Notice from "./Notice.jsx";

const singular = (t) => t.toLowerCase().replace(/ies$/, "y").replace(/s$/, "");

/**
 * Generic list + add/edit/delete page.
 * fields:  [{ name, label, type: text|number|select|checkbox|date|password|textarea,
 *             options:[{value,label}] | optionsFrom:{endpoint, label:(row)=>string},
 *             required, default, step, help, hideInForm }]
 * columns: [{ key, label, render:(row, labelMaps)=>node, align }]
 * filters: [{ name, label, type:select|date|checkbox, options|optionsFrom, default }]
 */
export default function CrudPage({
  title, intro, endpoint, fields = [], columns, filters = [], searchPlaceholder,
  canEdit, canDelete = true, emptyText, rowActions, toolbar, refreshKey,
}) {
  const { isManager } = useAuth();
  const editable = canEdit ?? isManager;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState(() =>
    Object.fromEntries(filters.map((f) => [f.name, f.default ?? ""])));
  const [lookups, setLookups] = useState({});
  const [editing, setEditing] = useState(null);   // null = closed, {} = new, row = edit
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Load dropdown options (e.g. categories for products)
  useEffect(() => {
    const sources = [...fields, ...filters].filter((f) => f.optionsFrom);
    Promise.all(sources.map(async (f) => {
      const data = await list(f.optionsFrom.endpoint);
      return [f.name, data.map((r) => ({ value: r.id, label: f.optionsFrom.label(r) }))];
    })).then((pairs) => setLookups(Object.fromEntries(pairs))).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, refreshKey]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filterValues };
      if (search) params.search = search;
      setRows(await list(endpoint, params));
      setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [endpoint, search, filterValues]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load, refreshKey]);

  const optionsFor = (f) => f.options || lookups[f.name] || [];
  const labelMaps = useMemo(() => {
    const m = {};
    [...fields, ...filters].forEach((f) => {
      m[f.name] = Object.fromEntries(optionsFor(f).map((o) => [String(o.value), o.label]));
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookups]);

  function openForm(row) {
    const initial = {};
    fields.forEach((f) => {
      const v = row?.[f.name];
      if (row) initial[f.name] = v ?? (f.type === "checkbox" ? false : "");
      else initial[f.name] = f.default ?? (f.type === "checkbox" ? true : "");
      if (f.type === "password") initial[f.name] = "";
    });
    setForm(initial);
    setFormError("");
    setEditing(row || {});
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = {};
    fields.forEach((f) => {
      if (f.hideInForm) return;
      let v = form[f.name];
      if (f.type === "password" && !v) return;           // keep old password
      if (v === "" && ["select", "number", "date"].includes(f.type)) v = null;
      body[f.name] = v;
    });
    try {
      if (editing.id) await api(`${endpoint}${editing.id}/`, { method: "PATCH", body });
      else await api(endpoint, { method: "POST", body });
      setEditing(null);
      load();
    } catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  }

  async function remove(row) {
    if (!confirm(`Delete this ${singular(title)}? This can't be undone.`)) return;
    try { await api(`${endpoint}${row.id}/`, { method: "DELETE" }); load(); }
    catch (e) {
      setError(e.status >= 500 || /protect/i.test(e.message)
        ? "This is used by other records, so it can't be deleted. Mark it inactive instead."
        : e.message);
    }
  }

  const setFilter = (name, v) => setFilterValues((fv) => ({ ...fv, [name]: v }));

  return (
    <section>
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          {intro && <p className="muted">{intro}</p>}
        </div>
        <div className="row gap">
          {toolbar}
          {editable && <button className="btn primary" onClick={() => openForm(null)}>Add {singular(title)}</button>}
        </div>
      </header>

      {(searchPlaceholder || filters.length > 0) && (
        <div className="filters">
          {searchPlaceholder && (
            <input className="input" placeholder={searchPlaceholder} value={search}
                   onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
          )}
          {filters.map((f) => (
            <label key={f.name} className={f.type === "checkbox" ? "check" : "filter"}>
              {f.type === "checkbox" ? (
                <><input type="checkbox" checked={filterValues[f.name] === "1"}
                         onChange={(e) => setFilter(f.name, e.target.checked ? "1" : "")} /> {f.label}</>
              ) : f.type === "date" ? (
                <><span className="muted small">{f.label}</span>
                  <input type="date" className="input" value={filterValues[f.name]}
                         onChange={(e) => setFilter(f.name, e.target.value)} /></>
              ) : (
                <><span className="muted small">{f.label}</span>
                  <select className="input" value={filterValues[f.name]} onChange={(e) => setFilter(f.name, e.target.value)}>
                    <option value="">All</option>
                    {optionsFor(f).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select></>
              )}
            </label>
          ))}
        </div>
      )}

      <Notice error={error} onClose={() => setError("")} />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key} className={c.align === "right" ? "right" : ""}>{c.label}</th>)}
              {(editable || rowActions) && <th className="right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && <tr><td colSpan={columns.length + 1} className="empty">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="empty">{emptyText || "Nothing here yet."}</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => (
                  <td key={c.key} className={c.align === "right" ? "right" : ""}>
                    {c.render ? c.render(r, labelMaps) : String(r[c.key] ?? "")}
                  </td>
                ))}
                {(editable || rowActions) && (
                  <td className="right nowrap">
                    {rowActions?.(r, load)}
                    {editable && <button className="link" onClick={() => openForm(r)}>Edit</button>}
                    {editable && canDelete && <button className="link danger" onClick={() => remove(r)}>Delete</button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={`${editing.id ? "Edit" : "New"} ${singular(title)}`} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="form">
            {fields.filter((f) => !f.hideInForm).map((f) => (
              <label key={f.name} className={f.type === "checkbox" ? "check" : "field"}>
                {f.type !== "checkbox" && <span>{f.label}{f.required && " *"}</span>}
                {f.type === "select" ? (
                  <select className="input" value={form[f.name] ?? ""} required={f.required}
                          onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                    <option value="">{f.required ? "Choose…" : "None"}</option>
                    {optionsFor(f).filter((o) => !(f.excludeSelf && editing.id === o.value))
                      .map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "checkbox" ? (
                  <><input type="checkbox" checked={!!form[f.name]}
                           onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })} /> {f.label}</>
                ) : f.type === "textarea" ? (
                  <textarea className="input" rows={3} value={form[f.name] ?? ""}
                            onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                ) : (
                  <input className="input" type={f.type || "text"} step={f.step} min={f.min}
                         required={f.required && !(f.type === "password" && editing.id)}
                         value={form[f.name] ?? ""} placeholder={f.placeholder}
                         onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                )}
                {f.help && <small className="muted">{f.help}</small>}
              </label>
            ))}
            <Notice error={formError} />
            <div className="row gap end">
              <button type="button" className="btn ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
