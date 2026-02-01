import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function AddConsumablesLineDialog({ open, onOpenChange, setId, department }) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    consumable: "",
    rate_type: "",
    item_code: "",
    operation: "",
    rate_value: "",
    unit: "",
    notes: ""
  });

  const { data: consumables = [] } = useQuery({
    queryKey: ['Consumable'],
    queryFn: () => base44.entities.Consumable.list()
  });

  const { data: rateTypes = [] } = useQuery({
    queryKey: ['Rate_Type'],
    queryFn: () => base44.entities.Rate_Type.list()
  });

  const { data: units = [] } = useQuery({
    queryKey: ['Unit'],
    queryFn: () => base44.entities.Unit.list()
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await base44.entities.Consumables_Standards_Lines.create({
        consumables_standards_set_id: setId,
        department: department,
        ...formData,
        rate_value: parseFloat(formData.rate_value)
      });
      queryClient.invalidateQueries(['Consumables_Standards_Lines', setId]);
      onOpenChange(false);
      setFormData({ consumable: "", rate_type: "", item_code: "", operation: "", rate_value: "", unit: "", notes: "" });
    } catch (error) {
      console.error("Failed to add line:", error);
      alert("Failed to add line");
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Consumables Standards Line</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="consumable">Consumable *</Label>
              <Select value={formData.consumable} onValueChange={(value) => setFormData({ ...formData, consumable: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select consumable" />
                </SelectTrigger>
                <SelectContent>
                  {consumables.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rate_type">Rate Type *</Label>
              <Select value={formData.rate_type} onValueChange={(value) => setFormData({ ...formData, rate_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rate type" />
                </SelectTrigger>
                <SelectContent>
                  {rateTypes.map(rt => (
                    <SelectItem key={rt.id} value={rt.name}>{rt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item_code">Item Code (optional)</Label>
              <Input
                id="item_code"
                value={formData.item_code}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                placeholder="If rate is item-specific"
              />
            </div>

            <div>
              <Label htmlFor="operation">Operation (optional)</Label>
              <Input
                id="operation"
                value={formData.operation}
                onChange={(e) => setFormData({ ...formData, operation: e.target.value })}
                placeholder="If rate is operation-specific"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rate_value">Rate Value *</Label>
              <Input
                id="rate_value"
                type="number"
                step="0.01"
                value={formData.rate_value}
                onChange={(e) => setFormData({ ...formData, rate_value: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map(u => (
                    <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.consumable || !formData.rate_type || !formData.rate_value || !formData.unit}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</> : "Add Line"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}