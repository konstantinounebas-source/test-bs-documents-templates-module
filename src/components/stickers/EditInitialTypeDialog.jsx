import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

export default function EditInitialTypeDialog({ open, onClose, stop, onTypeChanged }) {
  const [shelterTypes, setShelterTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && stop) {
      loadShelterTypes();
      setSelectedTypeId(stop.shelter_type_initial_id || "");
    }
  }, [open, stop]);

  const loadShelterTypes = async () => {
    const types = await base44.entities.ShelterType.list();
    setShelterTypes(types.filter(t => t.active));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await base44.entities.Stop.update(stop.id, {
        shelter_type_initial_id: selectedTypeId
      });

      setLoading(false);
      onTypeChanged();
      onClose();
    } catch (error) {
      console.error("Error changing initial type:", error);
      setLoading(false);
    }
  };

  const currentTypeName = stop?.shelter_type_initial_id 
    ? shelterTypes.find(t => t.id === stop.shelter_type_initial_id)?.shelter_type_id 
    : "None";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Αλλαγή Αρχικού Τύπου Καταφυγίου</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm text-gray-600">Τρέχων τύπος:</Label>
            <p className="font-semibold text-lg">{currentTypeName}</p>
          </div>

          <div>
            <Label htmlFor="new_type">Νέος αρχικός τύπος καταφυγίου</Label>
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε νέο τύπο" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Κανένας (Καθαρισμός)</SelectItem>
                {shelterTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.shelter_type_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Ακύρωση
          </Button>
          <Button 
            type="submit" 
            onClick={handleSave}
            disabled={selectedTypeId === stop?.shelter_type_initial_id || loading}
          >
            {loading ? "Αποθήκευση..." : "Αποθήκευση"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}