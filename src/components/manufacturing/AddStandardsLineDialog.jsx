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

export default function AddStandardsLineDialog({ open, onOpenChange, setId }) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    operation: "",
    item_code: "",
    std_min_pc: "",
    notes: ""
  });

  const { data: operations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.list()
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await base44.entities.Std_Set_Lines.create({
        std_set_id: setId,
        ...formData,
        std_min_pc: parseFloat(formData.std_min_pc)
      });
      queryClient.invalidateQueries(['Std_Set_Lines', setId]);
      onOpenChange(false);
      setFormData({ operation: "", item_code: "", std_min_pc: "", notes: "" });
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
          <DialogTitle>Add Standards Line</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="operation">Operation *</Label>
            <Select value={formData.operation} onValueChange={(value) => setFormData({ ...formData, operation: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select operation" />
              </SelectTrigger>
              <SelectContent>
                {operations.map(op => (
                  <SelectItem key={op.id} value={op.name}>{op.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="item_code">Item Code</Label>
            <Input
              id="item_code"
              value={formData.item_code}
              onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
              placeholder="Optional"
            />
          </div>

          <div>
            <Label htmlFor="std_min_pc">Standard Minutes per Piece *</Label>
            <Input
              id="std_min_pc"
              type="number"
              step="0.01"
              value={formData.std_min_pc}
              onChange={(e) => setFormData({ ...formData, std_min_pc: e.target.value })}
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
            <Button type="submit" disabled={isSubmitting || !formData.operation || !formData.std_min_pc}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</> : "Add Line"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}