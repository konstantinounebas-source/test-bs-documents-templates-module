import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Tag, Barcode, Clock, AlertTriangle, Download, Printer, QrCode, Loader2, Edit2, Save, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import ProductVendorsManager from "./ProductVendorsManager";
import { toast } from "sonner";

export default function ViewProductDialog({ open, onClose, product, categories, vendors, stockItems, onEditMovement, onUpdate }) {
  const [productVendors, setProductVendors] = useState([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isEditingUnitCost, setIsEditingUnitCost] = useState(false);
  const [manualUnitCost, setManualUnitCost] = useState('');

  useEffect(() => {
    if (product?.id && open) {
      loadProductVendors();
    }
  }, [product?.id, open]);

  const [currentProduct, setCurrentProduct] = useState(null);

  const handleEditUnitCost = () => {
    setManualUnitCost(currentProduct?.unit_cost?.toString() || '');
    setIsEditingUnitCost(true);
  };

  const handleSaveUnitCost = async () => {
    const newCost = parseFloat(manualUnitCost);
    if (isNaN(newCost) || newCost < 0) {
      toast.error("Μη έγκυρη τιμή κόστους");
      return;
    }

    try {
      await base44.entities.Product.update(product.id, {
        unit_cost: newCost
      });
      
      toast.success("Το κόστος μονάδας ενημερώθηκε επιτυχώς");
      setIsEditingUnitCost(false);
      
      if (onUpdate) await onUpdate();
      await loadProductVendors();
    } catch (error) {
      console.error("Error updating unit cost:", error);
      toast.error("Σφάλμα κατά την ενημέρωση του κόστους");
    }
  };

  const handleCancelEditUnitCost = () => {
    setIsEditingUnitCost(false);
    setManualUnitCost('');
  };

  const handleResetToAverage = async () => {
    try {
      // Recalculate average from all IN movements (without affecting total_cost_paid/total_quantity_purchased)
      const allMovements = await base44.entities.StockMovement.filter({
        product_id: product.id,
        movement_type: 'IN'
      });
      
      let totalCost = 0;
      let totalQty = 0;
      
      allMovements.forEach(movement => {
        if (movement.unit_cost && movement.unit_cost > 0 && movement.quantity > 0) {
          totalCost += movement.quantity * movement.unit_cost;
          totalQty += movement.quantity;
        }
      });
      
      const averageUnitCost = totalQty > 0 ? totalCost / totalQty : 0;
      
      // Update only unit_cost, not the tracking fields
      await base44.entities.Product.update(product.id, {
        unit_cost: averageUnitCost
      });
      
      toast.success("Το κόστος επανήλθε στο μέσο όρο");
      
      if (onUpdate) await onUpdate();
      await loadProductVendors();
    } catch (error) {
      console.error("Error resetting to average:", error);
      toast.error("Σφάλμα κατά την επαναφορά");
    }
  };

  const recalculateAverages = async () => {
    setIsRecalculating(true);
    try {
      // Get all IN movements for this product
      const inMovements = await base44.entities.StockMovement.filter({
        product_id: product.id,
        movement_type: 'IN'
      });
      
      // Calculate totals from actual movements
      let totalCost = 0;
      let totalQty = 0;
      let lastUnitCost = 0;
      let lastDate = null;
      
      inMovements.forEach(movement => {
        if (movement.unit_cost && movement.unit_cost > 0 && movement.quantity > 0) {
          totalCost += movement.quantity * movement.unit_cost;
          totalQty += movement.quantity;
          
          const movementDate = new Date(movement.created_date);
          if (!lastDate || movementDate > lastDate) {
            lastDate = movementDate;
            lastUnitCost = movement.unit_cost;
          }
        }
      });
      
      const averageUnitCost = totalQty > 0 ? totalCost / totalQty : 0;
      
      // Update product with correct values
      await base44.entities.Product.update(product.id, {
        total_cost_paid: totalCost,
        total_quantity_purchased: totalQty,
        unit_cost: averageUnitCost,
        last_unit_cost: lastUnitCost
      });
      
      toast.success("Οι υπολογισμοί ενημερώθηκαν επιτυχώς");
      
      // Reload data
      await loadProductVendors();
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error("Error recalculating averages:", error);
      toast.error("Σφάλμα κατά τον επαναϋπολογισμό");
    }
    setIsRecalculating(false);
  };

  const loadProductVendors = async () => {
    setIsLoadingVendors(true);
    try {
      // Reload product to get latest preferred_vendor_id and unit_cost calculations
      const products = await base44.entities.Product.filter({ id: product.id });
      if (products.length > 0) {
        setCurrentProduct(products[0]);
      }
      
      const pvData = await base44.entities.ProductVendor.filter({ product_id: product.id });
      setProductVendors(pvData);
    } catch (error) {
      console.error("Error loading product vendors:", error);
    }
    setIsLoadingVendors(false);
  };

  if (!product) return null;

  const category = categories.find(c => c.id === product.category_id);
  const productStock = stockItems.filter(s => s.product_id === product.id);
  
  const totalStock = productStock.reduce((sum, item) => sum + (item.quantity_on_hand || 0), 0);
  const reservedStock = productStock.reduce((sum, item) => sum + (item.quantity_reserved || 0), 0);
  const availableStock = totalStock - reservedStock;
  const isLowStock = availableStock < (product.minimum_stock || 0);

  const preferredVendor = productVendors.find(pv => pv.is_preferred);
  const preferredVendorData = preferredVendor ? vendors.find(v => v.id === preferredVendor.vendor_id) : null;

  const getQRCodeUrl = (data, size = 200) => {
    const encodedData = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;
  };

  const getBarcodeUrl = (code, size = 2) => {
    return `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(code)}&code=EAN13&multiplebarcodes=false&translate-esc=false&unit=Fit&dpi=96&imagetype=Gif&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0`;
  };

  const handlePrintCode = (type) => {
    const printWindow = window.open('', '_blank');
    const code = type === 'qr' ? product.qr_code : product.barcode;
    const codeUrl = type === 'qr' ? getQRCodeUrl(code, 400) : getBarcodeUrl(code);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print ${type === 'qr' ? 'QR Code' : 'Barcode'} - ${product.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .code-container {
            text-align: center;
            border: 2px solid #ddd;
            padding: 30px;
            border-radius: 10px;
            background: white;
          }
          img {
            max-width: 100%;
            height: auto;
            margin: 20px 0;
          }
          h2 {
            margin: 0 0 10px 0;
            color: #1e293b;
          }
          .sku {
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            margin: 10px 0;
            color: #475569;
          }
          .code-value {
            font-family: monospace;
            font-size: 14px;
            color: #64748b;
            margin-top: 10px;
          }
          @media print {
            body {
              background: white;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="code-container">
          <h2>${product.name}</h2>
          <div class="sku">SKU: ${product.sku}</div>
          <img src="${codeUrl}" alt="${type === 'qr' ? 'QR Code' : 'Barcode'}" />
          <div class="code-value">${code}</div>
        </div>
        <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px; cursor: pointer;">
          Print
        </button>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadCode = (type) => {
    const code = type === 'qr' ? product.qr_code : product.barcode;
    const codeUrl = type === 'qr' ? getQRCodeUrl(code, 400) : getBarcodeUrl(code);
    
    const link = document.createElement('a');
    link.href = codeUrl;
    link.download = `${product.sku}_${type === 'qr' ? 'qrcode' : 'barcode'}.${type === 'qr' ? 'png' : 'gif'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {product.name}
              </DialogTitle>
              <DialogDescription>Product Details</DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={recalculateAverages}
              disabled={isRecalculating}
            >
              {isRecalculating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Υπολογισμός...
                </>
              ) : (
                "Επαναϋπολογισμός Μέσου Όρου"
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">SKU</p>
                <p className="font-mono font-semibold">{product.sku}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <Badge className={product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {product.description && (
              <div>
                <p className="text-sm text-slate-500">Description</p>
                <p className="text-sm">{product.description}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Category & Preferred Vendor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Tag className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">Category</p>
                <p className="font-medium">{category?.name || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">Preferred Vendor</p>
                <p className="font-medium">{preferredVendorData?.name || 'Not set'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Unit Cost - Editable */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Ενεργό Κόστος Μονάδας Προϊόντος</h3>
              {!isEditingUnitCost && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetToAverage}
                  >
                    Επαναφορά στο Μέσο Όρο
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditUnitCost}
                  >
                    <Edit2 className="w-3 h-3 mr-2" />
                    Επεξεργασία
                  </Button>
                </div>
              )}
            </div>

            {isEditingUnitCost ? (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="manual_unit_cost">Κόστος ανά {product.unit_of_measure} (€)</Label>
                  <Input
                    id="manual_unit_cost"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={manualUnitCost}
                    onChange={(e) => setManualUnitCost(e.target.value)}
                    placeholder="0.0000"
                  />
                </div>
                <Button
                  variant="default"
                  size="icon"
                  onClick={handleSaveUnitCost}
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCancelEditUnitCost}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700">Τρέχον Unit Cost</p>
                    <p className="text-xs text-green-600 mt-1">
                      Μπορείτε να το αλλάξετε χειροκίνητα ή αφήνεται στον μέσο όρο
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-900">
                      {currentProduct?.unit_cost && currentProduct.unit_cost > 0 ? (
                        <>€{currentProduct.unit_cost.toFixed(4)}</>
                      ) : (
                        <span className="text-slate-400">€0.0000</span>
                      )}
                    </p>
                    <p className="text-xs text-green-700">ανά {product.unit_of_measure}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Stock Information */}
          <div>
            <h3 className="font-semibold mb-3">Stock Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Total Stock</p>
                <p className="text-lg font-semibold">{totalStock} {product.unit_of_measure}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Reserved</p>
                <p className="text-lg font-semibold text-orange-600">{reservedStock} {product.unit_of_measure}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Available</p>
                <p className={`text-lg font-semibold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                  {availableStock} {product.unit_of_measure}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Minimum Stock</p>
                <p className="text-lg font-semibold">{product.minimum_stock || 0} {product.unit_of_measure}</p>
              </div>
            </div>

            {isLowStock && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-800">Stock level is below minimum stock</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Stock Locations */}
          {productStock.length > 0 && (
            <>
              <div>
                <h3 className="font-semibold mb-3">Stock Locations</h3>
                <div className="space-y-2">
                  {productStock.map((stock, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <p className="font-medium">{stock.warehouse_location}</p>
                        <div className="text-right">
                          <p className="text-sm">
                            On Hand: <span className="font-semibold">{stock.quantity_on_hand}</span>
                          </p>
                          <p className="text-sm text-orange-600">
                            Reserved: <span className="font-semibold">{stock.quantity_reserved}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Product Vendors */}
          <ProductVendorsManager 
            product={currentProduct || product} 
            vendors={vendors}
            onUpdate={loadProductVendors}
            onEditMovement={onEditMovement}
          />

          {/* Barcodes / QR Codes */}
          {(product.barcode || product.qr_code) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Scannable Codes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.barcode && (
                    <Card className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Barcode className="w-4 h-4 text-slate-600" />
                          <p className="font-semibold text-sm">Barcode</p>
                        </div>
                        <div className="bg-white p-3 rounded border mb-3 flex items-center justify-center">
                          <img 
                            src={getBarcodeUrl(product.barcode)} 
                            alt="Barcode" 
                            className="max-w-full h-auto"
                          />
                        </div>
                        <p className="text-xs font-mono text-center text-slate-600 mb-3">{product.barcode}</p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => handlePrintCode('barcode')}
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            Print
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => handleDownloadCode('barcode')}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {product.qr_code && (
                    <Card className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <QrCode className="w-4 h-4 text-slate-600" />
                          <p className="font-semibold text-sm">QR Code</p>
                        </div>
                        <div className="bg-white p-3 rounded border mb-3 flex items-center justify-center">
                          <img 
                            src={getQRCodeUrl(product.qr_code, 200)} 
                            alt="QR Code" 
                            className="w-full max-w-[200px] h-auto"
                          />
                        </div>
                        <p className="text-xs font-mono text-center text-slate-600 mb-3 line-clamp-2">{product.qr_code}</p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => handlePrintCode('qr')}
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            Print
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => handleDownloadCode('qr')}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}