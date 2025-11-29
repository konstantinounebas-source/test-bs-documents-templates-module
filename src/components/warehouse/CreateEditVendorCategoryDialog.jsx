import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function CreateEditVendorCategoryDialog({ open, onClose, onVendorCategorySaved, vendorCategory = null }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    is_active: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (vendorCategory) {
      setFormData({
        name: vendorCategory.name || '',
        code: vendorCategory.code || '',
        description: vendorCategory.description || '',
        is_active: vendorCategory.is_active !== undefined ? vendorCategory.is_active : true
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        is_active: true
      });
    }
  }, [vendorCategory, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (vendorCategory) {
        await base44.entities.VendorCategory.update(vendorCategory.id, formData);
      } else {
        await base44.entities.VendorCategory.create(formData);
      }
      onVendorCategorySaved();
      onClose();
    } catch (error) {
      console.error("Error saving vendor category:", error);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{vendorCategory ? 'Edit Vendor Category' : 'Create New Vendor Category'}</DialogTitle>
          <DialogDescription>
            {vendorCategory ? 'Update vendor category information' : 'Add a new vendor category (e.g., Manufacturer, Distributor)'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="π.χ. Κατασκευαστής"
                required
              />
            </div>

            <div>
              <Label htmlFor="code">Category Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="π.χ. CAT-MAN"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              placeholder="Additional details about this category..."
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Active Category</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {vendorCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}