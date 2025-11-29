import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function CreateEditVendorServiceDialog({ open, onClose, onVendorServiceSaved, vendorService = null }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    is_active: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (vendorService) {
      setFormData({
        name: vendorService.name || '',
        code: vendorService.code || '',
        description: vendorService.description || '',
        is_active: vendorService.is_active !== undefined ? vendorService.is_active : true
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        is_active: true
      });
    }
  }, [vendorService, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (vendorService) {
        await base44.entities.VendorService.update(vendorService.id, formData);
      } else {
        await base44.entities.VendorService.create(formData);
      }
      onVendorServiceSaved();
      onClose();
    } catch (error) {
      console.error("Error saving vendor service:", error);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{vendorService ? 'Edit Vendor Service' : 'Create New Vendor Service'}</DialogTitle>
          <DialogDescription>
            {vendorService ? 'Update vendor service information' : 'Add a new vendor service/product type (e.g., Construction, Transportation)'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="π.χ. Κατασκευή Στεγάστρων"
                required
              />
            </div>

            <div>
              <Label htmlFor="code">Service Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="π.χ. SRV-CON"
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
              placeholder="Additional details about this service..."
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Active Service</Label>
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
              {vendorService ? 'Update Service' : 'Create Service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}