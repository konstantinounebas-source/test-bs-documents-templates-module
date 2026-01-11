import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function CreateEditMaterialCategoryDialog({ open, onClose, onMaterialCategorySaved, materialCategory = null }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color_code: '#8b5cf6',
    is_active: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (materialCategory) {
      setFormData({
        name: materialCategory.name || '',
        code: materialCategory.code || '',
        description: materialCategory.description || '',
        color_code: materialCategory.color_code || '#8b5cf6',
        is_active: materialCategory.is_active !== undefined ? materialCategory.is_active : true
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        color_code: '#8b5cf6',
        is_active: true
      });
    }
  }, [materialCategory, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (materialCategory) {
        await base44.entities.MaterialCategory.update(materialCategory.id, formData);
      } else {
        await base44.entities.MaterialCategory.create(formData);
      }
      onMaterialCategorySaved();
      onClose();
    } catch (error) {
      console.error("Error saving material category:", error);
      alert("Σφάλμα κατά την αποθήκευση της κατηγορίας υλικού");
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{materialCategory ? 'Επεξεργασία Κατηγορίας Υλικού' : 'Νέα Κατηγορία Υλικού'}</DialogTitle>
          <DialogDescription>
            {materialCategory ? 'Ενημέρωση πληροφοριών κατηγορίας υλικού' : 'Δημιουργία νέας κατηγορίας υλικού'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Όνομα Κατηγορίας *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="π.χ., Main Construction Materials"
                required
              />
            </div>

            <div>
              <Label htmlFor="code">Κωδικός</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="π.χ., MCM"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Περιγραφή</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Περιγράψτε την κατηγορία υλικού..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="color_code">Χρώμα</Label>
            <div className="flex items-center gap-2">
              <Input
                id="color_code"
                type="color"
                value={formData.color_code}
                onChange={(e) => setFormData({...formData, color_code: e.target.value})}
                className="w-20 h-10 p-1"
              />
              <Input
                type="text"
                value={formData.color_code}
                onChange={(e) => setFormData({...formData, color_code: e.target.value})}
                placeholder="#8b5cf6"
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Ενεργή Κατηγορία</Label>
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
              {materialCategory ? 'Ενημέρωση' : 'Δημιουργία'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}