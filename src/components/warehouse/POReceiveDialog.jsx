import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, CheckCircle, Upload, X, Image as ImageIcon, AlertTriangle } from "lucide-react";

export default function POReceiveDialog({
  open,
  onOpenChange,
  selectedPOForBulkReceive,
  poItemsToReceive,
  setPOItemsToReceive,
  toLocation,
  setToLocation,
  showPOSummary,
  setShowPOSummary,
  isProcessing,
  scanResult,
  vendors,
  products,
  locations,
  companies,
  invoiceCategories,
  uploadedPhotos,
  isUploadingPhoto,
  handlePhotoUpload,
  removePhoto,
  onProceedToSummary,
  onConfirm,
  onCancel,
}) {
  const photoInputRef = useRef(null);
  const [validationError, setValidationError] = useState(null);

  const togglePOItemSelection = (index) => {
    setPOItemsToReceive(prev => prev.map((item, i) =>
      i === index ? { ...item, selected: !item.selected } : item
    ));
  };

  const updatePOItemQuantity = (index, quantity) => {
    setPOItemsToReceive(prev => prev.map((item, i) =>
      i === index ? { ...item, quantity_to_receive: parseInt(quantity) || 0 } : item
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive Items from PO #{selectedPOForBulkReceive?.po_number}</DialogTitle>
          <DialogDescription>
            Select the items you want to receive and adjust quantities as needed
          </DialogDescription>
        </DialogHeader>

        {selectedPOForBulkReceive && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Vendor:</strong> {vendors.find(v => v.id === selectedPOForBulkReceive.vendor_id)?.name || 'N/A'}
              </p>
              <p className="text-sm text-blue-900 mt-1">
                <strong>Order Date:</strong> {new Date(selectedPOForBulkReceive.order_date).toLocaleDateString('en-GB')}
              </p>
            </div>

            {/* Error display inside dialog */}
            {scanResult?.type === 'error' && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-sm text-red-800">
                  {scanResult.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Θέση Αποθήκης *</Label>
              <Select value={toLocation || 'none'} onValueChange={(val) => setToLocation(val === 'none' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε θέση για όλα τα items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Επιλέξτε --</SelectItem>
                  {locations.filter(loc => loc.id && loc.name && loc.name.trim() !== '').map(loc => (
                    <SelectItem key={loc.id} value={loc.name}>
                      {loc.name} {loc.warehouse && `- ${loc.warehouse}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Φωτογραφίες (προαιρετικό)</Label>
              <div className="flex gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="w-full"
                >
                  {isUploadingPhoto ? (
                    <><Upload className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                  ) : (
                    <><ImageIcon className="w-4 h-4 mr-2" />Upload Photos</>
                  )}
                </Button>
              </div>
              {uploadedPhotos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {uploadedPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img src={photo.url} alt={photo.filename} className="w-full h-20 object-cover rounded-lg border border-slate-200" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {poItemsToReceive.map((item, index) => {
                const product = products.find(p => p.id === item.product_id);
                return (
                  <div key={index} className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => togglePOItemSelection(index)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="font-semibold text-slate-900">{product?.name || 'Unknown'}</p>
                          <p className="text-sm text-slate-600 font-mono">SKU: {product?.sku || 'N/A'}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div><p className="text-slate-600">Παραγγέλθηκαν</p><p className="font-semibold">{item.quantity_ordered}</p></div>
                          <div><p className="text-slate-600">Παραλήφθηκαν</p><p className="font-semibold">{item.quantity_received || 0}</p></div>
                          <div><p className="text-slate-600">Υπόλοιπο</p><p className="font-semibold text-orange-600">{item.quantity_ordered - (item.quantity_received || 0)}</p></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Παραλαμβάνω Τώρα</Label>
                            <Input
                              type="number"
                              min="1"
                              max={item.quantity_ordered - (item.quantity_received || 0)}
                              value={item.quantity_to_receive}
                              onChange={(e) => updatePOItemQuantity(index, e.target.value)}
                              disabled={!item.selected}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Unit Cost (€)</Label>
                            <div className="flex items-center h-10 px-3 bg-slate-100 rounded-md border">
                              <span className="text-sm font-mono">€{item.unit_cost?.toFixed(4) || '0.0000'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Pcs/Qty</Label>
                            <div className="flex items-center h-10 px-3 bg-slate-100 rounded-md border">
                              <span className="text-sm">{item.bundle_quantity || '-'}</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Cost/Pc (€)</Label>
                            <div className="flex items-center h-10 px-3 bg-slate-100 rounded-md border">
                              <span className="text-sm font-mono">
                                {item.unit_cost && item.bundle_quantity && parseFloat(item.bundle_quantity) > 0
                                  ? `€${(item.unit_cost / parseFloat(item.bundle_quantity)).toFixed(4)}`
                                  : '-'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Σύνολο (€)</Label>
                            <div className="flex items-center h-10 px-3 bg-blue-50 rounded-md border border-blue-200">
                              <span className="text-sm font-semibold text-blue-900">
                                €{((item.unit_cost || 0) * item.quantity_to_receive).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <p className="text-xs font-semibold text-slate-700 mb-2">Πρόσθετα Στοιχεία</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Κωδ. Προμηθευτή *</Label>
                              <Input
                                value={item.vendor_product_code || ''}
                                onChange={(e) => {
                                  setPOItemsToReceive(prev => prev.map((it, i) =>
                                    i === index ? { ...it, vendor_product_code: e.target.value } : it
                                  ));
                                }}
                                placeholder="Κωδικός"
                                disabled={!item.selected}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Εταιρεία *</Label>
                              <Select
                                value={item.company_id || 'none'}
                                onValueChange={(val) => {
                                  setPOItemsToReceive(prev => prev.map((it, i) =>
                                    i === index ? { ...it, company_id: val === 'none' ? '' : val } : it
                                  ));
                                }}
                                disabled={!item.selected}
                              >
                                <SelectTrigger><SelectValue placeholder="Επιλογή" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-</SelectItem>
                                  {companies.map(comp => (
                                    <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Κατ. Τιμολόγησης *</Label>
                              <Select
                                value={item.invoice_category_id || 'none'}
                                onValueChange={(val) => {
                                  setPOItemsToReceive(prev => prev.map((it, i) =>
                                    i === index ? { ...it, invoice_category_id: val === 'none' ? '' : val } : it
                                  ));
                                }}
                                disabled={!item.selected}
                              >
                                <SelectTrigger><SelectValue placeholder="Επιλογή" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-</SelectItem>
                                  {invoiceCategories.map(ic => (
                                    <SelectItem key={ic.id} value={ic.id}>
                                      <div>
                                        <div className="font-medium">{ic.name}</div>
                                        {ic.description && <div className="text-xs text-slate-500">{ic.description}</div>}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!showPOSummary ? (
              <div className="space-y-3">
                {validationError && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-sm text-red-800">{validationError}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onCancel}>Cancel</Button>
                  <Button
                    onClick={() => {
                      setValidationError(null);
                      const selectedItems = poItemsToReceive.filter(item => item.selected && item.quantity_to_receive > 0);
                      if (selectedItems.length === 0) {
                        setValidationError('Παρακαλώ επιλέξτε τουλάχιστον ένα προϊόν');
                        return;
                      }
                      if (!toLocation) {
                        setValidationError('Παρακαλώ επιλέξτε θέση αποθήκης');
                        return;
                      }
                      for (let i = 0; i < selectedItems.length; i++) {
                        const item = selectedItems[i];
                        const product = products.find(p => p.id === item.product_id);
                        const name = product?.name || `Γραμμή ${i + 1}`;
                        if (!item.vendor_product_code?.trim()) {
                          setValidationError(`"${name}": Παρακαλώ συμπληρώστε Κωδ. Προμηθευτή`);
                          return;
                        }
                        if (!item.company_id) {
                          setValidationError(`"${name}": Παρακαλώ επιλέξτε Εταιρεία`);
                          return;
                        }
                        if (!item.invoice_category_id) {
                          setValidationError(`"${name}": Παρακαλώ επιλέξτε Κατ. Τιμολόγησης`);
                          return;
                        }
                      }
                      onProceedToSummary();
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Συνέχεια στη Σύνοψη
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Separator />
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="text-base font-bold text-green-900 mb-3">Σύνοψη Παραλαβής από PO</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-600 font-medium">PO Number:</p>
                        <p className="font-semibold text-slate-900">{selectedPOForBulkReceive?.po_number}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium">Προμηθευτής:</p>
                        <p className="font-semibold text-slate-900">
                          {vendors.find(v => v.id === selectedPOForBulkReceive?.vendor_id)?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="text-sm">
                      <p className="text-slate-600 font-medium mb-2">Θέση Αποθήκης:</p>
                      <p className="font-semibold text-slate-900">{toLocation}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-slate-600 font-medium mb-2 text-sm">Προϊόντα προς Παραλαβή ({poItemsToReceive.filter(i => i.selected).length}):</p>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {poItemsToReceive.filter(item => item.selected).map((item, idx) => {
                          const product = products.find(p => p.id === item.product_id);
                          return (
                            <div key={idx} className="p-2 bg-white rounded border border-slate-200 text-sm">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-semibold text-slate-900">{product?.name || 'Unknown'}</p>
                                  <p className="text-xs text-slate-600">SKU: {product?.sku}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-green-700">{item.quantity_to_receive} τεμ.</p>
                                  <p className="text-xs text-slate-600">€{((item.unit_cost || 0) * item.quantity_to_receive).toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {uploadedPhotos.length > 0 && (
                      <div className="text-sm">
                        <p className="text-slate-600 font-medium">Φωτογραφίες:</p>
                        <p className="font-semibold text-green-600">{uploadedPhotos.length} φωτογραφία/ες επισυνάπτονται</p>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <p className="text-sm text-slate-600">
                        Συνολικό Κόστος: <strong className="text-lg text-green-900">
                          €{poItemsToReceive
                            .filter(i => i.selected)
                            .reduce((sum, item) => sum + ((item.unit_cost || 0) * item.quantity_to_receive), 0)
                            .toFixed(2)}
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowPOSummary(false)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Πίσω
                  </Button>
                  <Button onClick={onConfirm} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                    {isProcessing ? (
                      <><Upload className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 mr-2" />Επιβεβαίωση & Ολοκλήρωση</>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}