/**
 * Every call to the TrackFlow inventory API (/inventory) goes through this module:
 * components never call fetch directly.
 *
 * - Requests go through apiFetch, which adds `Authorization: Bearer <token>` from the session.
 * - Failed responses become an ApiError with a message the user can read (parseResponse),
 *   including the API's own 400 text, e.g. "Insufficient stock for SKU 'X'. Available: 3, requested: 5."
 *
 * Base URL: NEXT_PUBLIC_INVENTORY_API_URL when set (e.g. http://localhost:8000); otherwise the
 * Next.js rewrite /api/inventory/* → API_INTERNAL_URL/inventory/* (same origin, no CORS).
 */

import { apiFetch } from "./auth-client";
import { parseResponse } from "./http";

/** Domain values from the Milestone 5 TrackFlow BRIEFING. */
export type Warehouse = "LA" | "ZGZ";
export type SkuCategory = "fashion" | "electronics" | "cosmetics";
export type ExitType = "dispatch" | "loss";

export type Sku = {
  id: number;
  name: string;
  sku: string;
  client_name: string;
  category: SkuCategory;
  warehouse: Warehouse;
  current_stock: number;
};

/** Flat SKU projection the API embeds in each movement (see docs/serialization-audit.md). */
type SkuSummary = Pick<Sku, "id" | "name" | "sku">;

export type StockEntry = {
  movement: "inbound";
  id: number;
  quantity: number;
  reference: string;
  warehouse: Warehouse;
  created_at: string;
  user_uuid: string;
  sku: SkuSummary;
};

export type StockExit = {
  movement: "outbound";
  id: number;
  quantity: number;
  exit_type: ExitType;
  tracking_number: string | null;
  warehouse: Warehouse;
  created_at: string;
  user_uuid: string;
  sku: SkuSummary;
};

export type StockMovement = StockEntry | StockExit;

export type StockEntryInput = { sku_id: number; quantity: number; reference: string; warehouse: Warehouse };
export type StockExitInput = {
  sku_id: number;
  quantity: number;
  exit_type: ExitType;
  tracking_number: string | null;
  warehouse: Warehouse;
};

export const WAREHOUSE_LABELS: Record<Warehouse, string> = { LA: "Los Ángeles (LA)", ZGZ: "Zaragoza (ZGZ)" };
export const CATEGORY_LABELS: Record<SkuCategory, string> = {
  fashion: "Moda",
  electronics: "Electrónica",
  cosmetics: "Cosmética",
};
export const EXIT_TYPE_LABELS: Record<ExitType, string> = { dispatch: "Envío a cliente", loss: "Pérdida" };

/**
 * Stock-level thresholds for the colour indicators (units, per SKU and warehouse):
 * - 0            → "out"  (red): nothing to dispatch.
 * - 1 to 19      → "low"  (amber): below a typical weekly dispatch volume, reorder from the brand.
 * - 20 or more   → "ok"   (green).
 */
export const LOW_STOCK_THRESHOLD = 20;
export type StockLevel = "out" | "low" | "ok";
export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return "out";
  if (stock < LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}
export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = { out: "Sin stock", low: "Stock bajo", ok: "Stock correcto" };

const BASE = (process.env.NEXT_PUBLIC_INVENTORY_API_URL ?? "").replace(/\/$/, "") || "/api";

function url(path: string, params?: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) if (value !== undefined && value !== "") query.set(key, String(value));
  const suffix = query.toString();
  return `${BASE}/inventory${path}${suffix ? `?${suffix}` : ""}`;
}

async function post<T>(path: string, body: unknown, fallback: string): Promise<T> {
  const response = await apiFetch(url(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response, fallback);
}

export async function listSkus(warehouse?: Warehouse): Promise<Sku[]> {
  return parseResponse<Sku[]>(await apiFetch(url("/products", { warehouse })), "No se pudieron cargar los SKUs.");
}

export async function getSku(id: number): Promise<Sku> {
  return parseResponse<Sku>(await apiFetch(url(`/products/${id}`)), "No se pudo cargar el SKU.");
}

export async function listMovements(filters: { warehouse?: Warehouse; sku_id?: number } = {}): Promise<StockMovement[]> {
  return parseResponse<StockMovement[]>(await apiFetch(url("/orders", filters)), "No se pudieron cargar los movimientos.");
}

export function registerStockEntry(input: StockEntryInput): Promise<StockEntry> {
  return post<StockEntry>("/orders/inbound", input, "No se pudo registrar la entrada.");
}

export function registerStockExit(input: StockExitInput): Promise<StockExit> {
  return post<StockExit>("/orders/outbound", input, "No se pudo registrar la salida.");
}

export function skuOptionLabel(sku: Pick<Sku, "name" | "sku" | "warehouse">) {
  return `${sku.name} · ${sku.sku} · ${sku.warehouse}`;
}
