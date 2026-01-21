import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Eye, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ImportStockMovementsDialog({ open, onClose, onMovementsImported, products }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const recalculateStockForProduct = async (productId) => {
    try {
      const allMovements = await base44.entities.StockMovement.filter({ product_id: productId });
      const stockItemsForProduct = await base44.entities.StockItem.filter({ product_id: productId });
      
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
      
      for (const location in locationStocks) {
        const existingStock = stockItemsForProduct.find(si => si.warehouse_location === location);
        const correctQuantity = Math.max(0, locationStocks[location]);
        
        if (existingStock) {
          await base44.entities.StockItem.update(existingStock.id, {
            quantity_on_hand: correctQuantity,
            last_counted_date: new Date().toISOString().split('T')[0]
          });
        } else if (correctQuantity > 0) {
          await base44.entities.StockItem.create({
            product_id: productId,
            warehouse_location: location,
            quantity_on_hand: correctQuantity,
            quantity_reserved: 0,
            last_counted_date: new Date().toISOString().split('T')[0]
          });
        }
      }

      for (const item of stockItemsForProduct) {
        if (!locationStocks[item.warehouse_location] || locationStocks[item.warehouse_location] <= 0) {
          await base44.entities.StockItem.delete(item.id);
        }
      }
    } catch (error) {
      console.error('Error recalculating stock:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        setError('Please select a CSV file.');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResults(null);
      setPreviewData(null);
      setShowPreview(false);
    }
  };

  const downloadTemplate = () => {
    const templateHeaders = [
      'product_sku',
      'movement_type',
      'quantity',
      'from_location',
      'to_location',
      'reference_type',
      'reference_id',
      'performed_by',
      'notes',
      'movement_date'
    ];

    const exampleData = [
      {
        product_sku: 'ROOF-PC-2x1.5',
        movement_type: 'IN',
        quantity: '50',
        from_location: '',
        to_location: 'Warehouse A - Shelf 3B',
        reference_type: 'PurchaseOrder',
        reference_id: 'PO-2025-001',
        performed_by: 'user@example.com',
        notes: 'Initial stock from supplier',
        movement_date: '2025-01-15'
      },
      {
        product_sku: 'LED-STRIP-5M',
        movement_type: 'TRANSFER',
        quantity: '20',
        from_location: 'Warehouse A - Shelf 1A',
        to_location: 'Warehouse B - Zone 2',
        reference_type: 'Manual',
        reference_id: '',
        performed_by: 'user@example.com',
        notes: 'Transfer for installation project',
        movement_date: '2025-01-16'
      },
      {
        product_sku: 'ROOF-PC-2x1.5',
        movement_type: 'OUT',
        quantity: '10',
        from_location: 'Warehouse A - Shelf 3B',
        to_location: '',
        reference_type: 'BusStopOrder',
        reference_id: 'BSO-2025-123',
        performed_by: 'user@example.com',
        notes: 'Used for bus stop installation',
        movement_date: '2025-01-17'
      }
    ];

    const csvContent = [
      templateHeaders.join(','),
      ...exampleData.map(row =>
        templateHeaders.map(header => {
          let cell = row[header] || '';
          if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'stock_movements_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePreview = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProgress(25);

    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      setProgress(50);

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: {
          type: "object",
          properties: {
            movements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_sku: { type: "string" },
                  movement_type: { type: "string" },
                  quantity: { type: "number" },
                  from_location: { type: "string" },
                  to_location: { type: "string" },
                  reference_type: { type: "string" },
                  reference_id: { type: "string" },
                  performed_by: { type: "string" },
                  notes: { type: "string" },
                  movement_date: { type: "string" }
                },
                required: ["product_sku", "movement_type", "quantity"]
              }
            }
          }
        }
      });

      setProgress(100);

      if (extractResult.status === 'success' && extractResult.output) {
        let movements = extractResult.output.movements || [];
        if (Array.isArray(extractResult.output)) {
          movements = extractResult.output;
        }

        setPreviewData(movements);
        setShowPreview(true);
      } else {
        setError('Failed to extract movement data from file. Please check the file format.');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError('Failed to preview file. Please try again.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleImport = async () => {
    if (!previewData || previewData.length === 0) {
      setError('No data to import.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProgress(0);

    try {
      const currentUser = await base44.auth.me();
      
      // ✅ Load current stock to validate availability
      const currentStock = await base44.entities.StockItem.list();
      
      const successfulImports = [];
      const failedImports = [];

      for (let i = 0; i < previewData.length; i++) {
        try {
          const movementData = previewData[i];

          // Find product by SKU
          const product = products.find(p => p.sku === movementData.product_sku);
          if (!product) {
            throw new Error(`Product with SKU "${movementData.product_sku}" not found`);
          }

          // Validate movement type
          if (!['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'].includes(movementData.movement_type)) {
            throw new Error(`Invalid movement type: ${movementData.movement_type}`);
          }

          // ✅ CHECK AVAILABLE STOCK FOR OUT AND TRANSFER
          if (movementData.movement_type === 'OUT' || movementData.movement_type === 'TRANSFER') {
            if (!movementData.from_location) {
              throw new Error(`From location is required for ${movementData.movement_type} movement`);
            }

            const stockAtLocation = currentStock.find(
              s => s.product_id === product.id && s.warehouse_location === movementData.from_location
            );

            const availableStock = stockAtLocation 
              ? (stockAtLocation.quantity_on_hand || 0) - (stockAtLocation.quantity_reserved || 0)
              : 0;

            if (availableStock < movementData.quantity) {
              throw new Error(
                `Insufficient stock at ${movementData.from_location}. ` +
                `Available: ${availableStock}, Required: ${movementData.quantity}`
              );
            }
          }

          const newMovementData = {
            product_id: product.id,
            movement_type: movementData.movement_type,
            quantity: movementData.quantity || 0,
            from_location: movementData.from_location || null,
            to_location: movementData.to_location || null,
            reference_type: movementData.reference_type || null,
            reference_id: movementData.reference_id || null,
            performed_by: movementData.performed_by || currentUser.email,
            notes: movementData.notes || null
          };

          // Create movement
          await base44.entities.StockMovement.create(newMovementData);
          
          // Recalculate stock for this product
          await recalculateStockForProduct(product.id);

          successfulImports.push(product.sku);

        } catch (movementError) {
          console.error(`Failed to import movement ${i + 1}:`, movementError);
          failedImports.push({
            movement: previewData[i],
            error: movementError.message || 'Unknown error'
          });
        }

        setProgress(Math.round(((i + 1) / previewData.length) * 100));
      }

      setResults({
        successful: successfulImports.length,
        failed: failedImports.length,
        failures: failedImports
      });

      if (successfulImports.length > 0) {
        onMovementsImported();
      }

    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to import movements. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError('');
    setResults(null);
    setPreviewData(null);
    setShowPreview(false);
    setProgress(0);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Stock Movements from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements</h4>
            <p className="text-sm text-blue-800 mb-3">
              Download the template below to get started with the correct format.
            </p>

            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="mb-3"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>

            <div className="text-xs text-blue-700 space-y-1">
              <p><strong>Required:</strong> product_sku, movement_type (IN/OUT/TRANSFER/ADJUSTMENT), quantity</p>
              <p><strong>Optional:</strong> from_location, to_location, reference_type, reference_id, performed_by (email), notes, movement_date</p>
              <p><strong>Rules:</strong></p>
              <ul className="list-disc ml-5 space-y-1">
                <li>IN: requires to_location</li>
                <li>OUT: requires from_location</li>
                <li>TRANSFER: requires both from_location and to_location</li>
                <li>product_sku must match existing products</li>
                <li>For OUT/TRANSFER movements, sufficient stock must be available at the 'from_location'.</li>
              </ul>
            </div>
          </div>

          {!showPreview && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Select CSV File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="mt-2"
                />
              </div>

              {file && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="w-4 h-4" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
          )}

          {showPreview && previewData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold">Preview: {previewData.length} movements found</h4>
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-2 border-b">SKU</th>
                      <th className="text-left p-2 border-b">Type</th>
                      <th className="text-left p-2 border-b">Qty</th>
                      <th className="text-left p-2 border-b">From</th>
                      <th className="text-left p-2 border-b">To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((movement, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-mono text-xs">{movement.product_sku}</td>
                        <td className="p-2">
                          <Badge className={
                            movement.movement_type === 'IN' ? 'bg-green-100 text-green-800' :
                            movement.movement_type === 'OUT' ? 'bg-red-100 text-red-800' :
                            movement.movement_type === 'TRANSFER' ? 'bg-blue-100 text-blue-800' :
                            'bg-orange-100 text-orange-800'
                          }>
                            {movement.movement_type}
                          </Badge>
                        </td>
                        <td className="p-2">{movement.quantity}</td>
                        <td className="p-2 text-xs">{movement.from_location || '-'}</td>
                        <td className="p-2 text-xs">{movement.to_location || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="p-2 text-center text-xs text-slate-500 bg-slate-50">
                    ... and {previewData.length - 10} more movements
                  </div>
                )}
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">
                  {showPreview ? 'Importing movements...' : 'Processing file...'}
                </span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Import completed! {results.successful} movements imported successfully.
                  {results.failed > 0 && ` ${results.failed} movements failed to import.`}
                </AlertDescription>
              </Alert>

              {results.failures && results.failures.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-700">Failed Imports:</h4>
                  <div className="max-h-32 overflow-y-auto">
                    {results.failures.map((failure, index) => (
                      <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                        <strong>{failure.movement.product_sku || `Movement ${index + 1}`}:</strong> {failure.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              {results ? 'Close' : 'Cancel'}
            </Button>

            {!showPreview && !results && (
              <Button
                onClick={handlePreview}
                disabled={!file || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </>
                )}
              </Button>
            )}

            {showPreview && !results && (
              <Button
                onClick={handleImport}
                disabled={isProcessing || !previewData || previewData.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {previewData?.length || 0} Movements
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}