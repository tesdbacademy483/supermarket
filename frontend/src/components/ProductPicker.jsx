import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { api, money, num } from "../api";

/**
 * Search box for products. Works with a USB barcode scanner: the scanner types the
 * code and presses Enter, we look up the exact barcode first, then fall back to name search.
 */
const ProductPicker = forwardRef(function ProductPicker(
  { onPick, placeholder = "Scan barcode or type product name", autoFocus, onNotFound, showStock = true }, ref
) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const timer = useRef(null);

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const data = await api("/products/", { params: { search: q.trim(), active: 1, page_size: 8 } });
        setResults(data.results || []);
        setActive(0);
        setOpen(true);
      } catch { setResults([]); }
    }, 200);
    return () => clearTimeout(timer.current);
  }, [q]);

  function pick(p) {
    onPick(p);
    setQ(""); setResults([]); setOpen(false);
    inputRef.current?.focus();
  }

  async function onKeyDown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Escape") { setOpen(false); setQ(""); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const code = q.trim();
      if (!code) return;
      clearTimeout(timer.current);
      try {
        const exact = await api("/products/", { params: { barcode: code, active: 1 } });
        if (exact.results?.length) return pick(exact.results[0]);
      } catch { /* fall through to name results */ }
      if (open && results[active]) return pick(results[active]);
      inputRef.current?.select();
      onNotFound?.(code);
    }
  }

  return (
    <div className="picker">
      <input
        ref={inputRef}
        className="input big"
        value={q}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => results.length && setOpen(true)}
        aria-label="Find product"
      />
      {open && results.length > 0 && (
        <ul className="picker-list" role="listbox">
          {results.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : ""}
              onMouseDown={() => pick(p)}
              onMouseEnter={() => setActive(i)}
            >
              <span className="grow">{p.name}<span className="muted small"> {p.barcode}</span></span>
              {showStock && (
                <span className={`small ${Number(p.current_stock) <= 0 ? "text-danger" : "muted"}`}>
                  {num(p.current_stock)} {p.unit.toLowerCase()}
                </span>
              )}
              <span className="price">{money(p.selling_price)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default ProductPicker;
