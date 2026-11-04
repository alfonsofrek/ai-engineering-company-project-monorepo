"use client";

import { type FormEvent, useState } from "react";
import { apiFetch } from "../lib/auth-client";
import { parseResponse, toUserMessage } from "../lib/http";
import { categories, categoryLabels, type Supplier } from "../lib/suppliers";

/**
 * Create-supplier form, lazy-loaded from /suppliers with next/dynamic.
 * It keeps its own state, so typing here no longer re-renders the supplier table.
 */
export default function SupplierCreateForm({ onCreated, onError, onClose }: {
  onCreated: (supplier: Supplier) => void;
  onError: (message: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [newCountry, setNewCountry] = useState<"USA" | "Spain">("USA");
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [rate, setRate] = useState("");
  const [serviceZone, setServiceZone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  function toggleCategory(selected: string) {
    setNewCategories((current) => current.includes(selected)
      ? current.filter((item) => item !== selected)
      : [...current, selected]);
  }

  async function createSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    onError("");
    try {
      const response = await apiFetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          country: newCountry,
          categories: newCategories,
          rate_per_shipment: Number(rate),
          currency: newCountry === "USA" ? "USD" : "EUR",
          status: "active",
          service_zone: serviceZone.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const body = await parseResponse<Supplier>(response, "No se pudo registrar el proveedor.");
      onCreated(body);
      setName("");
      setNewCategories([]);
      setRate("");
      setServiceZone("");
      setContactEmail("");
      setNotes("");
    } catch (requestError) {
      onError(toUserMessage(requestError, "No se pudo completar la acción. Inténtalo de nuevo."));
    } finally {
      setIsCreating(false);
    }
  }

  return <form onSubmit={createSupplier}>
    <label className="supplier-name-field">Nombre del proveedor *<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre comercial" /></label>
    <label>País *<select value={newCountry} onChange={(event) => setNewCountry(event.target.value as "USA" | "Spain")}><option value="USA">Estados Unidos (USA)</option><option value="Spain">España</option></select></label>
    <label>Tarifa por envío o unidad *<input required type="number" min="0.01" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="0.00" /><small className="supplier-field-hint">Moneda del contrato: {newCountry === "USA" ? "USD" : "EUR"}</small></label>
    <label className="supplier-extra-field">Zona de servicio<input maxLength={120} value={serviceZone} onChange={(event) => setServiceZone(event.target.value)} placeholder="Opcional" /></label>
    <label className="supplier-extra-field">Email de contacto<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="contacto@empresa.com" /></label>
    <fieldset><legend>Categorías *</legend><div className="supplier-category-options">{categories.map((item) => <label key={item}><input type="checkbox" checked={newCategories.includes(item)} onChange={() => toggleCategory(item)} />{categoryLabels[item]}</label>)}</div></fieldset>
    <label className="supplier-notes-field">Notas de operaciones<textarea maxLength={1000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" /></label>
    <button className="primary-button" type="submit" disabled={isCreating || newCategories.length === 0}>{isCreating ? "Guardando..." : "Registrar proveedor"}</button>
    <button type="button" className="supplier-cancel" onClick={onClose}>Cerrar</button>
  </form>;
}
