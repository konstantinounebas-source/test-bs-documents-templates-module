import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Edit2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import EditApprovedTypeDialog from "./EditApprovedTypeDialog";

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
  const [initialApprovedTypeId, setInitialApprovedTypeId] = useState("");
  const [shelterTypes, setShelterTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEditApprovedType, setShowEditApprovedType] = useState(false);

  useEffect(() => {
    const initializeDialog = async () => {
      if (open) {
        await loadShelterTypes();
        
        if (stop) {
          const dateValue = stop.current_planned_installation_date
            ? stop.current_planned_installation_date.split("T")[0]
            : "";
          const approvedTypeId = stop.shelter_type_approved_id || "";
          
          setFormData({
            stop_id: stop.stop_id || "",
            english_name: stop.english_name || "",
            greek_name: stop.greek_name || "",
            shelter_type_initial_id: stop.shelter_type_initial_id || "",
            shelter_type_approved_id: approvedTypeId,
            current_planned_installation_date: dateValue,
            shelter_installed: stop.shelter_installed || false,
            comments: stop.comments || ""
          });
          setInitialApprovedTypeId(approvedTypeId);
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
          setInitialApprovedTypeId("");
        }
      }
    };
    
    initializeDialog();
  }, [open, stop]);

  const loadShelterTypes = async () => {
    const types = await base44.entities.ShelterType.list();
    setShelterTypes(types.filter(t => t.active));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check for duplicate stop_id only when creating new stop
      if (!stop) {
        const existingStops = await base44.entities.Stop.filter({ stop_id: formData.stop_id });
        if (existingStops.length > 0) {
          alert("Stop ID already exists. Please use a unique Stop ID.");
          setLoading(false);
          return;
        }
      }

      const dataToSave = {
        ...formData,
        english_count_letters: formData.english_name.length,
        greek_count_letters: formData.greek_name.length
      };

      let stopId;
      const newApprovedTypeId = formData.shelter_type_approved_id;

      if (stop) {
        await base44.entities.Stop.update(stop.id, dataToSave);
        stopId = stop.id;
      } else {
        const createdStop = await base44.entities.Stop.create(dataToSave);
        stopId = createdStop.id;
      }

      // Auto-create sticker items if shelter_type_approved_id was set on new stop
      if (newApprovedTypeId && !stop) {
        await createStickerItemsForStop(stopId, newApprovedTypeId);
      }

      setLoading(false);
      onStopSaved();
      onClose();
    } catch (error) {
      console.error("Error saving stop:", error);
      setLoading(false);
    }
  };

  const createStickerItemsForStop = async (stopId, approvedShelterTypeId) => {
    // Get sticker requirements for this shelter type
    const requirements = await base44.entities.ShelterTypeStickerRequirement.filter({
      shelter_type_id: approvedShelterTypeId
    });

    if (requirements.length === 0) return;

    // Get the stop data for print lines
    const stopData = await base44.entities.Stop.filter({ id: stopId });
    const currentStop = stopData[0];

    // Create sticker items based on requirements
    const stickerItems = [];
    for (const req of requirements) {
      for (let i = 0; i < req.quantity_required; i++) {
        stickerItems.push({
          stop_id: stopId,
          sticker_template_id: req.sticker_template_id,
          print_line_1: currentStop.stop_id,
          print_line_2: currentStop.greek_name,
          print_line_3: currentStop.english_name,
          status: "Needed",
          custody_status: "In Stock"
        });
      }
    }

    if (stickerItems.length > 0) {
      await base44.entities.StickerItem.bulkCreate(stickerItems);
    }
  };

  return (
    <>
      <AlertDialog open={showObsoleteConfirm} onOpenChange={setShowObsoleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
           <AlertDialogTitle>Αλλαγή Τύπου Καταφυγίου</AlertDialogTitle>
           <AlertDialogDescription>
             {pendingApprovedTypeId 
               ? "Θέλετε να κάνετε τα παλιά αυτοκόλλητα ως 'Obsolete' και να δημιουργήσετε νέα;" 
               : "Θέλετε να κάνετε τα παλιά αυτοκόλλητα ως 'Obsolete';"}
           </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel onClick={() => handleObsoleteConfirm(false)}>
              Όχι, κρατήστε τα παλιά
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleObsoleteConfirm(true)}>
              Ναι, κάντε τα Obsolete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

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
                 <Label htmlFor="current_planned_installation_date">Planned Installation Date</Label>
                 <Input
                   id="current_planned_installation_date"
                   type="date"
                   value={formData.current_planned_installation_date}
                   onChange={(e) => setFormData({ ...formData, current_planned_installation_date: e.target.value })}
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
                <div className="flex gap-2">
                  <Select
                    value={formData.shelter_type_approved_id}
                    onValueChange={handleApprovedTypeChange}
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
                  {formData.shelter_type_approved_id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setFormData({ ...formData, shelter_type_approved_id: "" })}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
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
        </>
        );
        }