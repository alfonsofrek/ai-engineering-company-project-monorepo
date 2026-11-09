"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorState } from "../../../components/ErrorState";
import { toUserMessage } from "../../../lib/http";
import { EXIT_TYPE_LABELS, listMovements, type StockMovement, type Warehouse, WAREHOUSE_LABELS } from "../../../lib/inventory";
import "../inventory.css";

type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; movements: StockMovement[] };

const dateFormat = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" });

export default function StockMovementsPage() {
  const [warehouse, setWarehouse] = useState<Warehouse | "">("");
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    listMovements({ warehouse: warehouse || undefined })
      .then((movements) => { if (active) setState({ kind: "ready", movements }); })
      .catch((error) => { if (active) setState({ kind: "error", message: toUserMessage(error, "No se pudieron cargar los movimientos.") }); });
    return () => { active = false; };
  }, [warehouse, reloadKey]);

  return <>
    <header className="topbar inv-header">
      <div><p className="kicker">INVENTARIO / MOVIMIENTOS</p><h1>Historial de movimientos</h1></div>
      <div className="inv-header-actions">
        <Link className="inv-secondary" href="/inventory/orders/outbound">− Registrar salida</Link>
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
      <p className="inv-legend"><span className="inv-move inbound">ENTRADA</span><span className="inv-move outbound">SALIDA</span><span>Solo lectura: los movimientos no se editan ni se borran.</span></p>
    </section>

    {state.kind === "loading" && <p className="inv-loading" aria-live="polite">Cargando movimientos…</p>}
    {state.kind === "error" && <ErrorState title="No se pudo cargar el historial" message={state.message} onRetry={() => { setState({ kind: "loading" }); setReloadKey((key) => key + 1); }} />}
    {state.kind === "ready" && state.movements.length === 0 && <p className="inv-empty">Todavía no hay movimientos{warehouse ? " en este almacén" : ""}.</p>}
    {state.kind === "ready" && state.movements.length > 0 && <div className="inv-table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>SKU</th><th style={{ textAlign: "right" }}>Unidades</th><th>Almacén</th><th>Detalle</th><th>Registrado por (user_uuid)</th></tr></thead>
        <tbody>
          {state.movements.map((movement) => <tr key={`${movement.movement}-${movement.id}`}>
            <td>{dateFormat.format(new Date(movement.created_at))}</td>
            <td><span className={`inv-move ${movement.movement}`}>{movement.movement === "inbound" ? "ENTRADA" : "SALIDA"}</span></td>
            <td><strong>{movement.sku.name}</strong><small>{movement.sku.sku}</small></td>
            <td className={`inv-num inv-qty ${movement.movement}`}>{movement.movement === "inbound" ? "+" : "−"}{movement.quantity}</td>
            <td>{movement.warehouse}</td>
            <td>{movement.movement === "inbound"
              ? <>Ref. {movement.reference}</>
              : <>{EXIT_TYPE_LABELS[movement.exit_type]}{movement.tracking_number && <small>{movement.tracking_number}</small>}</>}</td>
            <td className="inv-uuid">{movement.user_uuid}</td>
          </tr>)}
        </tbody>
      </table>
    </div>}
  </>;
}
