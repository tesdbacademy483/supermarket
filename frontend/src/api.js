// Small fetch wrapper for the Django REST API.
const BASE = import.meta.env.VITE_API_URL || "/api";

export const getToken = () => localStorage.getItem("token");

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// Turns DRF error bodies ({"detail": ..}, {"field": [..]}, ["msg"]) into one readable line.
function errorText(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map(errorText).filter(Boolean).join(" ");
  if (data.detail) return errorText(data.detail);
  return Object.entries(data)
    .map(([k, v]) => (k === "non_field_errors" ? errorText(v) : `${k.replace(/_/g, " ")}: ${errorText(v)}`))
    .join(" ");
}

export async function api(path, { method = "GET", body, params } = {}) {
  let url = BASE + path;
  if (params) {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const qs = new URLSearchParams(clean).toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Token ${token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError("Can't reach the server. Check that Django is running.", 0);
  }

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth:logout"));
  }
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      res.status === 403 ? "You don't have permission for this." : errorText(data) || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }
  return data;
}

// For lists: unwraps DRF pagination and fetches a big page for dropdowns.
export async function list(path, params = {}) {
  const data = await api(path, { params: { page_size: 500, ...params } });
  return data?.results ?? data ?? [];
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
export const money = (v) => inr.format(Number(v || 0));
export const num = (v) => Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
export const dateTime = (v) =>
  new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
