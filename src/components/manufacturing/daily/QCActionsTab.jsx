import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function QCActionsTab({ batchId, department }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [formData, setFormData] = useState({
    item_code: '',
    qc_type: '',
    qc_level: '',
    qc_qty: ''
  });

  // Fetch batch lines for item codes
  const { data: batchLines = [] } = useQuery({
    queryKey: ['Batch_Lines', batchId],
    queryFn: () => base44.entities.Batch_Lines.filter({ batch_header_id: batchId }),
    enabled: !!batchId,
    staleTime: 0
  });

  // Fetch batch header for bundle info
  const { data: batchHeader } = useQuery({
    queryKey: ['Batch_Header', batchId],
    queryFn: () => base44.entities.Batch_Header.filter({ id: batchId }),
    enabled: !!batchId,
    select: (data) => data?.[0]
  });

  // Fetch QC rules from bundle
  const { data: qcSetLines = [] } = useQuery({
    queryKey: ['QCSetLines', batchHeader?.bundle_id],
    queryFn: () => base44.entities.QCSetLines.filter({ bundle_id: batchHeader.bundle_id }),
    enabled: !!batchHeader?.bundle_id,
    staleTime: 0
  });

  const { data: qcTypes = [] } = useQuery({
    queryKey: ['QC_Type'],
    queryFn: () => base44.entities.QC_Type.list()
  });

  const { data: qcLevels = [] } = useQuery({
    queryKey: ['QCLevel'],
    queryFn: () => base44.entities.QCLevel.filter({ is_active: true })
  });

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['QC_Actions', batchId],
    queryFn: () => base44.entities.QC_Initial_Stock.filter({ batch_header_id: batchId }),
    enabled: !!batchId,
    staleTime: 0
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.QC_Initial_Stock.create({
      batch_header_id: batchId,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['QC_Actions']);
      setShowAddDialog(false);
      setFormData({ item_code: '', qc_type: '', qc_level: '', qc_qty: '' });
      toast.success('QC action added');
    },
    onError: () => toast.error('Failed to add QC action')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QC_Initial_Stock.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['QC_Actions']);
      setShowAddDialog(false);
      setEditingLine(null);
      setFormData({ item_code: '', qc_type: '', qc_level: '', qc_qty: '' });
      toast.success('QC action updated');
    },
    onError: () => toast.error('Failed to update QC action')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.QC_Initial_Stock.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['QC_Actions']);
      toast.success('QC action deleted');
    },
    onError: () => toast.error('Failed to delete QC action')
  });

  const handleAdd = () => {
    if (!formData.item_code || !formData.qc_type || !formData.qc_level || !formData.qc_qty) {
      toast.error('All fields are required');
      return;
    }

    const data = {
      item_code: formData.item_code,
      qc_type: formData.qc_type,
      qc_level: formData.qc_level,
      qty_affected: parseFloat(formData.qc_qty)
    };

    if (editingLine) {
      updateMutation.mutate({ id: editingLine.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (line) => {
    setEditingLine(line);
    setFormData({
      item_code: line.item_code,
      qc_type: line.qc_type,
      qc_level: line.qc_level,
      qc_qty: line.qty_affected || ''
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({ item_code: '', qc_type: '', qc_level: '', qc_qty: '' });
    setEditingLine(null);
    setShowAddDialog(false);
  };

  // Calculate QC time per line
  const linesWithQCTime = useMemo(() => {
    return lines.map(line => {
      const qcRule = qcSetLines.find(
        ql => ql.item_code === line.item_code && 
             ql.qc_type === line.qc_type && 
             ql.qc_level === line.qc_level
      );

      let qcPerPiece = 0;
      if (qcRule && qcRule.time_per_unit) {
        qcPerPiece = parseFloat(qcRule.time_per_unit);
      }

      const qcQty = parseFloat(line.qty_affected) || 0;
      const qcTotal = qcPerPiece * qcQty;
      const qcTotalHours = (qcTotal / 60).toFixed(2);

      return {
        ...line,
        qcPerPiece: qcPerPiece.toFixed(2),
        qcTotal: qcTotal.toFixed(2),
        qcTotalHours
      };
    });
  }, [lines, qcSetLines]);

  const totals = useMemo(() => {
    const totalMinutes = linesWithQCTime.reduce((sum, line) => sum + parseFloat(line.qcTotal || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(2);
    return { totalMinutes: totalMinutes.toFixed(2), totalHours };
  }, [linesWithQCTime]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">QC Actions - Time Per Item</h3>
        <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add QC Action
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Item Code</TableHead>
              <TableHead className="font-semibold">QC Type</TableHead>
              <TableHead className="font-semibold">QC Level</TableHead>
              <TableHead className="font-semibold text-right">QC Qty</TableHead>
              <TableHead className="font-semibold text-right">QC Per-piece (min)</TableHead>
              <TableHead className="font-semibold text-right">QC Total (min)</TableHead>
              <TableHead className="font-semibold text-right">QC Total (hours)</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linesWithQCTime.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-12">
                  No QC actions defined. Click "Add QC Action" to start.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {linesWithQCTime.map(line => (
                  <TableRow key={line.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{line.item_code}</TableCell>
                    <TableCell>{line.qc_type}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-sm font-medium">
                        {line.qc_level}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{(parseFloat(line.qty_affected) || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{line.qcPerPiece}</TableCell>
                    <TableCell className="text-right font-mono">{line.qcTotal}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-purple-600">{line.qcTotalHours}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(line)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => deleteMutation.mutate(line.id)}
                          variant="ghost"
                          size="icon"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-purple-50 font-semibold border-t-2">
                  <TableCell colSpan={5} className="text-right">Total QC Time:</TableCell>
                  <TableCell className="text-right font-mono">{totals.totalMinutes}</TableCell>
                  <TableCell className="text-right font-mono text-purple-600">{totals.totalHours}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowAddDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLine ? 'Edit QC Action' : 'Add QC Action'}</DialogTitle>
            <DialogDescription>
              {editingLine ? 'Update QC action for this item' : 'Record QC action for an item'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Item Code *</Label>
              <Select value={formData.item_code} onValueChange={(v) => setFormData({ ...formData, item_code: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item code" />
                </SelectTrigger>
                <SelectContent>
                  {batchLines.map(line => (
                    <SelectItem key={line.item_code} value={line.item_code}>{line.item_code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>QC Type *</Label>
              <Select value={formData.qc_type} onValueChange={(v) => setFormData({ ...formData, qc_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select QC type" />
                </SelectTrigger>
                <SelectContent>
                  {qcTypes.map(qt => (
                    <SelectItem key={qt.id} value={qt.name}>{qt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>QC Level *</Label>
                <Select value={formData.qc_level} onValueChange={(v) => setFormData({ ...formData, qc_level: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {qcLevels.map(ql => (
                      <SelectItem key={ql.id} value={ql.name}>{ql.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>QC Qty *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.qc_qty}
                  onChange={(e) => setFormData({ ...formData, qc_qty: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : editingLine ? (
                <Edit2 className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {editingLine ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}