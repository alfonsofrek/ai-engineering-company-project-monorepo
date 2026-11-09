"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { ErrorState } from "../../../../components/ErrorState";
import { toUserMessage } from "../../../../lib/http";
import { registerStockEntry, skuOptionLabel, WAREHOUSE_LABELS } from "../../../../lib/inventory";
import { useSkus } from "../../../../lib/useSkus";
import "../../inventory.css";

export default function StockEntryPage() {
  const { skus, error: loadError, preselectedId, reload } = useSkus();
  const [chosenSkuId, setSkuId] = useState<string | null>(null);
  const skuId = chosenSkuId ?? preselectedId;
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selected = skus?.find((sku) => String(sku.id) === skuId) ?? null;
  const qty = Number(quantity);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!selected) return setError("Selecciona el SKU que ha llegado.");
    if (!Number.isInteger(qty) || qty <= 0) return setError("La cantidad debe ser un número entero mayor que 0.");
    if (reference.trim().length < 2) return setError("Indica la referencia del envío de la marca (p. ej. PO-2024-0098).");
    setIsSaving(true);
    try {
      const entry = await registerStockEntry({ sku_id: selected.id, quantity: qty, reference: reference.trim(), warehouse: selected.warehouse });
      setNotice(`Entrada registrada: +${entry.quantity} uds. de ${entry.sku.sku} en ${entry.warehouse} (ref. ${entry.reference}).`);
      setQuantity("");
      setReference("");
      reload();
    } catch (requestError) {
      setError(toUserMessage(requestError, "No se pudo registrar la entrada. Inténtalo de nuevo."));
    } finally {
      setIsSaving(false);
    }
  }

  return <>
    <header className="topbar inv-header">
      <div><p className="kicker">INVENTARIO / ENTRADA DE STOCK</p><h1>Registrar entrada</h1></div>
      <Link className="inv-secondary" href="/inventory/products">Volver al stock</Link>
    </header>
    <p className="auth-description">Recepción de mercancía de una marca cliente (StockEntry). El stock solo aumenta registrando entradas.</p>

    {loadError && <ErrorState title="No se pudieron cargar los SKUs" message={loadError} onRetry={reload} />}
    {notice && <p className="inv-success" role="status">{notice} <Link href="/inventory/orders">Ver movimientos</Link></p>}
    {error && <p className="inv-alert" role="alert">{error}</p>}

    {!loadError && <form className="inv-form" onSubmit={submit} noValidate>
      <label className="inv-wide">SKU recibido
        <select value={skuId} onChange={(event) => setSkuId(event.target.value)} disabled={!skus} required>
          <option value="">{skus ? "Selecciona un SKU…" : "Cargando SKUs…"}</option>
          {skus?.map((sku) => <option key={sku.id} value={sku.id}>{skuOptionLabel(sku)}</option>)}
        </select>
      </label>
      <label>Almacén de recepción
        <input readOnly value={selected ? WAREHOUSE_LABELS[selected.warehouse] : "—"} />
      </label>
      <label>Stock actual
        <input readOnly value={selected ? `${selected.current_stock} uds.` : "—"} />
      </label>
      <label>Unidades recibidas
        <input type="number" inputMode="numeric" min={1} step={1} required value={quantity} onChange={(event) => setQuantity(event.target.value)} />
      </label>
      <label>Referencia de la marca
        <input placeholder="PO-2024-0098" maxLength={64} required value={reference} onChange={(event) => setReference(event.target.value)} />
      </label>
      <div className="inv-actions">
        <span>El usuario que registra la entrada queda guardado en el movimiento.</span>
        <button className="primary-button" type="submit" disabled={isSaving || !skus}>{isSaving ? "Registrando…" : "Registrar entrada"}</button>
      </div>
    </form>}
  </>;
}
