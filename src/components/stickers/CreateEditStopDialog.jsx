import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";

export default function CreateEditStopDialog({ open, onClose, stop, onStopSaved }) {
  const [formData, setFormData] = useState({
    stop_id: "",
    english_name: "",
    greek_name: "",
    shelter_type_initial_id: "",
    shelter_type_approved_id: "",
    current_planned_installation_date: "",
    shelter_installed: false,
    comments: ""
  });
  const [shelterTypes, setShelterTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadShelterTypes();
      if (stop) {
        setFormData({
          stop_id: stop.stop_id || "",
          english_name: stop.english_name || "",
          greek_name: stop.greek_name || "",
          shelter_type_initial_id: stop.shelter_type_initial_id || "",
          shelter_type_approved_id: stop.shelter_type_approved_id || "",
          current_planned_installation_date: stop.current_planned_installation_date || "",
          shelter_installed: stop.shelter_installed || false,
          comments: stop.comments || ""
        });
      } else {
        setFormData({
          stop_id: "",
          english_name: "",
          greek_name: "",
          shelter_type_initial_id: "",
          shelter_type_approved_id: "",
          current_planned_installation_date: "",
          shelter_installed: false,
          comments: ""
        });
      }
    }
  }, [open, stop]);

  const loadShelterTypes = async () => {
    const types = await base44.entities.ShelterType.list();
    setShelterTypes(types.filter(t => t.active));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const dataToSave = {
      ...formData,
      english_count_letters: formData.english_name.length,
      greek_count_letters: formData.greek_name.length
    };

    if (stop) {
      await base44.entities.Stop.update(stop.id, dataToSave);
    } else {
      await base44.entities.Stop.create(dataToSave);
    }

    setLoading(false);
    onStopSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stop ? "Edit Stop" : "Create New Stop"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stop_id">Stop ID *</Label>
                <Input
                  id="stop_id"
                  value={formData.stop_id}
                  onChange={(e) => setFormData({ ...formData, stop_id: e.target.value })}
                  required
                  disabled={!!stop}
                />
              </div>
              <div>
                <Label htmlFor="current_planned_installation_date">Planned Installation Date *</Label>
                <Input
                  id="current_planned_installation_date"
                  type="date"
                  value={formData.current_planned_installation_date}
                  onChange={(e) => setFormData({ ...formData, current_planned_installation_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="english_name">English Name *</Label>
                <Input
                  id="english_name"
                  value={formData.english_name}
                  onChange={(e) => setFormData({ ...formData, english_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="greek_name">Greek Name *</Label>
                <Input
                  id="greek_name"
                  value={formData.greek_name}
                  onChange={(e) => setFormData({ ...formData, greek_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shelter_type_initial_id">Shelter Type Initial</Label>
                <Select
                  value={formData.shelter_type_initial_id}
                  onValueChange={(value) => setFormData({ ...formData, shelter_type_initial_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select initial type" />
                  </SelectTrigger>
                  <SelectContent>
                    {shelterTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.shelter_type_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="shelter_type_approved_id">Shelter Type Approved</Label>
                <Select
                  value={formData.shelter_type_approved_id}
                  onValueChange={(value) => setFormData({ ...formData, shelter_type_approved_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select approved type" />
                  </SelectTrigger>
                  <SelectContent>
                    {shelterTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.shelter_type_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="shelter_installed"
                checked={formData.shelter_installed}
                onCheckedChange={(checked) => setFormData({ ...formData, shelter_installed: checked })}
              />
              <Label htmlFor="shelter_installed">Shelter Installed</Label>
            </div>

            <div>
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={3}
              />
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