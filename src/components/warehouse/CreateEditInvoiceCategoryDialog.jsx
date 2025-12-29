import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function CreateEditInvoiceCategoryDialog({ open, onClose, onInvoiceCategorySaved, invoiceCategory = null }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (invoiceCategory) {
      setFormData({
        name: invoiceCategory.name || "",
        description: invoiceCategory.description || "",
        is_active: invoiceCategory.is_active ?? true
      });
    } else {
      setFormData({
        name: "",
        description: "",
        is_active: true
      });
    }
  }, [invoiceCategory, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (invoiceCategory) {
        await base44.entities.InvoiceCategory.update(invoiceCategory.id, formData);
      } else {
        await base44.entities.InvoiceCategory.create(formData);
      }

      onInvoiceCategorySaved();
      onClose();
    } catch (error) {
      console.error("Error saving invoice category:", error);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{invoiceCategory ? 'Επεξεργασία Κατηγορίας Τιμολόγησης' : 'Νέα Κατηγορία Τιμολόγησης'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Όνομα Κατηγορίας *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="π.χ. Υλικά Κατασκευής"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Περιγραφή</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Προαιρετική περιγραφή..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Ενεργή Κατηγορία</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Ακύρωση
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {invoiceCategory ? 'Ενημέρωση' : 'Δημιουργία'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}