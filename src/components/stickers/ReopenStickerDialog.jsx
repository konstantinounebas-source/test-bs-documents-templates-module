import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ReopenStickerDialog({ open, onClose, stickerItem, onConfirm }) {
  const [comments, setComments] = useState("");

  const handleSubmit = () => {
    onConfirm({
      need_reorder: false,
      reorder_date: null,
      reorder_reason: null,
      installed: false,
      installed_date: null,
      installed_by: null,
      comments: comments
    });
    setComments("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Reorder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">
            This will cancel the reorder request and reset the sticker item.
          </p>
          <div>
            <Label>Comments (optional)</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Why are you canceling the reorder?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700">
            Confirm Cancel Reorder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}