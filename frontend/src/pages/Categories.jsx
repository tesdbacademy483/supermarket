import CrudPage from "../components/CrudPage.jsx";

export default function Categories() {
  return (
    <CrudPage
      title="Categories"
      intro="Group products into main categories and sub-categories, like Groceries › Rice & dal."
      endpoint="/categories/"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "parent", label: "Parent category", type: "select", excludeSelf: true,
          optionsFrom: { endpoint: "/categories/", label: (c) => c.full_name },
          help: "Leave empty for a main category." },
        { name: "description", label: "Description" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      columns={[
        { key: "full_name", label: "Category" },
        { key: "description", label: "Description" },
        { key: "is_active", label: "Status", render: (r) => (r.is_active ? "Active" : <span className="muted">Inactive</span>) },
      ]}
      emptyText="No categories yet. Add your first one, for example Groceries."
    />
  );
}
