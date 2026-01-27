import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function ReorderStickerDialog({ open, onClose, stickerItem, onConfirm }) {
  const [reorderReason, setReorderReason] = useState("Lost");
  const [comments, setComments] = useState("");

  const handleSubmit = () => {
    onConfirm({
      status: "Needed",
      need_reorder: true,
      reorder_reason: reorderReason,
      reorder_date: new Date().toISOString().split('T')[0],
      comments: comments
    });
    setReorderReason("Lost");
    setComments("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reorder Sticker</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Reason for Reorder</Label>
            <Select value={reorderReason} onValueChange={setReorderReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lost">Lost</SelectItem>
                <SelectItem value="Damaged">Damaged</SelectItem>
                <SelectItem value="Wrong Print">Wrong Print</SelectItem>
                <SelectItem value="Replacement">Replacement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Comments (optional)</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Confirm Reorder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}