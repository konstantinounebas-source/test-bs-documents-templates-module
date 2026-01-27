import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";

export default function CreateEditStickerTemplateDialog({ open, onClose, stickerTemplate, onStickerTemplateSaved }) {
  const [formData, setFormData] = useState({
    sticker_template_id: "",
    sticker_name_category: "",
    default_vendor: "",
    estimated_delivery_days: "",
    days_before_installation_to_receive: "",
    active: true,
    notes: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (stickerTemplate) {
        setFormData({
          sticker_template_id: stickerTemplate.sticker_template_id || "",
          sticker_name_category: stickerTemplate.sticker_name_category || "",
          default_vendor: stickerTemplate.default_vendor || "",
          estimated_delivery_days: stickerTemplate.estimated_delivery_days || "",
          days_before_installation_to_receive: stickerTemplate.days_before_installation_to_receive || "",
          active: stickerTemplate.active !== undefined ? stickerTemplate.active : true,
          notes: stickerTemplate.notes || ""
        });
      } else {
        setFormData({
          sticker_template_id: "",
          sticker_name_category: "",
          default_vendor: "",
          estimated_delivery_days: "",
          days_before_installation_to_receive: "",
          active: true,
          notes: ""
        });
      }
    }
  }, [open, stickerTemplate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (stickerTemplate) {
      await base44.entities.StickerTemplate.update(stickerTemplate.id, formData);
    } else {
      await base44.entities.StickerTemplate.create(formData);
    }

    setLoading(false);
    onStickerTemplateSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{stickerTemplate ? "Edit Sticker Template" : "Create New Sticker Template"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="sticker_template_id">Sticker Template ID *</Label>
              <Input
                id="sticker_template_id"
                value={formData.sticker_template_id}
                onChange={(e) => setFormData({ ...formData, sticker_template_id: e.target.value })}
                required
                disabled={!!stickerTemplate}
              />
            </div>

            <div>
              <Label htmlFor="sticker_name_category">Sticker Name / Category *</Label>
              <Input
                id="sticker_name_category"
                value={formData.sticker_name_category}
                onChange={(e) => setFormData({ ...formData, sticker_name_category: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="default_vendor">Default Vendor</Label>
              <Input
                id="default_vendor"
                value={formData.default_vendor}
                onChange={(e) => setFormData({ ...formData, default_vendor: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="estimated_delivery_days">Estimated Delivery (days)</Label>
              <Input
                id="estimated_delivery_days"
                type="number"
                min="0"
                value={formData.estimated_delivery_days}
                onChange={(e) => setFormData({ ...formData, estimated_delivery_days: e.target.value ? parseInt(e.target.value) : "" })}
              />
            </div>

            <div>
              <Label htmlFor="days_before_installation_to_receive">Days Before Installation to Receive</Label>
              <Input
                id="days_before_installation_to_receive"
                type="number"
                min="0"
                value={formData.days_before_installation_to_receive}
                onChange={(e) => setFormData({ ...formData, days_before_installation_to_receive: e.target.value ? parseInt(e.target.value) : "" })}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Active</Label>
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