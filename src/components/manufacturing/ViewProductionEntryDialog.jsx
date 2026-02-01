import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Calendar, Building2, FileText, Package, Users, AlertCircle } from "lucide-react";

export default function ViewProductionEntryDialog({ open, onOpenChange, batch }) {
  const { data: batchLines = [], isLoading: linesLoading } = useQuery({
    queryKey: ['Batch_Lines', batch?.id],
    queryFn: () => base44.entities.Batch_Lines.filter({ batch_header_id: batch.id }),
    enabled: !!batch
  });

  const { data: operations = [], isLoading: opsLoading } = useQuery({
    queryKey: ['Operations', batch?.id],
    queryFn: () => base44.entities.Operations.filter({ batch_header_id: batch.id }),
    enabled: !!batch
  });

  const { data: qcInitialStock = [], isLoading: qcLoading } = useQuery({
    queryKey: ['QC_Initial_Stock', batch?.id],
    queryFn: () => base44.entities.QC_Initial_Stock.filter({ batch_header_id: batch.id }),
    enabled: !!batch
  });

  const { data: teamTimePersons = [], isLoading: teamLoading } = useQuery({
    queryKey: ['Team_Time_Persons', batch?.id],
    queryFn: () => base44.entities.Team_Time_Persons.filter({ batch_header_id: batch.id }),
    enabled: !!batch
  });

  if (!batch) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Production Entry Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Date</p>
                    <p className="font-semibold">{new Date(batch.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Department</p>
                    <p className="font-semibold">{batch.department}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Created By</p>
                    <p className="font-semibold">{batch.created_by}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {batch.notes && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-600">{batch.notes}</p>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="lines" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="lines">Batch Lines ({batchLines.length})</TabsTrigger>
              <TabsTrigger value="operations">Operations ({operations.length})</TabsTrigger>
              <TabsTrigger value="qc">QC ({qcInitialStock.length})</TabsTrigger>
              <TabsTrigger value="team">Team ({teamTimePersons.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="lines" className="mt-4">
              {linesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : batchLines.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No batch lines found</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Processed</TableHead>
                        <TableHead>From Stock</TableHead>
                        <TableHead>Good</TableHead>
                        <TableHead>Scrap</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchLines.map(line => (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium">{line.item_code}</TableCell>
                          <TableCell>{line.scheduled_qty || 0}</TableCell>
                          <TableCell>{line.qty_processed || 0}</TableCell>
                          <TableCell>{line.qty_from_stock || 0}</TableCell>
                          <TableCell className="text-green-600">{line.qty_out_good || 0}</TableCell>
                          <TableCell className="text-red-600">{line.qty_scrap || 0}</TableCell>
                          <TableCell className="text-sm text-slate-500">{line.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="operations" className="mt-4">
              {opsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : operations.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No operations found</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Operation/Profile</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Time (min)</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {operations.map(op => (
                        <TableRow key={op.id}>
                          <TableCell className="font-medium">{op.item_code}</TableCell>
                          <TableCell>
                            <Badge variant={op.entry_type === 'PROFILE' ? 'default' : 'secondary'}>
                              {op.entry_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{op.operation_profile || op.operation || '-'}</TableCell>
                          <TableCell>{op.qty_operation || 0}</TableCell>
                          <TableCell>{op.operation_time_min || 0}</TableCell>
                          <TableCell className="text-sm text-slate-500">{op.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="qc" className="mt-4">
              {qcLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : qcInitialStock.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No QC records found</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>QC Type</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Qty Affected</TableHead>
                        <TableHead>Time Add (min)</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qcInitialStock.map(qc => (
                        <TableRow key={qc.id}>
                          <TableCell className="font-medium">{qc.item_code}</TableCell>
                          <TableCell>{qc.qc_type}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{qc.qc_level}</Badge>
                          </TableCell>
                          <TableCell>{qc.qty_affected || 0}</TableCell>
                          <TableCell>{qc.time_add_min || 0}</TableCell>
                          <TableCell className="text-sm text-slate-500">{qc.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="team" className="mt-4">
              {teamLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : teamTimePersons.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No team records found</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Person Name</TableHead>
                        <TableHead>From Time</TableHead>
                        <TableHead>To Time</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamTimePersons.map(person => (
                        <TableRow key={person.id}>
                          <TableCell className="font-medium">{person.person_name}</TableCell>
                          <TableCell>{person.from_time}</TableCell>
                          <TableCell>{person.to_time}</TableCell>
                          <TableCell className="text-sm text-slate-500">{person.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}