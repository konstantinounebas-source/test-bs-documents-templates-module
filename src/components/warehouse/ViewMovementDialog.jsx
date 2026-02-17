import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Helper to format dates in Cyprus/Athens timezone
const formatLocalDateTime = (dateString) => {
  try {
    if (!dateString) return 'N/A';
    let utcDateString = dateString;
    if (!dateString.endsWith('Z') && !dateString.includes('+')) {
      utcDateString = dateString.replace(/[+-]\d{2}:\d{2}$/, '') + 'Z';
    }
    const utcDate = new Date(utcDateString);
    if (isNaN(utcDate.getTime())) return 'Invalid Date';
    return utcDate.toLocaleString('en-GB', {
      timeZone: 'Europe/Athens',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

const resolveVendorId = (movement, purchaseOrders, productVendors) => {
  // 1. Direct vendor_id
  if (movement.vendor_id) return movement.vendor_id;
  // 2. reference_type = 'Vendor'
  if (movement.reference_type === 'Vendor' && movement.reference_id) return movement.reference_id;
  // 3. reference_type = 'PurchaseOrder'
  if (movement.reference_type === 'PurchaseOrder' && movement.reference_id) {
    const po = purchaseOrders.find(p => p.id === movement.reference_id);
    if (po?.vendor_id) return po.vendor_id;
  }
  // 4. Has po_number (e.g. Invoice with PO)
  if (movement.po_number) {
    const po = purchaseOrders.find(p => p.po_number === movement.po_number);
    if (po?.vendor_id) return po.vendor_id;
  }
  // 5. Fallback: vendor_product_code via productVendors
  if (movement.vendor_product_code && movement.product_id) {
    const pv = productVendors.find(
      pv => pv.product_id === movement.product_id && pv.vendor_product_code === movement.vendor_product_code
    );
    if (pv?.vendor_id) return pv.vendor_id;
  }
  return null;
};

export default function ViewMovementDialog({ open, onClose, movement, product, users, vendors = [], purchaseOrders = [], productVendors = [] }) {
  if (!movement) return null;

  const getUserName = (identifier) => {
    if (!identifier) return 'System';
    const user = users.find(u => u.id === identifier || u.email === identifier);
    return user?.full_name || user?.email || identifier;
  };

  const getVendorName = (vendorId) => {
    if (!vendorId) return null;
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor?.name || null;
  };

  const resolvedVendorId = resolveVendorId(movement, purchaseOrders, productVendors);
  const vendorName = getVendorName(resolvedVendorId);

  const movementTypeColors = {
    IN: 'bg-green-100 text-green-800',
    OUT: 'bg-red-100 text-red-800',
    TRANSFER: 'bg-blue-100 text-blue-800',
    ADJUSTMENT: 'bg-orange-100 text-orange-800',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stock Movement Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-500">Type</Label>
              <Badge className={`mt-1 ${movementTypeColors[movement.movement_type] || 'bg-gray-100 text-gray-800'}`}>
                {movement.movement_type}
              </Badge>
            </div>
            <div>
              <Label className="text-slate-500">Date/Time (Cyprus)</Label>
              <p className="font-mono text-sm mt-1">{formatLocalDateTime(movement.created_date)}</p>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-slate-500">Product</Label>
            <div className="mt-1">
              <p className="font-medium">{product?.name || 'Unknown'}</p>
              <p className="text-sm text-slate-500 font-mono">{product?.sku || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-500">Quantity (Input)</Label>
              <p className="text-lg font-semibold mt-1">
                {movement.quantity} {movement.input_unit_of_measure || product?.unit_of_measure || ''}
              </p>
            </div>
            {movement.base_quantity && movement.base_quantity !== movement.quantity && (
              <div>
                <Label className="text-slate-500">Base Quantity</Label>
                <p className="text-lg font-semibold mt-1 text-blue-600">
                  {movement.base_quantity} {product?.unit_of_measure || ''}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-500">From Location</Label>
              <p className="mt-1">{movement.from_location || '-'}</p>
            </div>
            <div>
              <Label className="text-slate-500">To Location</Label>
              <p className="mt-1">{movement.to_location || '-'}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-500">Performed By</Label>
              <p className="mt-1">{getUserName(movement.performed_by)}</p>
            </div>
            {movement.charged_to_person && (
              <div>
                <Label className="text-slate-500">Charged To</Label>
                <p className="mt-1">{getUserName(movement.charged_to_person)}</p>
              </div>
            )}
          </div>

          <Separator />

          {vendorName && (
            <>
              <div>
                <Label className="text-slate-500">Vendor</Label>
                <p className="mt-1 font-medium">{vendorName}</p>
              </div>
              <Separator />
            </>
          )}

          {movement.movement_type === 'IN' && (movement.unit_cost || movement.base_unit_cost) && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {movement.unit_cost && (
                  <div>
                    <Label className="text-slate-500">Unit Cost (Input)</Label>
                    <p className="mt-1 font-semibold text-green-700">
                      €{Number(movement.unit_cost).toFixed(4)} / {movement.input_unit_of_measure || product?.unit_of_measure}
                    </p>
                  </div>
                )}
                {movement.base_unit_cost && (
                  <div>
                    <Label className="text-slate-500">Base Unit Cost</Label>
                    <p className="mt-1 font-semibold text-blue-700">
                      €{Number(movement.base_unit_cost).toFixed(4)} / {product?.unit_of_measure}
                    </p>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {movement.waybill_number && (
            <div>
              <Label className="text-slate-500">Waybill Number</Label>
              <p className="mt-1 font-mono">{movement.waybill_number}</p>
            </div>
          )}

          {movement.reference_type && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-500">Reference Type</Label>
                <p className="mt-1">{movement.reference_type}</p>
              </div>
              {movement.reference_id && (
                <div>
                  <Label className="text-slate-500">Reference ID</Label>
                  <p className="mt-1 font-mono text-sm">{movement.reference_id}</p>
                </div>
              )}
            </div>
          )}

          {movement.scanned_barcode && (
            <div>
              <Label className="text-slate-500">Scanned Barcode</Label>
              <p className="mt-1 font-mono">{movement.scanned_barcode}</p>
            </div>
          )}

          {movement.notes && (
            <div>
              <Label className="text-slate-500">Notes</Label>
              <p className="mt-1 text-slate-700 whitespace-pre-wrap">{movement.notes}</p>
            </div>
          )}

          {movement.photos && movement.photos.length > 0 && (
            <div>
              <Label className="text-slate-500">Photos</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {movement.photos.map((photo, index) => (
                  <img key={index} src={photo.url} alt={photo.filename}
                    className="rounded-lg border border-slate-200 w-full h-auto object-cover" />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}