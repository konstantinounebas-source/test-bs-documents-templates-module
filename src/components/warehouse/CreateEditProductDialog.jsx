import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function CreateEditProductDialog({ open, onClose, onProductSaved, product = null, categories, vendors }) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category_id: '',
    unit_of_measure: 'piece',
    barcode: '',
    qr_code: '',
    minimum_stock: 0,
    image_url: '',
    specifications: {},
    notes: '',
    is_active: true,
    preferred_vendor_id: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        category_id: product.category_id || '',
        unit_of_measure: product.unit_of_measure || 'piece',
        barcode: product.barcode || '',
        qr_code: product.qr_code || '',
        minimum_stock: product.minimum_stock || 0,
        image_url: product.image_url || '',
        specifications: product.specifications || {},
        notes: product.notes || '',
        is_active: product.is_active !== undefined ? product.is_active : true,
        preferred_vendor_id: product.preferred_vendor_id || ''
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        description: '',
        category_id: '',
        unit_of_measure: 'piece',
        barcode: '',
        qr_code: '',
        minimum_stock: 0,
        image_url: '',
        specifications: {},
        notes: '',
        is_active: true,
        preferred_vendor_id: ''
      });
    }
  }, [product, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (product) {
        await base44.entities.Product.update(product.id, formData);
      } else {
        await base44.entities.Product.create(formData);
      }
      onProductSaved();
      onClose();
    } catch (error) {
      console.error("Error saving product:", error);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Επεξεργασία Προϊόντος' : 'Νέο Προϊόν'}</DialogTitle>
          <DialogDescription>
            {product ? 'Ενημέρωση στοιχείων προϊόντος' : 'Προσθήκη νέου προϊόντος στο σύστημα'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Όνομα Προϊόντος *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="sku">SKU (Stock Keeping Unit) *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                placeholder="π.χ. PROD-001"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Περιγραφή</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category_id">Κατηγορία *</Label>
              <Select value={formData.category_id || 'none'} onValueChange={(val) => setFormData({...formData, category_id: val === 'none' ? '' : val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε κατηγορία" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Επιλέξτε --</SelectItem>
                  {categories.filter(c => c.id && c.is_active).map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unit_of_measure">Μονάδα Μέτρησης *</Label>
              <Select value={formData.unit_of_measure} onValueChange={(val) => setFormData({...formData, unit_of_measure: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece">Τεμάχιο (piece)</SelectItem>
                  <SelectItem value="meter">Μέτρο (meter)</SelectItem>
                  <SelectItem value="kg">Κιλό (kg)</SelectItem>
                  <SelectItem value="liter">Λίτρο (liter)</SelectItem>
                  <SelectItem value="box">Κουτί (box)</SelectItem>
                  <SelectItem value="pallet">Παλέτα (pallet)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="preferred_vendor_id">Προτιμώμενος Προμηθευτής</Label>
            <Select value={formData.preferred_vendor_id || 'none'} onValueChange={(val) => setFormData({...formData, preferred_vendor_id: val === 'none' ? '' : val})}>
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε προμηθευτή" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Χωρίς Προτιμώμενο --</SelectItem>
                {vendors.filter(v => v.id && v.is_active).map(vendor => (
                  <SelectItem key={vendor.id} value={vendor.id}>{vendor.name} ({vendor.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">Ο προμηθευτής που προτιμάτε για αυτό το προϊόν</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                placeholder="π.χ. 1234567890123"
              />
            </div>

            <div>
              <Label htmlFor="qr_code">QR Code</Label>
              <Input
                id="qr_code"
                value={formData.qr_code}
                onChange={(e) => setFormData({...formData, qr_code: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="minimum_stock">Ελάχιστο Απόθεμα</Label>
            <Input
              id="minimum_stock"
              type="number"
              min="0"
              value={formData.minimum_stock}
              onChange={(e) => setFormData({...formData, minimum_stock: parseInt(e.target.value) || 0})}
            />
            <p className="text-xs text-slate-500 mt-1">Alert όταν το stock πέσει κάτω από αυτό το όριο</p>
          </div>

          <div>
            <Label htmlFor="image_url">URL Εικόνας</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({...formData, image_url: e.target.value})}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label htmlFor="notes">Σημειώσεις</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Ενεργό Προϊόν</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Ακύρωση
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {product ? 'Ενημέρωση' : 'Δημιουργία'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}