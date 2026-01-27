import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function EditStickerItemDialog({ open, onClose, stickerItem, onSaved }) {
  const [formData, setFormData] = useState({
    status: "",
    installed: false,
    installed_date: "",
    custody_status: "",
    need_reorder: false,
    reorder_reason: "",
    reorder_date: "",
    comments: ""
  });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (open && stickerItem) {
      setFormData({
        status: stickerItem.status || "",
        installed: stickerItem.installed || false,
        installed_date: stickerItem.installed_date || "",
        custody_status: stickerItem.custody_status || "",
        need_reorder: stickerItem.need_reorder || false,
        reorder_reason: stickerItem.reorder_reason || "",
        reorder_date: stickerItem.reorder_date || "",
        comments: stickerItem.comments || ""
      });
      loadUsers();
    }
  }, [open, stickerItem]);

  const loadUsers = async () => {
    const usersList = await base44.entities.User.list();
    setUsers(usersList);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation for Lost/Damaged custody status
    if ((formData.custody_status === "Lost" || formData.custody_status === "Damaged") && 
        (!formData.reorder_reason || !formData.reorder_date)) {
      alert("Reorder Reason and Reorder Date are required when custody status is Lost or Damaged");
      return;
    }

    setLoading(true);

    try {
      const user = await base44.auth.me();
      const updateData = { ...formData };

      // If marking as installed, record who and when
      if (formData.installed && !stickerItem.installed) {
        updateData.installed_date = new Date().toISOString().split('T')[0];
        updateData.installed_by = user.email;
        updateData.custody_status = "Installed";
        updateData.status = "Installed";
      }

      await base44.entities.StickerItem.update(stickerItem.id, updateData);

      // Check and update Stop.all_stickers_installed
      await updateStopAllStickersInstalled(stickerItem.stop_id);

      onSaved();
      onClose();
    } catch (error) {
      console.error("Error updating sticker item:", error);
    }

    setLoading(false);
  };

  const updateStopAllStickersInstalled = async (stopId) => {
    const allStickers = await base44.entities.StickerItem.filter({ stop_id: stopId });
    const allInstalled = allStickers.length > 0 && allStickers.every(item => item.installed);
    
    await base44.entities.Stop.update(stopId, {
      all_stickers_installed: allInstalled
    });
  };

  const requiresReorderInfo = formData.custody_status === "Lost" || formData.custody_status === "Damaged";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sticker Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
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
                <Select
                  value={formData.custody_status}
                  onValueChange={(value) => setFormData({ ...formData, custody_status: value })}
                >
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

            {requiresReorderInfo && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Reorder Reason and Date are required when custody status is Lost or Damaged
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reorder_reason">Reorder Reason {requiresReorderInfo && "*"}</Label>
                <Select
                  value={formData.reorder_reason}
                  onValueChange={(value) => setFormData({ ...formData, reorder_reason: value })}
                  required={requiresReorderInfo}
                >
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
                <Label htmlFor="reorder_date">Reorder Date {requiresReorderInfo && "*"}</Label>
                <Input
                  id="reorder_date"
                  type="date"
                  value={formData.reorder_date}
                  onChange={(e) => setFormData({ ...formData, reorder_date: e.target.value })}
                  required={requiresReorderInfo}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="installed"
                checked={formData.installed}
                onCheckedChange={(checked) => setFormData({ ...formData, installed: checked })}
              />
              <Label htmlFor="installed">Mark as Installed</Label>
            </div>

            {formData.installed && (
              <div>
                <Label htmlFor="installed_date">Installation Date</Label>
                <Input
                  id="installed_date"
                  type="date"
                  value={formData.installed_date}
                  onChange={(e) => setFormData({ ...formData, installed_date: e.target.value })}
                />
              </div>
            )}

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