import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function AddProfileLineDialog({ open, onOpenChange, setId }) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    item_code: "",
    profile_name: "",
    sanding_yn: false,
    masking_yn: false,
    zink_yn: false,
    repair_yn: false,
    remake_yn: false,
    hanging_yn: false,
    unhanging_yn: false,
    oven_clean_yn: false,
    other_yn: false,
    profile_time_min_pc: "",
    notes: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await base44.entities.Profile_Set_Lines.create({
        profile_set_id: setId,
        ...formData,
        profile_time_min_pc: formData.profile_time_min_pc ? parseFloat(formData.profile_time_min_pc) : null
      });
      queryClient.invalidateQueries(['Profile_Set_Lines', setId]);
      onOpenChange(false);
      setFormData({
        item_code: "", profile_name: "", sanding_yn: false, masking_yn: false,
        zink_yn: false, repair_yn: false, remake_yn: false, hanging_yn: false,
        unhanging_yn: false, oven_clean_yn: false, other_yn: false,
        profile_time_min_pc: "", notes: ""
      });
    } catch (error) {
      console.error("Failed to add line:", error);
      alert("Failed to add line");
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Profile Line</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item_code">Item Code *</Label>
              <Input
                id="item_code"
                value={formData.item_code}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="profile_name">Profile Name *</Label>
              <Input
                id="profile_name"
                value={formData.profile_name}
                onChange={(e) => setFormData({ ...formData, profile_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Operations Required</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="sanding" checked={formData.sanding_yn} onCheckedChange={(checked) => setFormData({ ...formData, sanding_yn: checked })} />
                <Label htmlFor="sanding">Sanding</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="masking" checked={formData.masking_yn} onCheckedChange={(checked) => setFormData({ ...formData, masking_yn: checked })} />
                <Label htmlFor="masking">Masking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="zink" checked={formData.zink_yn} onCheckedChange={(checked) => setFormData({ ...formData, zink_yn: checked })} />
                <Label htmlFor="zink">Zink</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="repair" checked={formData.repair_yn} onCheckedChange={(checked) => setFormData({ ...formData, repair_yn: checked })} />
                <Label htmlFor="repair">Repair</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="remake" checked={formData.remake_yn} onCheckedChange={(checked) => setFormData({ ...formData, remake_yn: checked })} />
                <Label htmlFor="remake">Remake</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="hanging" checked={formData.hanging_yn} onCheckedChange={(checked) => setFormData({ ...formData, hanging_yn: checked })} />
                <Label htmlFor="hanging">Hanging</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="unhanging" checked={formData.unhanging_yn} onCheckedChange={(checked) => setFormData({ ...formData, unhanging_yn: checked })} />
                <Label htmlFor="unhanging">Unhanging</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="oven" checked={formData.oven_clean_yn} onCheckedChange={(checked) => setFormData({ ...formData, oven_clean_yn: checked })} />
                <Label htmlFor="oven">Oven Clean</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="other" checked={formData.other_yn} onCheckedChange={(checked) => setFormData({ ...formData, other_yn: checked })} />
                <Label htmlFor="other">Other</Label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="time">Profile Time (min/pc)</Label>
            <Input
              id="time"
              type="number"
              step="0.01"
              value={formData.profile_time_min_pc}
              onChange={(e) => setFormData({ ...formData, profile_time_min_pc: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.item_code || !formData.profile_name}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</> : "Add Line"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}