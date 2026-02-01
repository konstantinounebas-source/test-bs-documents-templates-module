import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ClipboardList } from "lucide-react";
import CreateProductionEntryDialog from "@/components/manufacturing/CreateProductionEntryDialog";
import ViewProductionEntryDialog from "@/components/manufacturing/ViewProductionEntryDialog";

export default function MfgDailyProductionPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const { data: batches = [] } = useQuery({
    queryKey: ['Batch_Header'],
    queryFn: () => base44.entities.Batch_Header.list('-date')
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl flex items-center gap-2">
                <ClipboardList className="w-6 h-6" />
                Daily Production Entry
              </CardTitle>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Production Entry
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No production entries found</TableCell>
                  </TableRow>
                ) : (
                  batches.map(batch => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">
                        {new Date(batch.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{batch.department}</TableCell>
                      <TableCell>{batch.notes || '-'}</TableCell>
                      <TableCell>{batch.created_by}</TableCell>
                      <TableCell>
                        {new Date(batch.created_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedBatch(batch)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <CreateProductionEntryDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
        />

        <ViewProductionEntryDialog
          open={!!selectedBatch}
          onOpenChange={(open) => !open && setSelectedBatch(null)}
          batch={selectedBatch}
        />
      </div>
    </div>
  );
}