import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";

export default function EditStickerItemDialog({ open, onClose, stickerItem, onSaved }) {
  const [formData, setFormData] = useState({
    print_line_1: "",
    print_line_2: "",
    print_line_3: "",
    status: "Needed",
    installed: false,
    installed_date: "",
    need_reorder: false,
    reorder_reason: "",
    reorder_date: "",
    custody_status: "In Stock",
    comments: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && stickerItem) {
      setFormData({
        print_line_1: stickerItem.print_line_1 || "",
        print_line_2: stickerItem.print_line_2 || "",
        print_line_3: stickerItem.print_line_3 || "",
        status: stickerItem.status || "Needed",
        installed: stickerItem.installed || false,
        installed_date: stickerItem.installed_date || "",
        need_reorder: stickerItem.need_reorder || false,
        reorder_reason: stickerItem.reorder_reason || "",
        reorder_date: stickerItem.reorder_date || "",
        custody_status: stickerItem.custody_status || "In Stock",
        comments: stickerItem.comments || ""
      });
    }
  }, [open, stickerItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    await base44.entities.StickerItem.update(stickerItem.id, formData);

    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sticker Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="print_line_1">Print Line 1 (Stop ID)</Label>
                <Input
                  id="print_line_1"
                  value={formData.print_line_1}
                  onChange={(e) => setFormData({ ...formData, print_line_1: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="print_line_2">Print Line 2 (Greek)</Label>
                <Input
                  id="print_line_2"
                  value={formData.print_line_2}
                  onChange={(e) => setFormData({ ...formData, print_line_2: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="print_line_3">Print Line 3 (English)</Label>
                <Input
                  id="print_line_3"
                  value={formData.print_line_3}
                  onChange={(e) => setFormData({ ...formData, print_line_3: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Needed">Needed</SelectItem>
                    <SelectItem value="Ordered">Ordered</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                    <SelectItem value="Installed">Installed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="custody_status">Custody Status</Label>
                <Select value={formData.custody_status} onValueChange={(value) => setFormData({ ...formData, custody_status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Stock">In Stock</SelectItem>
                    <SelectItem value="With Technician">With Technician</SelectItem>
                    <SelectItem value="Installed">Installed</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="installed"
                  checked={formData.installed}
                  onCheckedChange={(checked) => setFormData({ ...formData, installed: checked })}
                />
                <Label htmlFor="installed">Installed</Label>
              </div>
              {formData.installed && (
                <div>
                  <Label htmlFor="installed_date">Installed Date</Label>
                  <Input
                    id="installed_date"
                    type="date"
                    value={formData.installed_date}
                    onChange={(e) => setFormData({ ...formData, installed_date: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="need_reorder"
                  checked={formData.need_reorder}
                  onCheckedChange={(checked) => setFormData({ ...formData, need_reorder: checked })}
                />
                <Label htmlFor="need_reorder">Need Reorder</Label>
              </div>
              {formData.need_reorder && (
                <>
                  <div>
                    <Label htmlFor="reorder_reason">Reorder Reason</Label>
                    <Select value={formData.reorder_reason} onValueChange={(value) => setFormData({ ...formData, reorder_reason: value })}>
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
                    <Label htmlFor="reorder_date">Reorder Date</Label>
                    <Input
                      id="reorder_date"
                      type="date"
                      value={formData.reorder_date}
                      onChange={(e) => setFormData({ ...formData, reorder_date: e.target.value })}
                    />
                  </div>
                </>
              )}
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
  );
}