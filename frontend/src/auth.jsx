import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  async function login(username, password) {
    const data = await api("/auth/login/", { method: "POST", body: { username, password } });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try { await api("/auth/logout/", { method: "POST" }); } catch { /* token may already be gone */ }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  const isManager = !!user && ["OWNER", "MANAGER"].includes(user.role);
  const isOwner = user?.role === "OWNER";

  return (
    <AuthContext.Provider value={{ user, login, logout, isManager, isOwner }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
