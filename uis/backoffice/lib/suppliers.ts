/** Supplier directory types and labels shared by the page and the lazy-loaded create form. */

export type Supplier = {
  id: number;
  name: string;
  country: "USA" | "Spain";
  categories: string[];
  rate_per_shipment: number;
  currency: "USD" | "EUR";
  updated_at: string;
  status: "active" | "suspended";
  service_zone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
};

export const categories = [
  "carrier_last_mile",
  "carrier_international",
  "warehouse_supplies",
  "packaging_materials",
  "reverse_logistics",
  "fleet_maintenance",
  "it_and_wms_software",
  "cleaning_and_facilities",
];
export const categoryLabels: Record<string, string> = {
  carrier_last_mile: "Carrier última milla",
  carrier_international: "Carrier internacional",
  warehouse_supplies: "Suministros de almacén",
  packaging_materials: "Materiales de embalaje",
  reverse_logistics: "Logística inversa",
  fleet_maintenance: "Mantenimiento de flota",
  it_and_wms_software: "Software IT / WMS",
  cleaning_and_facilities: "Limpieza e instalaciones",
};

export function formatRate(rate: number | null | undefined, currency: Supplier["currency"] | undefined) {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: currency ?? "EUR" }).format(rate);
}

export function formatCountry(country: Supplier["country"]) {
  return country === "USA" ? "Estados Unidos" : "España";
}

