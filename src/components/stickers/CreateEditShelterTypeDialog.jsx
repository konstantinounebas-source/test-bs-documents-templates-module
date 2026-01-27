import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";

export default function CreateEditShelterTypeDialog({ open, onClose, shelterType, onShelterTypeSaved }) {
  const [formData, setFormData] = useState({
    shelter_type_id: "",
    description: "",
    greek_name_max_chars: "",
    english_name_max_chars: "",
    active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (shelterType) {
        setFormData({
          shelter_type_id: shelterType.shelter_type_id || "",
          description: shelterType.description || "",
          greek_name_max_chars: shelterType.greek_name_max_chars || "",
          english_name_max_chars: shelterType.english_name_max_chars || "",
          active: shelterType.active !== undefined ? shelterType.active : true
        });
      } else {
        setFormData({
          shelter_type_id: "",
          description: "",
          greek_name_max_chars: "",
          english_name_max_chars: "",
          active: true
        });
      }
    }
  }, [open, shelterType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (shelterType) {
      await base44.entities.ShelterType.update(shelterType.id, formData);
    } else {
      await base44.entities.ShelterType.create(formData);
    }

    setLoading(false);
    onShelterTypeSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{shelterType ? "Edit Shelter Type" : "Create New Shelter Type"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="shelter_type_id">Shelter Type ID *</Label>
              <Input
                id="shelter_type_id"
                value={formData.shelter_type_id}
                onChange={(e) => setFormData({ ...formData, shelter_type_id: e.target.value })}
                required
                disabled={!!shelterType}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="greek_name_max_chars">Greek Name Max Characters</Label>
              <Input
                id="greek_name_max_chars"
                type="number"
                value={formData.greek_name_max_chars}
                onChange={(e) => setFormData({ ...formData, greek_name_max_chars: e.target.value ? parseInt(e.target.value) : "" })}
                placeholder="e.g. 30"
              />
            </div>

            <div>
              <Label htmlFor="english_name_max_chars">English Name Max Characters</Label>
              <Input
                id="english_name_max_chars"
                type="number"
                value={formData.english_name_max_chars}
                onChange={(e) => setFormData({ ...formData, english_name_max_chars: e.target.value ? parseInt(e.target.value) : "" })}
                placeholder="e.g. 30"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}