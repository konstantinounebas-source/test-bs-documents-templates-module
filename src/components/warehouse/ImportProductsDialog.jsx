import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Eye, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ImportProductsDialog({ open, onClose, onProductsImported, categories, vendors }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

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
      'name',
      'sku',
      'description',
      'category_code',
      'vendor_code',
      'unit_of_measure',
      'unit_cost',
      'barcode',
      'qr_code',
      'minimum_stock',
      'lead_time_days',
      'is_active'
    ];

    const exampleData = [
      {
        name: 'Roof Panel 2x1.5m',
        sku: 'ROOF-PC-2x1.5',
        description: 'Polycarbonate roof panel 2x1.5 meters',
        category_code: 'ROOF',
        vendor_code: 'VEND-001',
        unit_of_measure: 'piece',
        unit_cost: '45.50',
        barcode: '2001234567890',
        qr_code: '',
        minimum_stock: '10',
        lead_time_days: '14',
        is_active: 'true'
      },
      {
        name: 'LED Light Strip 5m',
        sku: 'LED-STRIP-5M',
        description: 'LED strip light 5 meters white',
        category_code: 'ELEC',
        vendor_code: 'VEND-002',
        unit_of_measure: 'meter',
        unit_cost: '12.30',
        barcode: '2009876543210',
        qr_code: '',
        minimum_stock: '20',
        lead_time_days: '7',
        is_active: 'true'
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
    link.setAttribute('download', 'products_import_template.csv');
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
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  sku: { type: "string" },
                  description: { type: "string" },
                  category_code: { type: "string" },
                  vendor_code: { type: "string" },
                  unit_of_measure: { type: "string" },
                  unit_cost: { type: "number" },
                  barcode: { type: "string" },
                  qr_code: { type: "string" },
                  minimum_stock: { type: "number" },
                  lead_time_days: { type: "number" },
                  is_active: { type: "boolean" }
                },
                required: ["name", "sku", "category_code", "vendor_code"]
              }
            }
          }
        }
      });

      setProgress(100);

      if (extractResult.status === 'success' && extractResult.output) {
        let products = extractResult.output.products || [];
        if (Array.isArray(extractResult.output)) {
          products = extractResult.output;
        }

        setPreviewData(products);
        setShowPreview(true);
      } else {
        setError('Failed to extract product data from file. Please check the file format.');
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
      const successfulImports = [];
      const failedImports = [];

      for (let i = 0; i < previewData.length; i++) {
        try {
          const productData = previewData[i];

          // Find category by code
          const category = categories.find(c => c.code === productData.category_code);
          if (!category) {
            throw new Error(`Category with code "${productData.category_code}" not found`);
          }

          // Find vendor by code
          const vendor = vendors.find(v => v.code === productData.vendor_code);
          if (!vendor) {
            throw new Error(`Vendor with code "${productData.vendor_code}" not found`);
          }

          const newProductData = {
            name: productData.name,
            sku: productData.sku,
            description: productData.description || '',
            category_id: category.id,
            vendor_id: vendor.id,
            unit_of_measure: ['piece', 'meter', 'kg', 'liter', 'box', 'pallet'].includes(productData.unit_of_measure) 
              ? productData.unit_of_measure 
              : 'piece',
            unit_cost: productData.unit_cost || 0,
            barcode: productData.barcode || '',
            qr_code: productData.qr_code || '',
            minimum_stock: productData.minimum_stock || 0,
            lead_time_days: productData.lead_time_days || 14,
            is_active: typeof productData.is_active === 'boolean' ? productData.is_active : true
          };

          const newProduct = await base44.entities.Product.create(newProductData);
          successfulImports.push(newProduct);

        } catch (productError) {
          console.error(`Failed to import product ${i + 1}:`, productError);
          failedImports.push({
            product: previewData[i],
            error: productError.message || 'Unknown error'
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
        onProductsImported();
      }

    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to import products. Please try again.');
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
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
              <p><strong>Required:</strong> name, sku, category_code, vendor_code</p>
              <p><strong>Optional:</strong> description, unit_of_measure (piece/meter/kg/liter/box/pallet), unit_cost, barcode, qr_code, minimum_stock, lead_time_days, is_active (true/false)</p>
              <p><strong>Note:</strong> category_code and vendor_code must match existing records</p>
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
                <h4 className="font-semibold">Preview: {previewData.length} products found</h4>
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-2 border-b">SKU</th>
                      <th className="text-left p-2 border-b">Name</th>
                      <th className="text-left p-2 border-b">Category</th>
                      <th className="text-left p-2 border-b">Vendor</th>
                      <th className="text-left p-2 border-b">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((product, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-mono text-xs">{product.sku}</td>
                        <td className="p-2">{product.name}</td>
                        <td className="p-2">{product.category_code}</td>
                        <td className="p-2">{product.vendor_code}</td>
                        <td className="p-2">€{product.unit_cost || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="p-2 text-center text-xs text-slate-500 bg-slate-50">
                    ... and {previewData.length - 10} more products
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
                  {showPreview ? 'Importing products...' : 'Processing file...'}
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
                  Import completed! {results.successful} products imported successfully.
                  {results.failed > 0 && ` ${results.failed} products failed to import.`}
                </AlertDescription>
              </Alert>

              {results.failures && results.failures.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-700">Failed Imports:</h4>
                  <div className="max-h-32 overflow-y-auto">
                    {results.failures.map((failure, index) => (
                      <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                        <strong>{failure.product.sku || `Product ${index + 1}`}:</strong> {failure.error}
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
                    Import {previewData?.length || 0} Products
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