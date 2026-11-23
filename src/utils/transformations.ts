import {
  PRODUCT_CATEGORIES,
  SHIPMENT_STATUSES,
  type Carrier,
  type CarrierSelection,
  type CarrierUsage,
  type Product,
  type ProductCategory,
  type Shipment,
  type ShipmentPriority,
  type ShipmentStatus,
} from "../types/models";

const PRIORITY_SURCHARGE: Record<ShipmentPriority, number> = { Standard: 0, Express: 0.3, "Same-day": 0.6 };
const MIN_SUITABLE_SCORE = 50;

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

// --- Carrier scoring and shipping cost ---

export function calculateShippingCost(shipment: Shipment, product: Product, carrier: Carrier): number {
  const weightCost = product.weightKg * carrier.ratePerKgUSD * shipment.quantity;
  const distanceCost = shipment.destination.distanceKm * carrier.ratePerKmUSD;
  const subtotal = carrier.baseRateUSD + weightCost + distanceCost;
  return roundToCents(subtotal * (1 + PRIORITY_SURCHARGE[shipment.priority]));
}

export function scoreCarrierForShipment(carrier: Carrier, shipment: Shipment, product: Product): number {
  const countryPoints = carrier.operatesIn.includes(shipment.destination.country) ? 20 : 0;
  const weightPoints = product.weightKg * shipment.quantity <= carrier.maxWeightKg ? 20 : 0;
  const priorityPoints = carrier.acceptsPriority.includes(shipment.priority) ? 15 : 0;
  const fragilePoints = !product.isFragile || carrier.handlesFragile ? 15 : 0;
  const reliabilityPoints = carrier.onTimeRate * 0.3;
  return roundToCents(countryPoints + weightPoints + priorityPoints + fragilePoints + reliabilityPoints);
}

export function selectBestCarrier(carriers: Carrier[], shipment: Shipment, product: Product): CarrierSelection | null {
  let best: CarrierSelection | null = null;
  for (const carrier of carriers) {
    const score = scoreCarrierForShipment(carrier, shipment, product);
    if (score < MIN_SUITABLE_SCORE) continue;
    const cost = calculateShippingCost(shipment, product, carrier);
    if (best === null || cost < best.cost) best = { carrier, score, cost };
  }
  return best;
}

// --- Aggregations and reports ---

export function countProductsByCategory(products: Product[]): Record<ProductCategory, number> {
  const counts = Object.fromEntries(PRODUCT_CATEGORIES.map((category) => [category, 0])) as Record<ProductCategory, number>;
  for (const product of products) counts[product.category] += 1;
  return counts;
}

export function calculateTotalInventoryValue(products: Product[]): number {
  return roundToCents(products.reduce((total, product) => total + product.stockQuantity * product.unitCostUSD, 0));
}

export function calculateAverageShipmentDistance(shipments: Shipment[]): number {
  if (shipments.length === 0) return 0;
  const totalKm = shipments.reduce((total, shipment) => total + shipment.destination.distanceKm, 0);
  return roundToCents(totalKm / shipments.length);
}

export function groupShipmentsByStatus(shipments: Shipment[]): Record<ShipmentStatus, Shipment[]> {
  const groups = Object.fromEntries(SHIPMENT_STATUSES.map((status) => [status, [] as Shipment[]])) as Record<ShipmentStatus, Shipment[]>;
  for (const shipment of shipments) groups[shipment.status].push(shipment);
  return groups;
}

export function findTopCarriers(shipments: Shipment[], topN: number): CarrierUsage[] {
  if (topN <= 0) return [];
  const usage = new Map<string, number>();
  for (const shipment of shipments) {
    if (shipment.carrier !== null) usage.set(shipment.carrier, (usage.get(shipment.carrier) ?? 0) + 1);
  }
  return [...usage.entries()]
    .map(([carrier, count]) => ({ carrier, count }))
    .sort((a, b) => b.count - a.count || a.carrier.localeCompare(b.carrier))
    .slice(0, topN);
}

/** Extreme values for the warehouse report; null when the list is empty. */
export function findMostAndLeastStockedProducts(products: Product[]): { most: Product; least: Product } | null {
  if (products.length === 0) return null;
  let most = products[0];
  let least = products[0];
  for (const product of products) {
    if (product.stockQuantity > most.stockQuantity) most = product;
    if (product.stockQuantity < least.stockQuantity) least = product;
  }
  return { most, least };
}
