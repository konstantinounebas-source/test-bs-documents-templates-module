import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function EditMovementDialog({ open, onClose, movement, onSave }) {
  const [formData, setFormData] = useState({
    notes: '',
    waybill_number: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (movement) {
      setFormData({
        notes: movement.notes || '',
        waybill_number: movement.waybill_number || ''
      });
    }
  }, [movement]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(movement.id, formData);
      onClose();
    } catch (error) {
      console.error("Error saving movement:", error);
    }
    setIsSaving(false);
  };

  if (!movement) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Movement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="waybill">Waybill Number</Label>
            <Input
              id="waybill"
              value={formData.waybill_number}
              onChange={(e) => setFormData({ ...formData, waybill_number: e.target.value })}
              placeholder="Enter waybill number"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}