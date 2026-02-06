import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

export default function EditApprovedTypeDialog({ open, onClose, stop, onTypeChanged }) {
  const [shelterTypes, setShelterTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasOldStickers, setHasOldStickers] = useState(false);

  useEffect(() => {
    if (open && stop) {
      loadShelterTypes();
      setSelectedTypeId(stop.shelter_type_approved_id || "");
    }
  }, [open, stop]);

  const loadShelterTypes = async () => {
    const types = await base44.entities.ShelterType.list();
    setShelterTypes(types.filter(t => t.active));
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const oldApprovedTypeId = stop.shelter_type_approved_id;
      let hasOldStickers = false;

      // Mark old sticker items as obsolete
      if (oldApprovedTypeId) {
        const oldStickerItems = await base44.entities.StickerItem.filter({
          stop_id: stop.id,
          status: { $ne: "Obsolete" }
        });

        if (oldStickerItems.length > 0) {
          hasOldStickers = true;
          for (const item of oldStickerItems) {
            await base44.entities.StickerItem.update(item.id, { status: "Obsolete" });
          }
        }
      }

      // Create new sticker items if new type is selected
      if (selectedTypeId) {
        await createStickerItemsForStop(stop.id, selectedTypeId);
      }

      // Update the stop with new approved type
      await base44.entities.Stop.update(stop.id, {
        shelter_type_approved_id: selectedTypeId
      });

      setShowConfirm(false);
      setLoading(false);
      onTypeChanged();
      onClose();
    } catch (error) {
      console.error("Error changing approved type:", error);
      setLoading(false);
    }
  };

  const checkHasOldStickers = async () => {
    if (!stop.shelter_type_approved_id) return false;
    
    const oldStickerItems = await base44.entities.StickerItem.filter({
      stop_id: stop.id,
      status: { $ne: "Obsolete" }
    });
    
    return oldStickerItems.length > 0;
  };

  const handleContinueClick = async () => {
    if (selectedTypeId === stop?.shelter_type_approved_id) return;
    
    // Check if there are old stickers
    const oldStickersExist = await checkHasOldStickers();
    setHasOldStickers(oldStickersExist);
    
    // If no old stickers and type is being cleared, just update directly
    if (!oldStickersExist && !selectedTypeId) {
      await handleConfirm();
    } else if (!oldStickersExist && selectedTypeId) {
      // If no old stickers but new type is selected, just update directly
      await handleConfirm();
    } else {
      // If there are old stickers, show confirmation
      setShowConfirm(true);
    }
  };

  const createStickerItemsForStop = async (stopId, approvedShelterTypeId) => {
    const requirements = await base44.entities.ShelterTypeStickerRequirement.filter({
      shelter_type_id: approvedShelterTypeId
    });

    if (requirements.length === 0) return;

    const stopData = await base44.entities.Stop.filter({ id: stopId });
    const currentStop = stopData[0];

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
          custody_status: "Needed"
        });
      }
    }

    if (stickerItems.length > 0) {
      await base44.entities.StickerItem.bulkCreate(stickerItems);
    }
  };

  const currentTypeName = stop?.shelter_type_approved_id 
    ? shelterTypes.find(t => t.id === stop.shelter_type_approved_id)?.shelter_type_id 
    : "None";

  return (
    <>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Αλλαγή Τύπου Καταφυγίου</AlertDialogTitle>
            <AlertDialogDescription>
              {hasOldStickers 
                ? `Θέλετε να κάνετε τα παλιά αυτοκόλλητα ως 'Obsolete' ${selectedTypeId ? "και να δημιουργήσετε νέα;" : ";"}`
                : `Θέλετε να ανανεώσετε τον τύπο καταφυγίου${selectedTypeId ? " και να δημιουργήσετε νέα αυτοκόλλητα;" : ";"}`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel onClick={() => setShowConfirm(false)}>
              Ακύρωση
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={loading}>
              {loading ? "Αποθήκευση..." : (hasOldStickers ? "Ναι, κάντε τα Obsolete" : "Ναι, ανανεώστε")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Αλλαγή Τύπου Καταφυγίου</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm text-gray-600">Τρέχων τύπος:</Label>
              <p className="font-semibold text-lg">{currentTypeName}</p>
            </div>

            <div>
              <Label htmlFor="new_type">Νέος τύπος καταφυγίου</Label>
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
              onClick={handleContinueClick}
              disabled={selectedTypeId === stop?.shelter_type_approved_id}
            >
              Συνέχεια
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}