import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Helper to format dates in Cyprus/Athens timezone
const formatLocalDateTime = (dateString) => {
  try {
    if (!dateString) return 'N/A';
    
    // Force UTC interpretation by adding Z if not present
    let utcDateString = dateString;
    if (!dateString.endsWith('Z') && !dateString.includes('+')) {
      // Remove any existing timezone info and add Z
      utcDateString = dateString.replace(/[+-]\d{2}:\d{2}$/, '') + 'Z';
    }
    
    const utcDate = new Date(utcDateString);
    
    // Check if date is valid
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid date:', dateString);
      return 'Invalid Date';
    }
    
    return utcDate.toLocaleString('en-GB', {
      timeZone: 'Europe/Athens',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

export default function ViewMovementDialog({ open, onClose, movement, product, users }) {
  if (!movement) return null;

  const getUserName = (identifier) => {
    if (!identifier) return 'System';
    const user = users.find(u => u.id === identifier || u.email === identifier);
    return user?.full_name || user?.email || identifier;
  };

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
          {/* Movement Info */}
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

          {/* Product Info */}
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
            {!movement.base_quantity && movement.conversion_rate && movement.conversion_rate !== 1 && (
              <div>
                <Label className="text-slate-500">Base Quantity</Label>
                <p className="text-lg font-semibold mt-1 text-blue-600">
                  {(() => {
                    const qty = parseFloat(movement.quantity) || 0;
                    const convRate = parseFloat(movement.conversion_rate) || 1;
                    const bundleQty = parseFloat(movement.bundle_quantity) || null;
                    return bundleQty ? (qty * convRate * bundleQty).toFixed(2) : (qty * convRate).toFixed(2);
                  })()} {product?.unit_of_measure || ''}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Location Info */}
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

          {/* Personnel Info */}
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

          {/* Additional Info */}
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
                  <img
                    key={index}
                    src={photo.url}
                    alt={photo.filename}
                    className="rounded-lg border border-slate-200 w-full h-auto object-cover"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}