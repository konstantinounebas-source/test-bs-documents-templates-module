import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function CreateEditTeamDialog({ open, onClose, onTeamSaved, team = null }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color_code: '#3b82f6',
    is_active: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || '',
        description: team.description || '',
        color_code: team.color_code || '#3b82f6',
        is_active: team.is_active !== undefined ? team.is_active : true
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color_code: '#3b82f6',
        is_active: true
      });
    }
  }, [team, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (team) {
        await base44.entities.Team.update(team.id, formData);
      } else {
        await base44.entities.Team.create(formData);
      }
      onTeamSaved();
      onClose();
    } catch (error) {
      console.error("Error saving team:", error);
      alert("Σφάλμα κατά την αποθήκευση της ομάδας");
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{team ? 'Επεξεργασία Ομάδας' : 'Νέα Ομάδα'}</DialogTitle>
          <DialogDescription>
            {team ? 'Ενημέρωση πληροφοριών ομάδας' : 'Δημιουργία νέας ομάδας εργασίας'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Όνομα Ομάδας *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="π.χ., Ομάδα Εγκατάστασης Α"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Περιγραφή</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Περιγράψτε την ομάδα..."
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
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Ενεργή Ομάδα</Label>
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
              {team ? 'Ενημέρωση' : 'Δημιουργία'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}