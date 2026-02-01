import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function AddQCLineDialog({ open, onOpenChange, setId }) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    qc_type: "",
    qc_level: "",
    time_add_min_pc: "",
    notes: ""
  });

  const { data: qcTypes = [] } = useQuery({
    queryKey: ['QC_Type'],
    queryFn: () => base44.entities.QC_Type.list()
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await base44.entities.QC_Set_Lines.create({
        qc_set_id: setId,
        ...formData,
        time_add_min_pc: parseFloat(formData.time_add_min_pc)
      });
      queryClient.invalidateQueries(['QC_Set_Lines', setId]);
      onOpenChange(false);
      setFormData({ qc_type: "", qc_level: "", time_add_min_pc: "", notes: "" });
    } catch (error) {
      console.error("Failed to add line:", error);
      alert("Failed to add line");
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add QC Line</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="qc_type">QC Type *</Label>
            <Select value={formData.qc_type} onValueChange={(value) => setFormData({ ...formData, qc_type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select QC type" />
              </SelectTrigger>
              <SelectContent>
                {qcTypes.map(type => (
                  <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="qc_level">QC Level *</Label>
            <Input
              id="qc_level"
              value={formData.qc_level}
              onChange={(e) => setFormData({ ...formData, qc_level: e.target.value })}
              placeholder="e.g., L1, L2, L3"
              required
            />
          </div>

          <div>
            <Label htmlFor="time">Time Add (min/pc) *</Label>
            <Input
              id="time"
              type="number"
              step="0.01"
              value={formData.time_add_min_pc}
              onChange={(e) => setFormData({ ...formData, time_add_min_pc: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.qc_type || !formData.qc_level || !formData.time_add_min_pc}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</> : "Add Line"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}