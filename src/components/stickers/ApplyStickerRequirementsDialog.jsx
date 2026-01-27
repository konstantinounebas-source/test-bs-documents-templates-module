import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ApplyStickerRequirementsDialog({ open, onClose, shelterType }) {
  const [stops, setStops] = useState([]);
  const [selectedStops, setSelectedStops] = useState({});
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [requirements, setRequirements] = useState([]);
  const [stickerTemplates, setStickerTemplates] = useState([]);

  useEffect(() => {
    if (open && shelterType) {
      loadData();
    }
  }, [open, shelterType]);

  const loadData = async () => {
    setLoading(true);
    
    const [allStops, reqs, templates] = await Promise.all([
      base44.entities.Stop.list(),
      base44.entities.ShelterTypeStickerRequirement.filter({ shelter_type_id: shelterType.id }),
      base44.entities.StickerTemplate.list()
    ]);

    const filteredStops = allStops.filter(s => s.shelter_type_approved_id === shelterType.id);
    setStops(filteredStops);
    setRequirements(reqs);
    setStickerTemplates(templates);
    setLoading(false);
  };

  const toggleStop = (stopId) => {
    setSelectedStops(prev => ({
      ...prev,
      [stopId]: !prev[stopId]
    }));
  };

  const selectAll = () => {
    const allSelected = {};
    stops.forEach(stop => {
      allSelected[stop.id] = true;
    });
    setSelectedStops(allSelected);
  };

  const deselectAll = () => {
    setSelectedStops({});
  };

  const handleApply = async () => {
    const selectedStopIds = Object.keys(selectedStops).filter(id => selectedStops[id]);
    
    if (selectedStopIds.length === 0) {
      alert("Παρακαλώ επιλέξτε τουλάχιστον μία στάση");
      return;
    }

    setApplying(true);

    for (const stopId of selectedStopIds) {
      for (const req of requirements) {
        for (let i = 0; i < req.quantity_required; i++) {
          const stop = stops.find(s => s.id === stopId);
          const template = stickerTemplates.find(t => t.id === req.sticker_template_id);

          const existingItems = await base44.entities.StickerItem.filter({
            stop_id: stopId,
            sticker_template_id: req.sticker_template_id
          });

          if (existingItems.length < req.quantity_required) {
            await base44.entities.StickerItem.create({
              stop_id: stopId,
              sticker_template_id: req.sticker_template_id,
              print_line_1: stop?.stop_id || "",
              print_line_2: stop?.greek_name || "",
              print_line_3: stop?.english_name || "",
              status: "Needed",
              installed: false,
              need_reorder: false,
              total_ordered_quantity: 0,
              custody_status: "In Stock"
            });
          }
        }
      }
    }

    setApplying(false);
    onClose(true); // Pass true to indicate items were created
  };

  const selectedCount = Object.values(selectedStops).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(false)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Εφαρμογή Sticker Requirements - {shelterType?.shelter_type_id}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Επιλέξτε τις στάσεις στις οποίες θέλετε να δημιουργηθούν τα sticker items 
                με βάση τα νέα sticker requirements.
              </p>
            </div>

            {requirements.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Δεν υπάρχουν sticker requirements</p>
                  <p className="text-sm text-yellow-700">
                    Προσθέστε sticker requirements πρώτα για αυτόν τον τύπο στάσης.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Επιλογή Όλων
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                      Αποεπιλογή Όλων
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Επιλεγμένες: {selectedCount} από {stops.length} στάσεις
                  </p>
                </div>

                {stops.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    Δεν υπάρχουν στάσεις με αυτόν τον τύπο στάσης
                  </p>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Stop ID</TableHead>
                          <TableHead>Ελληνικό Όνομα</TableHead>
                          <TableHead>Αγγλικό Όνομα</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stops.map((stop) => (
                          <TableRow key={stop.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedStops[stop.id] || false}
                                onCheckedChange={() => toggleStop(stop.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{stop.stop_id}</TableCell>
                            <TableCell>{stop.greek_name || "-"}</TableCell>
                            <TableCell>{stop.english_name || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={applying}>
            Ακύρωση
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={applying || requirements.length === 0 || selectedCount === 0}
          >
            {applying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Δημιουργία...
              </>
            ) : (
              `Δημιουργία Stickers (${selectedCount} στάσεις)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}