import React, { useState, useEffect } from "react";
import { BusStopType } from "@/entities/BusStopType";
import { BusStopTypeComponent } from "@/entities/BusStopTypeComponent";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function CreateEditBusStopTypeDialog({ open, onClose, onTypeSaved, busStopType = null, busStopTypes = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: '',
    estimated_installation_time_hours: 0,
    is_active: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [copyFromTypeId, setCopyFromTypeId] = useState('');

  useEffect(() => {
    if (busStopType) {
      setFormData({
        name: busStopType.name || '',
        code: busStopType.code || '',
        description: busStopType.description || '',
        category: busStopType.category || '',
        estimated_installation_time_hours: busStopType.estimated_installation_time_hours || 0,
        is_active: busStopType.is_active !== undefined ? busStopType.is_active : true
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        category: '',
        estimated_installation_time_hours: 0,
        is_active: true
      });
    }
  }, [busStopType, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let newTypeId;
      if (busStopType) {
        await BusStopType.update(busStopType.id, formData);
        newTypeId = busStopType.id;
      } else {
        const newType = await BusStopType.create(formData);
        newTypeId = newType.id;

        // Copy BOM components if selected
        if (copyFromTypeId) {
          const sourceComponents = await BusStopTypeComponent.filter({
            bus_stop_type_id: copyFromTypeId
          });

          for (const component of sourceComponents) {
            await BusStopTypeComponent.create({
              bus_stop_type_id: newTypeId,
              product_id: component.product_id,
              team_id: component.team_id,
              material_category_id: component.material_category_id,
              quantity_required: component.quantity_required,
              unit_of_measure: component.unit_of_measure,
              is_optional: component.is_optional,
              installation_order: component.installation_order,
              notes: component.notes
            });
          }
        }
      }
      onTypeSaved();
      onClose();
    } catch (error) {
      console.error("Error saving bus stop type:", error);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{busStopType ? 'Edit Bus Stop Type' : 'Create New Bus Stop Type'}</DialogTitle>
          <DialogDescription>
            {busStopType ? 'Update bus stop type information' : 'Add a new bus stop configuration'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Type Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Basic Shelter"
                required
              />
            </div>

            <div>
              <Label htmlFor="code">Type Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="e.g., BS-BASIC-001"
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
              placeholder="Describe this bus stop type..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                placeholder="e.g., Shelter, Sign Only"
              />
            </div>

            <div>
              <Label htmlFor="install_time">Installation Time (hours)</Label>
              <Input
                id="install_time"
                type="number"
                step="0.5"
                value={formData.estimated_installation_time_hours}
                onChange={(e) => setFormData({...formData, estimated_installation_time_hours: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Active Type</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
            />
          </div>

          {!busStopType && (
            <div>
              <Label htmlFor="copy_from">Copy BOM from (Optional)</Label>
              <Select value={copyFromTypeId} onValueChange={setCopyFromTypeId}>
                <SelectTrigger id="copy_from">
                  <SelectValue placeholder="Select a bus stop type to copy BOM..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None - Create Empty BOM</SelectItem>
                  {busStopTypes.filter(t => t.is_active).map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {busStopType ? 'Update Type' : 'Create Type'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}