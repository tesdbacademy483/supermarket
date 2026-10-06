import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Billing from "./pages/Billing.jsx";
import Sales from "./pages/Sales.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Categories from "./pages/Categories.jsx";
import Racks from "./pages/Racks.jsx";
import Stock from "./pages/Stock.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import Purchases from "./pages/Purchases.jsx";
import Expenses from "./pages/Expenses.jsx";
import Users from "./pages/Users.jsx";

function Protected({ children, manager, owner }) {
  const { user, isManager, isOwner } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if ((manager && !isManager) || (owner && !isOwner)) return <Navigate to="/billing" replace />;
  return children;
}

export default function App() {
  const { user, isManager } = useAuth();
  const home = isManager ? "/dashboard" : "/billing";

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Navigate to={home} replace />} />
        <Route path="billing" element={<Billing />} />
        <Route path="sales" element={<Sales />} />
        <Route path="products" element={<Products />} />
        <Route path="dashboard" element={<Protected manager><Dashboard /></Protected>} />
        <Route path="categories" element={<Protected manager><Categories /></Protected>} />
        <Route path="racks" element={<Protected manager><Racks /></Protected>} />
        <Route path="stock" element={<Protected manager><Stock /></Protected>} />
        <Route path="suppliers" element={<Protected manager><Suppliers /></Protected>} />
        <Route path="purchases" element={<Protected manager><Purchases /></Protected>} />
        <Route path="expenses" element={<Protected manager><Expenses /></Protected>} />
        <Route path="users" element={<Protected owner><Users /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
