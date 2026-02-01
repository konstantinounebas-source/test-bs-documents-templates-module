import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AddConsumablesLineDialog from "./AddConsumablesLineDialog.jsx";

export default function ViewConsumablesSetDialog({ open, onOpenChange, set }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['Consumables_Standards_Lines', set?.id],
    queryFn: () => base44.entities.Consumables_Standards_Lines.filter({ consumables_standards_set_id: set.id }),
    enabled: !!set
  });

  const handleDelete = async (lineId) => {
    if (!confirm("Delete this line?")) return;
    
    try {
      await base44.entities.Consumables_Standards_Lines.delete(lineId);
      queryClient.invalidateQueries(['Consumables_Standards_Lines', set.id]);
    } catch (error) {
      console.error("Failed to delete line:", error);
    }
  };

  if (!set) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Consumables Set: {set.department} v{set.version_no}
              <Badge className="ml-3">{set.status}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Consumables Standards Lines</h3>
              <Button onClick={() => setShowAddDialog(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Line
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consumable</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Rate Type</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Rate Value</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-slate-500">
                        No consumables lines found
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map(line => (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium">{line.consumable}</TableCell>
                        <TableCell>{line.department}</TableCell>
                        <TableCell>{line.rate_type}</TableCell>
                        <TableCell>{line.item_code || '-'}</TableCell>
                        <TableCell>{line.operation || '-'}</TableCell>
                        <TableCell>{line.rate_value}</TableCell>
                        <TableCell>{line.unit}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(line.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AddConsumablesLineDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        setId={set?.id}
        department={set?.department}
      />
    </>
  );
}