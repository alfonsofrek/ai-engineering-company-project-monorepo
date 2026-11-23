import type { Carrier, Product, Shipment, ValidationResult } from "../types/models";

function toResult(errors: string[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

export function validateProduct(product: Product): ValidationResult {
  const errors: string[] = [];
  if (!product.sku || product.sku.trim() === "") errors.push("sku must not be empty");
  if (!(product.weightKg > 0 && product.weightKg <= 100)) errors.push("weightKg must be > 0 and <= 100");
  const { lengthCm, widthCm, heightCm } = product.dimensions ?? { lengthCm: NaN, widthCm: NaN, heightCm: NaN };
  for (const [name, value] of [["lengthCm", lengthCm], ["widthCm", widthCm], ["heightCm", heightCm]] as const) {
    if (!(value > 0 && value <= 200)) errors.push(`dimensions.${name} must be > 0 and <= 200`);
  }
  if (!(product.stockQuantity >= 0)) errors.push("stockQuantity must be >= 0");
  if (!(product.minStockThreshold >= 0)) errors.push("minStockThreshold must be >= 0");
  if (!(product.unitCostUSD > 0)) errors.push("unitCostUSD must be > 0");
  return toResult(errors);
}

export function validateShipment(shipment: Shipment): ValidationResult {
  const errors: string[] = [];
  if (!(shipment.quantity > 0)) errors.push("quantity must be > 0");
  if (!(shipment.declaredValueUSD > 0)) errors.push("declaredValueUSD must be > 0");
  if (!(shipment.destination?.distanceKm >= 0)) errors.push("destination.distanceKm must be >= 0");
  return toResult(errors);
}

export function validateCarrier(carrier: Carrier): ValidationResult {
  const errors: string[] = [];
  if (!(carrier.baseRateUSD >= 0)) errors.push("baseRateUSD must be >= 0");
  if (!(carrier.ratePerKgUSD >= 0)) errors.push("ratePerKgUSD must be >= 0");
  if (!(carrier.ratePerKmUSD >= 0)) errors.push("ratePerKmUSD must be >= 0");
  if (!(carrier.avgDeliveryDays > 0)) errors.push("avgDeliveryDays must be > 0");
  if (!(carrier.onTimeRate >= 0 && carrier.onTimeRate <= 100)) errors.push("onTimeRate must be between 0 and 100");
  if (!(carrier.maxWeightKg > 0)) errors.push("maxWeightKg must be > 0");
  if (!Array.isArray(carrier.operatesIn) || carrier.operatesIn.length < 1) errors.push("operatesIn must contain at least 1 country");
  return toResult(errors);
}
