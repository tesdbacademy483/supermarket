import CrudPage from "../components/CrudPage.jsx";

const ROLES = [
  { value: "CASHIER", label: "Cashier – billing only" },
  { value: "MANAGER", label: "Manager – stock, purchases, reports" },
  { value: "OWNER", label: "Owner – everything, including users" },
];

export default function Users() {
  return (
    <CrudPage
      title="Users"
      intro="People who can sign in. Cashiers only see billing and their own bills."
      endpoint="/users/"
      canDelete={false}
      fields={[
        { name: "username", label: "Username", required: true },
        { name: "first_name", label: "Name" },
        { name: "role", label: "Role", type: "select", options: ROLES, required: true, default: "CASHIER" },
        { name: "phone", label: "Phone" },
        { name: "password", label: "Password", type: "password", required: true,
          help: "At least 6 characters. When editing, leave empty to keep the current password." },
        { name: "is_active", label: "Can sign in", type: "checkbox" },
      ]}
      columns={[
        { key: "username", label: "Username" },
        { key: "first_name", label: "Name" },
        { key: "role", label: "Role", render: (r) => r.role.toLowerCase() },
        { key: "is_active", label: "Status", render: (r) => (r.is_active ? "Active" : <span className="muted">Disabled</span>) },
      ]}
    />
  );
}
