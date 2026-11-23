import { sampleCarriers, sampleProducts, sampleShipment } from "./data/sampleData";
import {
  calculateShippingCost,
  calculateTotalInventoryValue,
  countProductsByCategory,
  filterLowStockProducts,
  findProductBySKU,
  scoreCarrierForShipment,
  selectBestCarrier,
  validateShipment,
} from "./index";

const product = findProductBySKU(sampleProducts, sampleShipment.sku);
if (product === null) throw new Error(`Unknown SKU ${sampleShipment.sku}`);

console.log("Low stock:", filterLowStockProducts(sampleProducts).map((item) => item.sku));
console.log("Products by category:", countProductsByCategory(sampleProducts));
console.log("Total inventory value (USD):", calculateTotalInventoryValue(sampleProducts));
console.log("Shipment validation:", validateShipment(sampleShipment));
for (const carrier of sampleCarriers) {
  console.log(`${carrier.name}: score ${scoreCarrierForShipment(carrier, sampleShipment, product)}, cost ${calculateShippingCost(sampleShipment, product, carrier)}`);
}
const best = selectBestCarrier(sampleCarriers, sampleShipment, product);
console.log("Best carrier:", best ? `${best.carrier.name} (score ${best.score}, cost ${best.cost} USD)` : "none");
