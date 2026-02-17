/**
 * Resolves vendor ID from a stock movement using multiple strategies.
 * 1. Direct vendor_id on the movement
 * 2. reference_type = 'Vendor' → reference_id is the vendor id
 * 3. reference_type = 'PurchaseOrder' → lookup PO → vendor_id
 * 4. movement.po_number → lookup PO by po_number → vendor_id
 * 5. Fallback: vendor_product_code + product_id → lookup ProductVendor
 */
export function resolveVendorId(movement, purchaseOrders = [], productVendors = []) {
  if (!movement) return null;

  if (movement.vendor_id) return movement.vendor_id;

  if (movement.reference_type === 'Vendor' && movement.reference_id)
    return movement.reference_id;

  if (movement.reference_type === 'PurchaseOrder' && movement.reference_id) {
    const po = purchaseOrders.find(p => p.id === movement.reference_id);
    if (po?.vendor_id) return po.vendor_id;
  }

  if (movement.po_number) {
    const po = purchaseOrders.find(p => p.po_number === movement.po_number);
    if (po?.vendor_id) return po.vendor_id;
  }

  if (movement.vendor_product_code && movement.product_id) {
    const pv = productVendors.find(
      pv => pv.product_id === movement.product_id && pv.vendor_product_code === movement.vendor_product_code
    );
    if (pv?.vendor_id) return pv.vendor_id;
  }

  return null;
}