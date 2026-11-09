"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorState } from "../../../components/ErrorState";
import { toUserMessage } from "../../../lib/http";
import {
  CATEGORY_LABELS,
  LOW_STOCK_THRESHOLD,
  listSkus,
  type Sku,
  STOCK_LEVEL_LABELS,
  stockLevel,
  type Warehouse,
  WAREHOUSE_LABELS,
} from "../../../lib/inventory";
import "../inventory.css";

type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; skus: Sku[] };

export default function SkuStockPage() {
  const [warehouse, setWarehouse] = useState<Warehouse | "">("");
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    listSkus(warehouse || undefined)
      .then((skus) => { if (active) setState({ kind: "ready", skus }); })
      .catch((error) => { if (active) setState({ kind: "error", message: toUserMessage(error, "No se pudieron cargar los SKUs.") }); });
    return () => { active = false; };
  }, [warehouse, reloadKey]);

  const lowCount = state.kind === "ready" ? state.skus.filter((sku) => stockLevel(sku.current_stock) !== "ok").length : 0;

  return <>
    <header className="topbar inv-header">
      <div><p className="kicker">INVENTARIO / SKUS</p><h1>Stock por SKU</h1></div>
      <div className="inv-header-actions">
        <Link className="inv-secondary" href="/inventory/orders">Ver movimientos</Link>
        <Link className="primary-button" href="/inventory/orders/inbound">+ Registrar entrada</Link>
      </div>
    </header>

    <section className="inv-toolbar" aria-label="Filtros">
      <label>Almacén
        <select value={warehouse} onChange={(event) => { setState({ kind: "loading" }); setWarehouse(event.target.value as Warehouse | ""); }}>
          <option value="">Los dos almacenes</option>
          {Object.entries(WAREHOUSE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <p className="inv-legend">
        <span className="inv-badge ok">≥ {LOW_STOCK_THRESHOLD} uds.</span>
        <span className="inv-badge low">1–{LOW_STOCK_THRESHOLD - 1} uds.</span>
        <span className="inv-badge out">0 uds.</span>
      </p>
    </section>

    {state.kind === "loading" && <p className="inv-loading" aria-live="polite">Cargando SKUs…</p>}
    {state.kind === "error" && <ErrorState title="No se pudo cargar el inventario" message={state.message} onRetry={() => { setState({ kind: "loading" }); setReloadKey((key) => key + 1); }} />}
    {state.kind === "ready" && state.skus.length === 0 && <p className="inv-empty">No hay SKUs registrados{warehouse ? " en este almacén" : ""}.</p>}
    {state.kind === "ready" && state.skus.length > 0 && <>
      {lowCount > 0 && <p className="inv-alert" role="status">{lowCount} {lowCount === 1 ? "SKU necesita" : "SKUs necesitan"} reposición.</p>}
      <div className="inv-table-wrap">
        <table>
          <thead><tr><th>SKU</th><th>Marca cliente</th><th>Categoría</th><th>Almacén</th><th style={{ textAlign: "right" }}>Stock actual</th><th>Nivel</th><th aria-label="Acciones" /></tr></thead>
          <tbody>
            {state.skus.map((sku) => {
              const level = stockLevel(sku.current_stock);
              return <tr key={sku.id}>
                <td><strong>{sku.name}</strong><small>{sku.sku}</small></td>
                <td>{sku.client_name}</td>
                <td>{CATEGORY_LABELS[sku.category] ?? sku.category}</td>
                <td>{WAREHOUSE_LABELS[sku.warehouse] ?? sku.warehouse}</td>
                <td className="inv-num">{sku.current_stock}</td>
                <td><span className={`inv-badge ${level}`}>{STOCK_LEVEL_LABELS[level]}</span></td>
                <td>
                  <div className="inv-row-actions">
                    <Link href={`/inventory/orders/inbound?sku_id=${sku.id}`} aria-label={`Registrar entrada de ${sku.sku}`}>+ Entrada</Link>
                    <Link href={`/inventory/orders/outbound?sku_id=${sku.id}`} aria-label={`Registrar salida de ${sku.sku}`}>− Salida</Link>
                  </div>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </>}
  </>;
}
