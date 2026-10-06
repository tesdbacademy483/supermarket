import CrudPage from "../components/CrudPage.jsx";

export default function Suppliers() {
  return (
    <CrudPage
      title="Suppliers"
      endpoint="/suppliers/"
      searchPlaceholder={null}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email", type: "email" },
        { name: "gstin", label: "GSTIN" },
        { name: "address", label: "Address", type: "textarea" },
      ]}
      columns={[
        { key: "name", label: "Supplier" },
        { key: "phone", label: "Phone" },
        { key: "gstin", label: "GSTIN" },
        { key: "address", label: "Address" },
      ]}
      emptyText="No suppliers yet. Add the wholesalers you buy from."
    />
  );
}
