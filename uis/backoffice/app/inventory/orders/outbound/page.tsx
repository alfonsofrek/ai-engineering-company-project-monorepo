"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { ErrorState } from "../../../../components/ErrorState";
import { ApiError, toUserMessage } from "../../../../lib/http";
import {
  type ExitType,
  EXIT_TYPE_LABELS,
  getSku,
  registerStockExit,
  type Sku,
  skuOptionLabel,
  WAREHOUSE_LABELS,
} from "../../../../lib/inventory";
import { useSkus } from "../../../../lib/useSkus";
import "../../inventory.css";

type StockState = { kind: "idle" } | { kind: "loading"; skuId: string } | { kind: "ready"; sku: Sku } | { kind: "error"; message: string };

export default function StockExitPage() {
  const { skus, error: loadError, preselectedId, reload } = useSkus();
  const [chosenSkuId, setSkuId] = useState<string | null>(null);
  const skuId = chosenSkuId ?? preselectedId;
  const [stock, setStock] = useState<StockState>({ kind: "idle" });
  const [stockKey, setStockKey] = useState(0);
  const [quantity, setQuantity] = useState("");
  const [exitType, setExitType] = useState<ExitType>("dispatch");
  const [tracking, setTracking] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [quantityError, setQuantityError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // The available stock is fetched again from the API every time the selected SKU changes.
  useEffect(() => {
    if (!skuId) return;
    let active = true;
    getSku(Number(skuId))
      .then((sku) => { if (active) setStock({ kind: "ready", sku }); })
      .catch((reason) => { if (active) setStock({ kind: "error", message: toUserMessage(reason, "No se pudo consultar el stock.") }); });
    return () => { active = false; };
  }, [skuId, stockKey]);

  const selected = stock.kind === "ready" && String(stock.sku.id) === skuId ? stock.sku : null;
  const qty = Number(quantity);
  const exceeds = selected !== null && quantity !== "" && qty > selected.current_stock;

  function selectSku(value: string) {
    setSkuId(value);
    setStock(value ? { kind: "loading", skuId: value } : { kind: "idle" });
    setQuantityError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setQuantityError("");
    if (!selected) return setError("Selecciona el SKU que sale del almacén.");
    if (!Number.isInteger(qty) || qty <= 0) return setQuantityError("La cantidad debe ser un número entero mayor que 0.");
    if (exitType === "dispatch" && !tracking.trim()) return setError("Un envío a cliente necesita el número de seguimiento del transportista.");
    setIsSaving(true);
    try {
      const exit = await registerStockExit({
        sku_id: selected.id,
        quantity: qty,
        exit_type: exitType,
        tracking_number: exitType === "dispatch" ? tracking.trim() : null,
        warehouse: selected.warehouse,
      });
      setNotice(`Salida registrada: −${exit.quantity} uds. de ${exit.sku.sku} (${EXIT_TYPE_LABELS[exit.exit_type].toLowerCase()}).`);
      setQuantity("");
      setTracking("");
      setStockKey((key) => key + 1);
      reload();
    } catch (requestError) {
      const message = toUserMessage(requestError, "No se pudo registrar la salida. Inténtalo de nuevo.");
      // Insufficient stock (400) is shown next to the quantity, where the user can fix it.
      if (requestError instanceof ApiError && requestError.status === 400) {
        setQuantityError(message);
        setStockKey((key) => key + 1);
      } else {
        setError(message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return <>
    <header className="topbar inv-header">
      <div><p className="kicker">INVENTARIO / SALIDA DE STOCK</p><h1>Registrar salida</h1></div>
      <Link className="inv-secondary" href="/inventory/products">Volver al stock</Link>
    </header>
    <p className="auth-description">Envío a un cliente o pérdida confirmada (StockExit). No se puede sacar más de lo que hay en el almacén del SKU.</p>

    {loadError && <ErrorState title="No se pudieron cargar los SKUs" message={loadError} onRetry={reload} />}
    {notice && <p className="inv-success" role="status">{notice} <Link href="/inventory/orders">Ver movimientos</Link></p>}
    {error && <p className="inv-alert" role="alert">{error}</p>}

    {!loadError && <form className="inv-form" onSubmit={submit} noValidate>
      <label className="inv-wide">SKU
        <select value={skuId} onChange={(event) => selectSku(event.target.value)} disabled={!skus} required>
          <option value="">{skus ? "Selecciona un SKU…" : "Cargando SKUs…"}</option>
          {skus?.map((sku) => <option key={sku.id} value={sku.id}>{skuOptionLabel(sku)}</option>)}
        </select>
      </label>

      <div className="inv-stock-box" aria-live="polite">
        {!skuId && <span>Selecciona un SKU para ver su stock disponible.</span>}
        {skuId && (stock.kind === "loading" || stock.kind === "idle") && <span>Consultando stock…</span>}
        {skuId && stock.kind === "error" && <span className="inv-field-error">{stock.message}</span>}
        {selected && <>
          <span>Disponible en {WAREHOUSE_LABELS[selected.warehouse]}</span>
          <strong data-testid="available-stock">{selected.current_stock} uds.</strong>
        </>}
      </div>

      <label>Unidades
        <input type="number" inputMode="numeric" min={1} step={1} required value={quantity}
          aria-invalid={exceeds || Boolean(quantityError)} aria-describedby="quantity-help"
          onChange={(event) => { setQuantity(event.target.value); setQuantityError(""); }} />
        <span id="quantity-help">
          {quantityError
            ? <span className="inv-field-error" role="alert">{quantityError}</span>
            : exceeds && <span className="inv-field-warning" role="status">Atención: solo hay {selected?.current_stock} uds. disponibles. La API rechazará esta salida.</span>}
        </span>
      </label>

      <label>Tipo de salida
        <select value={exitType} onChange={(event) => setExitType(event.target.value as ExitType)}>
          {Object.entries(EXIT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      {exitType === "dispatch"
        ? <label className="inv-wide">Número de seguimiento
          <input placeholder="1Z999AA10123456784" maxLength={64} required value={tracking} onChange={(event) => setTracking(event.target.value)} />
        </label>
        : <p className="inv-wide auth-description" style={{ margin: 0 }}>Las pérdidas no llevan número de seguimiento.</p>}

      <div className="inv-actions">
        <span>El usuario que autoriza la salida queda guardado en el movimiento.</span>
        <button className="primary-button" type="submit" disabled={isSaving || !selected}>{isSaving ? "Registrando…" : "Registrar salida"}</button>
      </div>
    </form>}
  </>;
}
