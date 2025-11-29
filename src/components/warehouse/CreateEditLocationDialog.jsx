import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function CreateEditLocationDialog({ open, onClose, onLocationSaved, location = null }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    warehouse: '',
    zone: '',
    capacity: 0,
    is_active: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        code: location.code || '',
        description: location.description || '',
        warehouse: location.warehouse || '',
        zone: location.zone || '',
        capacity: location.capacity || 0,
        is_active: location.is_active !== undefined ? location.is_active : true
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        warehouse: '',
        zone: '',
        capacity: 0,
        is_active: true
      });
    }
  }, [location, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (location) {
        await base44.entities.WarehouseLocation.update(location.id, formData);
      } else {
        await base44.entities.WarehouseLocation.create(formData);
      }
      onLocationSaved();
      onClose();
    } catch (error) {
      console.error("Error saving location:", error);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{location ? 'Edit Location' : 'Create New Location'}</DialogTitle>
          <DialogDescription>
            {location ? 'Update warehouse location information' : 'Add a new warehouse location'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="π.χ. Ράφι 3B"
                required
              />
            </div>

            <div>
              <Label htmlFor="code">Location Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="π.χ. LOC-001"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="warehouse">Warehouse</Label>
              <Input
                id="warehouse"
                value={formData.warehouse}
                onChange={(e) => setFormData({...formData, warehouse: e.target.value})}
                placeholder="π.χ. Κεντρική Αποθήκη"
              />
            </div>

            <div>
              <Label htmlFor="zone">Zone/Area</Label>
              <Input
                id="zone"
                value={formData.zone}
                onChange={(e) => setFormData({...formData, zone: e.target.value})}
                placeholder="π.χ. Ζώνη Α"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="capacity">Capacity (pieces)</Label>
            <Input
              id="capacity"
              type="number"
              min="0"
              value={formData.capacity}
              onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2}
              placeholder="Additional details about this location..."
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Active Location</Label>
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
              {location ? 'Update Location' : 'Create Location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}