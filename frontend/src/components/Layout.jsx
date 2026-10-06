import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const SHOP = import.meta.env.VITE_SHOP_NAME || "Supermarket";

const NAV = [
  { group: "Sell", items: [
    { to: "/billing", label: "Billing" },
    { to: "/sales", label: "Bills" },
  ]},
  { group: "Shelf", items: [
    { to: "/products", label: "Products" },
    { to: "/categories", label: "Categories", manager: true },
    { to: "/racks", label: "Racks", manager: true },
    { to: "/stock", label: "Stock", manager: true },
  ]},
  { group: "Buy", manager: true, items: [
    { to: "/purchases", label: "Purchases", manager: true },
    { to: "/suppliers", label: "Suppliers", manager: true },
  ]},
  { group: "Money", manager: true, items: [
    { to: "/dashboard", label: "Dashboard", manager: true },
    { to: "/expenses", label: "Expenses", manager: true },
  ]},
  { group: "Team", owner: true, items: [{ to: "/users", label: "Users", owner: true }] },
];

export default function Layout() {
  const { user, logout, isManager, isOwner } = useAuth();
  const allowed = (x) => (!x.manager || isManager) && (!x.owner || isOwner);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">{SHOP}</div>
        <nav>
          {NAV.filter(allowed).map((g) => (
            <div key={g.group} className="nav-group">
              <div className="nav-group-name">{g.group}</div>
              {g.items.filter(allowed).map((i) => (
                <NavLink key={i.to} to={i.to} className="nav-link">{i.label}</NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="me">
          <div>{user?.name}</div>
          <div className="muted small">{user?.role?.toLowerCase()}</div>
          <button className="btn ghost small" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  );
}
