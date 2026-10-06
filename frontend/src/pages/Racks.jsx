import CrudPage from "../components/CrudPage.jsx";

export default function Racks() {
  return (
    <CrudPage
      title="Racks"
      intro="Every shelf in the store. Assign products to a rack so staff know where to find and refill them."
      endpoint="/racks/"
      fields={[
        { name: "rack_code", label: "Rack code", required: true, placeholder: "R-A1" },
        { name: "section", label: "Section", placeholder: "Aisle 1 – Grains" },
        { name: "description", label: "Description" },
        { name: "capacity", label: "Capacity (items)", type: "number", min: 0 },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      columns={[
        { key: "rack_code", label: "Rack" },
        { key: "section", label: "Section" },
        { key: "product_count", label: "Products", align: "right" },
        { key: "capacity", label: "Capacity", align: "right" },
      ]}
      emptyText="No racks yet. Add one for each shelf, for example R-A1."
    />
  );
}
