
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import CreateEditVendorCategoryDialog from "@/components/warehouse/CreateEditVendorCategoryDialog";
import CreateEditVendorServiceDialog from "@/components/warehouse/CreateEditVendorServiceDialog";

export default function CreateEditVendorDialog({ open, onClose, onVendorSaved, vendor = null }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    vendor_category_id: '',
    vendor_service_id: '',
    contact_person: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Κύπρος', // Changed default from 'Greece' to 'Κύπρος'
    tax_id: '',
    doy: '',
    website: '',
    payment_terms: '30 days',
    lead_time_days: 14,
    rating: 0,
    bank_account: '',
    notes: '',
    is_active: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [showQuickCategoryDialog, setShowQuickCategoryDialog] = useState(false);
  const [showQuickServiceDialog, setShowQuickServiceDialog] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [cats, servs] = await Promise.all([
          base44.entities.VendorCategory.list(),
          base44.entities.VendorService.list()
        ]);
        setCategories(cats.filter(c => c.is_active));
        setServices(servs.filter(s => s.is_active));
      } catch (error) {
        console.error("Error loading options:", error);
      }
    };
    
    if (open) {
      loadOptions();
    }
  }, [open]);

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name || '',
        code: vendor.code || '',
        vendor_category_id: vendor.vendor_category_id || '',
        vendor_service_id: vendor.vendor_service_id || '',
        contact_person: vendor.contact_person || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        mobile: vendor.mobile || '',
        address: vendor.address || '',
        city: vendor.city || '',
        postal_code: vendor.postal_code || '',
        country: vendor.country || 'Κύπρος', // Changed default from 'Greece' to 'Κύπρος'
        tax_id: vendor.tax_id || '',
        doy: vendor.doy || '',
        website: vendor.website || '',
        payment_terms: vendor.payment_terms || '30 days',
        lead_time_days: vendor.lead_time_days || 14,
        rating: vendor.rating || 0,
        bank_account: vendor.bank_account || '',
        notes: vendor.notes || '',
        is_active: vendor.is_active !== undefined ? vendor.is_active : true
      });
    } else {
      setFormData({
        name: '',
        code: '',
        vendor_category_id: '',
        vendor_service_id: '',
        contact_person: '',
        email: '',
        phone: '',
        mobile: '',
        address: '',
        city: '',
        postal_code: '',
        country: 'Κύπρος', // Changed default from 'Greece' to 'Κύπρος'
        tax_id: '',
        doy: '',
        website: '',
        payment_terms: '30 days',
        lead_time_days: 14,
        rating: 0,
        bank_account: '',
        notes: '',
        is_active: true
      });
    }
  }, [vendor, open]);

  const generateVendorCode = async () => {
    try {
      const existingVendors = await base44.entities.Vendor.list();
      const existingCodes = existingVendors.map(v => v.code).filter(Boolean);
      
      let maxNumber = 0;
      existingCodes.forEach(code => {
        const match = code.match(/VEND-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNumber) maxNumber = num;
        }
      });
      
      const newNumber = maxNumber + 1;
      return `VEND-${String(newNumber).padStart(3, '0')}`;
    } catch (error) {
      console.error("Error generating vendor code:", error);
      return `VEND-${Date.now()}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let vendorCode = formData.code;
      
      if (!vendor && !vendorCode) {
        vendorCode = await generateVendorCode();
      }

      const dataToSave = { ...formData, code: vendorCode };

      if (vendor) {
        await base44.entities.Vendor.update(vendor.id, dataToSave);
      } else {
        await base44.entities.Vendor.create(dataToSave);
      }
      onVendorSaved();
      onClose();
    } catch (error) {
      console.error("Error saving vendor:", error);
    }
    setIsSaving(false);
  };

  const handleQuickCategoryCreated = async () => {
    setShowQuickCategoryDialog(false);
    // Reload categories
    try {
      const cats = await base44.entities.VendorCategory.list();
      setCategories(cats.filter(c => c.is_active));
    } catch (error) {
      console.error("Error reloading categories:", error);
    }
  };

  const handleQuickServiceCreated = async () => {
    setShowQuickServiceDialog(false);
    // Reload services
    try {
      const servs = await base44.entities.VendorService.list();
      setServices(servs.filter(s => s.is_active));
    } catch (error) {
      console.error("Error reloading services:", error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{vendor ? 'Επεξεργασία Προμηθευτή' : 'Νέος Προμηθευτής'}</DialogTitle>
            <DialogDescription>
              {vendor ? 'Ενημέρωση στοιχείων προμηθευτή' : 'Προσθήκη νέου προμηθευτή στο σύστημα. Ο κωδικός θα δημιουργηθεί αυτόματα.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Όνομα Προμηθευτή *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="code">Κωδικός Προμηθευτή</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="Αυτόματη δημιουργία αν μείνει κενό"
                  disabled={!!vendor}
                />
                {!vendor && <p className="text-xs text-slate-500 mt-1">Αφήστε κενό για αυτόματη δημιουργία (π.χ. VEND-001)</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor_category_id">Κατηγορία</Label>
                <div className="flex gap-2">
                  <Select value={formData.vendor_category_id || 'none'} onValueChange={(val) => setFormData({...formData, vendor_category_id: val === 'none' ? '' : val})} className="flex-1">
                    <SelectTrigger>
                      <SelectValue placeholder="Επιλέξτε κατηγορία" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Χωρίς Κατηγορία --</SelectItem>
                      {categories.filter(c => c.id).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="outline"
                    onClick={() => setShowQuickCategoryDialog(true)}
                    title="Create new category"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="vendor_service_id">Υπηρεσία/Προϊόντα</Label>
                <div className="flex gap-2">
                  <Select value={formData.vendor_service_id || 'none'} onValueChange={(val) => setFormData({...formData, vendor_service_id: val === 'none' ? '' : val})} className="flex-1">
                    <SelectTrigger>
                      <SelectValue placeholder="Επιλέξτε υπηρεσία" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Χωρίς Υπηρεσία --</SelectItem>
                      {services.filter(s => s.id).map(serv => (
                        <SelectItem key={serv.id} value={serv.id}>{serv.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="outline"
                    onClick={() => setShowQuickServiceDialog(true)}
                    title="Create new service"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_person">Υπεύθυνος Επικοινωνίας</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Τηλέφωνο</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="mobile">Κινητό</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Διεύθυνση</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">Πόλη</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="postal_code">Τ.Κ.</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="country">Χώρα</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax_id">ΑΦΜ</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="doy">ΔΟΥ</Label>
                <Input
                  id="doy"
                  value={formData.doy}
                  onChange={(e) => setFormData({...formData, doy: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="payment_terms">Όροι Πληρωμής</Label>
                <Input
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                  placeholder="π.χ. 30 days"
                />
              </div>

              <div>
                <Label htmlFor="lead_time_days">Lead Time (ημέρες)</Label>
                <Input
                  id="lead_time_days"
                  type="number"
                  value={formData.lead_time_days}
                  onChange={(e) => setFormData({...formData, lead_time_days: parseInt(e.target.value) || 0})}
                />
              </div>

              <div>
                <Label htmlFor="rating">Αξιολόγηση (1-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={(e) => setFormData({...formData, rating: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bank_account">Τραπεζικός Λογαριασμός (IBAN)</Label>
              <Input
                id="bank_account"
                value={formData.bank_account}
                onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                placeholder="GR..."
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
              <Label htmlFor="is_active">Ενεργός Προμηθευτής</Label>
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
                {vendor ? 'Ενημέρωση' : 'Δημιουργία'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Create Dialogs */}
      <CreateEditVendorCategoryDialog
        open={showQuickCategoryDialog}
        onClose={() => setShowQuickCategoryDialog(false)}
        onVendorCategorySaved={handleQuickCategoryCreated}
      />

      <CreateEditVendorServiceDialog
        open={showQuickServiceDialog}
        onClose={() => setShowQuickServiceDialog(false)}
        onVendorServiceSaved={handleQuickServiceCreated}
      />
    </>
  );
}
