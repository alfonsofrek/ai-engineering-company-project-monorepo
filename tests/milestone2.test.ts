import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sampleCarriers, sampleProducts, sampleShipment } from "../src/data/sampleData";
import {
  binarySearchProductByWeight, calculateAverageShipmentDistance, calculateShippingCost, calculateTotalInventoryValue,
  countProductsByCategory, filterLowStockProducts, filterProductsByCategory, filterProductsByWarehouse,
  findMostAndLeastStockedProducts, findProductBySKU, findShipmentById, findTopCarriers, groupShipmentsByStatus,
  scoreCarrierForShipment, selectBestCarrier, sortCarriersByReliability, sortProductsByStock, sortProductsByWeight,
  validateCarrier, validateProduct, validateShipment, type Shipment,
} from "../src/index";

const [shoe, laptop, perfume] = sampleProducts;
const [ups, seur, dhl] = sampleCarriers;

describe("collections", () => {
  it("filters by warehouse, category and low stock", () => {
    assert.deepEqual(filterProductsByWarehouse(sampleProducts, "Los Angeles").map((p) => p.sku), ["SHOE-BLK-42", "PERFUME-COCO-50"]);
    assert.deepEqual(filterProductsByCategory(sampleProducts, "Home"), []);
    assert.deepEqual(filterLowStockProducts(sampleProducts), [laptop]);
  });
  it("sorts without mutating the input", () => {
    const before = [...sampleProducts];
    assert.deepEqual(sortProductsByStock(sampleProducts, "desc").map((p) => p.stockQuantity), [120, 45, 8]);
    assert.deepEqual(sortCarriersByReliability(sampleCarriers, "asc").map((c) => c.id), ["CAR-UPS", "CAR-SEUR", "CAR-DHL"]);
    assert.deepEqual(sampleProducts, before);
  });
});

describe("search", () => {
  it("finds products case-insensitively and returns null when missing", () => {
    assert.equal(findProductBySKU(sampleProducts, "laptop-dell-15"), laptop);
    assert.equal(findProductBySKU([], "X"), null);
    assert.equal(findShipmentById([sampleShipment], "SH-2024-8821"), sampleShipment);
    assert.equal(findShipmentById([sampleShipment], "nope"), null);
  });
  it("binary searches by weight", () => {
    const sorted = sortProductsByWeight(sampleProducts);
    assert.equal(binarySearchProductByWeight(sorted, 2.3), 2);
    assert.equal(binarySearchProductByWeight(sorted, 1), -1);
    assert.equal(binarySearchProductByWeight([], 1), -1);
  });
});

describe("cost and scoring", () => {
  it("applies the priority surcharge and rounds to cents", () => {
    assert.equal(calculateShippingCost(sampleShipment, laptop, seur), 46.22); // (6.5 + 3.45 + 25.6) * 1.3
    assert.equal(calculateShippingCost({ ...sampleShipment, priority: "Standard" }, laptop, seur), 35.55);
    assert.equal(calculateShippingCost({ ...sampleShipment, priority: "Same-day" }, laptop, seur), 56.88);
  });
  it("scores each criterion", () => {
    assert.equal(scoreCarrierForShipment(seur, sampleShipment, laptop), 97.6);
    assert.equal(scoreCarrierForShipment(ups, sampleShipment, laptop), 76.4); // no Spain: -20
    assert.equal(scoreCarrierForShipment({ ...dhl, handlesFragile: false }, sampleShipment, laptop), 83.5);
    assert.equal(scoreCarrierForShipment({ ...dhl, handlesFragile: false }, sampleShipment, shoe), 98.5);
  });
  it("selects the cheapest suitable carrier, or null", () => {
    assert.equal(selectBestCarrier(sampleCarriers, sampleShipment, laptop)?.carrier.id, "CAR-UPS");
    const weak = { ...ups, operatesIn: ["United States" as const], maxWeightKg: 1, acceptsPriority: [], handlesFragile: false, onTimeRate: 50 };
    assert.equal(selectBestCarrier([weak], sampleShipment, laptop), null);
    assert.equal(selectBestCarrier([], sampleShipment, laptop), null);
  });
});

describe("reports", () => {
  const shipments: Shipment[] = [
    sampleShipment,
    { ...sampleShipment, id: "SH-2", carrier: "SEUR", status: "Delivered", destination: { ...sampleShipment.destination, distanceKm: 100 } },
    { ...sampleShipment, id: "SH-3", carrier: "SEUR", status: "In transit" },
    { ...sampleShipment, id: "SH-4", carrier: "UPS", status: "In transit" },
  ];
  it("counts, totals and averages", () => {
    assert.deepEqual(countProductsByCategory(sampleProducts), { Fashion: 1, Electronics: 1, Cosmetics: 1, Home: 0, Other: 0 });
    assert.equal(calculateTotalInventoryValue(sampleProducts), 16975);
    assert.equal(calculateAverageShipmentDistance(shipments), 265);
    assert.equal(calculateAverageShipmentDistance([]), 0);
    assert.deepEqual(findMostAndLeastStockedProducts(sampleProducts), { most: perfume, least: laptop });
    assert.equal(findMostAndLeastStockedProducts([]), null);
  });
  it("groups by status and ranks carriers", () => {
    const groups = groupShipmentsByStatus(shipments);
    assert.equal(groups["In transit"].length, 2);
    assert.deepEqual(groups.Failed, []);
    assert.deepEqual(findTopCarriers(shipments, 1), [{ carrier: "SEUR", count: 2 }]);
    assert.deepEqual(findTopCarriers(shipments, 5), [{ carrier: "SEUR", count: 2 }, { carrier: "UPS", count: 1 }]);
    assert.deepEqual(findTopCarriers([], 3), []);
  });
});

describe("validations", () => {
  it("accepts the sample data", () => {
    for (const product of sampleProducts) assert.deepEqual(validateProduct(product), { valid: true, errors: [] });
    for (const carrier of sampleCarriers) assert.equal(validateCarrier(carrier).valid, true);
    assert.equal(validateShipment(sampleShipment).valid, true);
  });
  it("rejects data that breaks the briefing rules", () => {
    const product = validateProduct({ ...shoe, sku: " ", weightKg: 101, dimensions: { lengthCm: 0, widthCm: 201, heightCm: 10 }, stockQuantity: -1, unitCostUSD: 0 });
    assert.equal(product.valid, false);
    assert.equal(product.errors.length, 6);
    assert.equal(validateShipment({ ...sampleShipment, quantity: 0, declaredValueUSD: 0, destination: { ...sampleShipment.destination, distanceKm: -1 } }).errors.length, 3);
    assert.equal(validateCarrier({ ...ups, onTimeRate: 101, operatesIn: [], avgDeliveryDays: 0, ratePerKmUSD: -1 }).errors.length, 4);
  });
});
