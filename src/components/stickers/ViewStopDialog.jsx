import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil } from "lucide-react";
import { base44 } from "@/api/base44Client";
import EditStickerItemDialog from "./EditStickerItemDialog";

export default function ViewStopDialog({ open, onClose, stop }) {
  const [stickerItems, setStickerItems] = useState([]);
  const [stickerTemplates, setStickerTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (open && stop) {
      loadData();
    }
  }, [open, stop]);

  const loadData = async () => {
    setLoading(true);
    const [items, templates] = await Promise.all([
      base44.entities.StickerItem.filter({ stop_id: stop.id }),
      base44.entities.StickerTemplate.list()
    ]);
    setStickerItems(items);
    setStickerTemplates(templates);
    setLoading(false);
  };

  const getStickerTemplateName = (templateId) => {
    const template = stickerTemplates.find(t => t.id === templateId);
    return template ? template.sticker_name_category : "-";
  };

  const getStatusBadge = (status) => {
    const variants = {
      Needed: "secondary",
      Ordered: "outline",
      Received: "default",
      Installed: "default"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleItemSaved = () => {
    loadData();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stop: {stop?.stop_id} - {stop?.english_name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Greek Name</p>
                <p className="font-medium">{stop?.greek_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">English Name</p>
                <p className="font-medium">{stop?.english_name}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Sticker Items ({stickerItems.length})</h3>
              
              {stickerItems.length === 0 ? (
                <p className="text-sm text-gray-500 p-4 text-center">
                  No sticker items created yet. Set an Approved Shelter Type to auto-generate stickers.
                </p>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sticker Template</TableHead>
                        <TableHead>Print Line 1</TableHead>
                        <TableHead>Print Line 2</TableHead>
                        <TableHead>Print Line 3</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Custody</TableHead>
                        <TableHead>Installed</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stickerItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{getStickerTemplateName(item.sticker_template_id)}</TableCell>
                          <TableCell>{item.print_line_1}</TableCell>
                          <TableCell>{item.print_line_2}</TableCell>
                          <TableCell>{item.print_line_3}</TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.custody_status}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.installed ? "✓" : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      <EditStickerItemDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        stickerItem={selectedItem}
        onSaved={handleItemSaved}
      />
    </Dialog>
  );
}