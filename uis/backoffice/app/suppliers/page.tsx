"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/auth-client";
import { parseResponse, toUserMessage } from "../../lib/http";
import { track } from "../../lib/telemetry";
import { ErrorState } from "../../components/ErrorState";
import "./suppliers.css";

import { categories, categoryLabels, formatCountry, formatRate, type Supplier } from "../../lib/suppliers";

const SupplierCreateForm = dynamic(() => import("../../components/SupplierCreateForm"), {
  loading: () => <p className="supplier-empty" aria-live="polite">Cargando formulario…</p>,
});

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [rateDrafts, setRateDrafts] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [busySupplierId, setBusySupplierId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "rate" | "updated">("name");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (category) params.set("category", category);
    const query = params.toString();
    let active = true;
    apiFetch(`/api/suppliers${query ? `?${query}` : ""}`)
      .then((response) => parseResponse<Supplier[]>(response, "No se pudo cargar el directorio."))
      .then((data) => {
        if (active) setSuppliers(Array.isArray(data) ? data : []);
      })
      .catch((requestError: unknown) => {
        if (active) setLoadError(toUserMessage(requestError, "No se pudo cargar el directorio de proveedores."));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    // Ignore responses that arrive after the filters changed again.
    return () => { active = false; };
  }, [country, category, reloadKey]);

  /*
   * Client-side search, sort and totals over the loaded directory (1,500 rows with the
   * load-test data). The page re-renders on every keystroke in a rate input (rateDrafts
   * lives here) and on every busy/notice change; without useMemo each of those renders
   * would normalise, filter and re-sort the whole list again. It only depends on the
   * data and the two controls that change the result.
   */
  const view = useMemo(() => {
    const needle = normalize(search);
    const rows = needle
      ? suppliers.filter((supplier) => normalize(`${supplier.name} ${supplier.service_zone ?? ""} ${supplier.contact_email ?? ""}`).includes(needle))
      : [...suppliers];
    rows.sort(sortKey === "rate"
      ? (a, b) => a.rate_per_shipment - b.rate_per_shipment
      : sortKey === "updated"
        ? (a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "")
        : (a, b) => a.name.localeCompare(b.name, "es"));
    const active = rows.filter((supplier) => supplier.status === "active").length;
    return { rows, active, suspended: rows.length - active };
  }, [suppliers, search, sortKey]);

  // Loading state is switched on by whatever triggers a new request (filters, retry),
  // so the effect only reacts to the response.
  function startReload() {
    setIsLoading(true);
    setLoadError("");
  }

  // Shown immediately when the new supplier matches the active server filters.
  function handleCreated(supplier: Supplier) {
    if ((!country || country === supplier.country) && (!category || supplier.categories.includes(category))) {
      setSuppliers((current) => [supplier, ...current]);
    }
    setNotice("Proveedor registrado.");
  }

  async function updateRate(supplier: Supplier) {
    const value = Number(rateDrafts[supplier.id] ?? supplier.rate_per_shipment);
    setBusySupplierId(supplier.id);
    setError("");
    setNotice("");
    try {
      const response = await apiFetch(`/api/suppliers/${supplier.id}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate_per_shipment: value }),
      });
      const body = await parseResponse<Supplier>(response, "No se pudo actualizar la tarifa.");
      if (body.rate_per_shipment !== supplier.rate_per_shipment) {
        track("supplier_rate_updated", {
          supplier_id: body.id,
          previous_rate: supplier.rate_per_shipment,
          new_rate: body.rate_per_shipment,
          change_pct: Math.round(((body.rate_per_shipment - supplier.rate_per_shipment) / supplier.rate_per_shipment) * 10000) / 100,
          currency: body.currency,
        });
      }
      setSuppliers((current) => current.map((item) => item.id === supplier.id ? body : item));
      setRateDrafts((current) => {
        const drafts = { ...current };
        delete drafts[supplier.id];
        return drafts;
      });
      setNotice(`Tarifa de ${supplier.name} actualizada.`);
    } catch (requestError) {
      setError(toUserMessage(requestError, "No se pudo completar la acción. Inténtalo de nuevo."));
    } finally {
      setBusySupplierId(null);
    }
  }

  async function toggleStatus(supplier: Supplier) {
    setBusySupplierId(supplier.id);
    setError("");
    setNotice("");
    try {
      const response = await apiFetch(`/api/suppliers/${supplier.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: supplier.status === "active" ? "suspended" : "active" }),
      });
      const body = await parseResponse<Supplier>(response, "No se pudo cambiar el estado.");
      if (body.status !== supplier.status) {
        track("supplier_status_changed", { supplier_id: body.id, from_status: supplier.status, to_status: body.status, country: body.country });
      }
      setSuppliers((current) => current.map((item) => item.id === supplier.id ? body : item));
      setNotice(`${supplier.name}: ${body?.status === "active" ? "activo" : "suspendido"}.`);
    } catch (requestError) {
      setError(toUserMessage(requestError, "No se pudo completar la acción. Inténtalo de nuevo."));
    } finally {
      setBusySupplierId(null);
    }
  }

  return (
    <>
      <header className="topbar supplier-header">
        <div><p className="kicker">OPERACIONES / COMPRAS</p><h1>Directorio de proveedores</h1></div>
        <span className="supplier-count">{view.rows.length} proveedores · {view.active} activos · {view.suspended} suspendidos</span>
      </header>

      <section className="supplier-intro">
        <div><h2>Red operativa</h2><p>Consulta cobertura, servicios y tarifas vigentes de los partners de TrackFlow.</p></div>
        <div className="supplier-filters">
          <label>País<select value={country} onChange={(event) => { startReload(); setCountry(event.target.value); }}><option value="">Todos</option><option value="USA">Estados Unidos</option><option value="Spain">España</option></select></label>
          <label>Buscar<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, zona o email" /></label>
          <label>Ordenar<select value={sortKey} onChange={(event) => setSortKey(event.target.value as "name" | "rate" | "updated")}><option value="name">Nombre</option><option value="rate">Tarifa (menor primero)</option><option value="updated">Última actualización</option></select></label>
          <label>Categoria<select value={category} onChange={(event) => { startReload(); setCategory(event.target.value); }}><option value="">Todas</option>{categories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></label>
        </div>
      </section>

      {error && <ErrorState compact title="No se pudo completar la acción" message={error} />}
      {notice && <p className="supplier-notice" role="status">{notice}</p>}

      <section className="supplier-list" aria-label="Listado de proveedores">
        <div className="supplier-table-wrap"><table><thead><tr><th>PROVEEDOR / CONTACTO</th><th>PAÍS</th><th>ZONA</th><th>CATEGORÍAS</th><th>TARIFA / UNIDAD</th><th>ESTADO</th><th>ACTUALIZADO</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="supplier-empty" aria-live="polite">Cargando directorio...</td></tr>}
            {!isLoading && loadError && <tr><td colSpan={7}><ErrorState title="No se pudo cargar el directorio" message={loadError} onRetry={() => { startReload(); setReloadKey((key) => key + 1); }} /></td></tr>}
            {!isLoading && !loadError && view.rows.map((supplier) => <tr key={supplier.id}>
              <td><strong>{supplier.name}</strong>{supplier.contact_email && <a className="supplier-contact" href={`mailto:${supplier.contact_email}`}>{supplier.contact_email}</a>}{supplier.notes && <small className="supplier-notes" title={supplier.notes}>{supplier.notes}</small>}<small className="supplier-id">ID {supplier.id}</small></td>
              <td><span className="country-dot" />{formatCountry(supplier.country)}<small className="supplier-id">{supplier.currency}</small></td>
              <td>{supplier.service_zone ?? <span className="supplier-unspecified">Sin zona definida</span>}</td>
              <td><div className="service-tags">{(supplier.categories ?? []).map((item) => <span key={item}>{categoryLabels[item] ?? item}</span>)}</div></td>
              <td><div className="rate-control"><input aria-label={`Nueva tarifa para ${supplier.name}`} type="number" min="0.01" step="0.01" value={rateDrafts[supplier.id] ?? supplier.rate_per_shipment} onChange={(event) => setRateDrafts((current) => ({ ...current, [supplier.id]: event.target.value }))} /><button type="button" disabled={busySupplierId === supplier.id} onClick={() => updateRate(supplier)}>{busySupplierId === supplier.id ? "…" : "Guardar"}</button></div><small className="rate-current">Vigente: {formatRate(supplier.rate_per_shipment, supplier.currency)}</small></td>
              <td><button type="button" disabled={busySupplierId === supplier.id} className={`supplier-status ${supplier.status}`} onClick={() => toggleStatus(supplier)} aria-label={`${supplier.status === "active" ? "Suspender" : "Activar"} a ${supplier.name}`}>{supplier.status === "active" ? "Activo" : "Suspendido"}</button></td>
              <td>{supplier.updated_at ? <time dateTime={supplier.updated_at}>{new Date(supplier.updated_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</time> : "—"}</td>
            </tr>)}
            {!isLoading && !loadError && view.rows.length === 0 && <tr><td colSpan={7} className="supplier-empty">No hay proveedores para estos filtros.</td></tr>}
          </tbody>
        </table></div>
      </section>

      <section className="supplier-create">
        <div className="supplier-create-heading"><div><p className="kicker">ALTA DE PARTNER</p><h2>Registrar proveedor</h2></div>
          {!showCreate && <button type="button" className="primary-button" onClick={() => setShowCreate(true)}>+ Nuevo proveedor</button>}
        </div>
        {/* The form's code is only downloaded the first time someone opens it. */}
        {showCreate && <SupplierCreateForm onCreated={handleCreated} onError={setError} onClose={() => setShowCreate(false)} />}
      </section>
    </>
  );
}