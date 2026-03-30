import { base44 } from "@/api/base44Client";

/**
 * Recalculates stock for a product from all its movements.
 * Allows negative stock values (do NOT clamp to 0).
 * Keeps StockItems in sync as the single source of truth.
 */
export const recalculateStockForProduct = async (productId) => {
  const [allMovements, stockItemsForProduct] = await Promise.all([
    base44.entities.StockMovement.filter({ product_id: productId }),
    base44.entities.StockItem.filter({ product_id: productId })
  ]);

  const locationStocks = {};

  allMovements.forEach(mov => {
    const baseQty = mov.base_quantity ||
      (mov.quantity * (mov.conversion_rate || 1) * (mov.bundle_quantity || 1));

    if (mov.movement_type === 'IN' && mov.to_location) {
      locationStocks[mov.to_location] = (locationStocks[mov.to_location] || 0) + baseQty;
    } else if (mov.movement_type === 'OUT' && mov.from_location) {
      locationStocks[mov.from_location] = (locationStocks[mov.from_location] || 0) - baseQty;
    } else if (mov.movement_type === 'TRANSFER') {
      if (mov.from_location) {
        locationStocks[mov.from_location] = (locationStocks[mov.from_location] || 0) - baseQty;
      }
      if (mov.to_location) {
        locationStocks[mov.to_location] = (locationStocks[mov.to_location] || 0) + baseQty;
      }
    } else if (mov.movement_type === 'ADJUSTMENT') {
      const location = mov.to_location || mov.from_location;
      if (location) {
        locationStocks[location] = (locationStocks[location] || 0) + baseQty;
      }
    }
  });

  // Upsert StockItems — allow negative values, never clamp to 0
  for (const location in locationStocks) {
    const correctQuantity = locationStocks[location];
    const existingStock = stockItemsForProduct.find(
      si => si.product_id === productId && si.warehouse_location === location
    );

    if (existingStock) {
      await base44.entities.StockItem.update(existingStock.id, {
        quantity_on_hand: correctQuantity,
        last_counted_date: new Date().toISOString().split('T')[0]
      });
    } else {
      await base44.entities.StockItem.create({
        product_id: productId,
        warehouse_location: location,
        quantity_on_hand: correctQuantity,
        quantity_reserved: 0,
        last_counted_date: new Date().toISOString().split('T')[0]
      });
    }
  }

  // Remove StockItems for locations no longer in any movement
  for (const item of stockItemsForProduct) {
    if (!(item.warehouse_location in locationStocks)) {
      await base44.entities.StockItem.delete(item.id);
    }
  }
};