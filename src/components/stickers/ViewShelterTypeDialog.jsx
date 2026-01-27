import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import ApplyStickerRequirementsDialog from "./ApplyStickerRequirementsDialog";

export default function ViewShelterTypeDialog({ open, onClose, shelterType }) {
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [requirements, setRequirements] = useState([]);
  const [stickerTemplates, setStickerTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newRequirement, setNewRequirement] = useState({
    sticker_template_id: "",
    quantity_required: 1
  });

  useEffect(() => {
    if (open && shelterType) {
      loadData();
    }
  }, [open, shelterType]);

  const loadData = async () => {
    setLoading(true);
    const [reqs, templates] = await Promise.all([
      base44.entities.ShelterTypeStickerRequirement.filter({ shelter_type_id: shelterType.id }),
      base44.entities.StickerTemplate.list()
    ]);
    setRequirements(reqs);
    setStickerTemplates(templates.filter(t => t.active));
    setLoading(false);
  };

  const getStickerTemplateName = (templateId) => {
    const template = stickerTemplates.find(t => t.id === templateId);
    return template ? template.sticker_name_category : "-";
  };

  const handleAddRequirement = async () => {
    if (!newRequirement.sticker_template_id) return;

    setAdding(true);
    await base44.entities.ShelterTypeStickerRequirement.create({
      shelter_type_id: shelterType.id,
      sticker_template_id: newRequirement.sticker_template_id,
      quantity_required: newRequirement.quantity_required
    });

    setNewRequirement({ sticker_template_id: "", quantity_required: 1 });
    await loadData();
    setAdding(false);
    
    setApplyDialogOpen(true);
  };

  const handleDeleteRequirement = async (reqId) => {
    if (!confirm("Είστε σίγουροι ότι θέλετε να αφαιρέσετε αυτό το sticker requirement;")) return;
    
    await base44.entities.ShelterTypeStickerRequirement.delete(reqId);
    await loadData();
    
    setApplyDialogOpen(true);
  };

  const handleApplyDialogClose = (itemsCreated) => {
    setApplyDialogOpen(false);
    if (itemsCreated) {
      loadData();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Shelter Type: {shelterType?.shelter_type_id}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4">Required Stickers</h3>
              
              {requirements.length === 0 ? (
                <p className="text-sm text-gray-500 mb-4">No sticker requirements defined yet.</p>
              ) : (
                <div className="border rounded-lg mb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sticker Template</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requirements.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>{getStickerTemplateName(req.sticker_template_id)}</TableCell>
                          <TableCell>{req.quantity_required}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRequirement(req.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <Button 
                  variant="outline"
                  onClick={() => setApplyDialogOpen(true)}
                  disabled={requirements.length === 0}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Εφαρμογή σε Στάσεις
                </Button>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-3">Add Sticker Requirement</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label>Sticker Template</Label>
                    <Select
                      value={newRequirement.sticker_template_id}
                      onValueChange={(value) => setNewRequirement({ ...newRequirement, sticker_template_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sticker template" />
                      </SelectTrigger>
                      <SelectContent>
                        {stickerTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.sticker_name_category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newRequirement.quantity_required}
                      onChange={(e) => setNewRequirement({ ...newRequirement, quantity_required: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <Button 
                  className="mt-3" 
                  onClick={handleAddRequirement}
                  disabled={!newRequirement.sticker_template_id || adding}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Requirement
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      <ApplyStickerRequirementsDialog
        open={applyDialogOpen}
        onClose={handleApplyDialogClose}
        shelterType={shelterType}
      />
    </Dialog>
  );
}