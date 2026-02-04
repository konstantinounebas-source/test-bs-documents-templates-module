import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Search, AlertCircle, Edit2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

function useBatchItemCodes(batchId, department) {
  return useQuery({
    queryKey: ['BatchItemCodes', batchId, department],
    queryFn: async () => {
      if (!batchId || !department) return [];
      
      // Get batch header to get its bundle_id
      const batch = await base44.entities.Batch_Header.filter({ id: batchId });
      if (!batch || batch.length === 0) return [];
      
      const bundleId = batch[0].bundle_id;
      const lines = await base44.entities.StdSetLines.filter({ bundle_id: bundleId });
      
      const uniqueItemCodes = [...new Set(lines.map(l => l.item_code))].filter(Boolean);
      return uniqueItemCodes.sort();
    },
    enabled: !!batchId && !!department,
    staleTime: 0
  });
}

export default function QCInitialStockTab({ batchId, department }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [formData, setFormData] = useState({
    item_code: '',
    qc_type: '',
    qc_level: '',
    qty_affected: ''
  });

  const { data: itemCodes = [], isLoading: itemCodesLoading } = useBatchItemCodes(batchId, department);
  const hasItemCodes = itemCodes.length > 0;

  const { data: qcTypes = [] } = useQuery({
    queryKey: ['QC_Type'],
    queryFn: () => base44.entities.QC_Type.list()
  });

  const { data: qcLevels = [] } = useQuery({
    queryKey: ['QCLevel'],
    queryFn: () => base44.entities.QCLevel.filter({ is_active: true })
  });

  // Fetch batch header to get date and department for scheduled data lookup
  const { data: batchHeader } = useQuery({
    queryKey: ['Batch_Header', batchId],
    queryFn: () => base44.entities.Batch_Header.filter({ id: batchId }),
    enabled: !!batchId,
    select: (data) => data?.[0]
  });

  // Fetch scheduled data for auto-filling QC records
  const { data: scheduledData = [] } = useQuery({
    queryKey: ['ScheduledData', batchHeader?.date, batchHeader?.department],
    queryFn: () => base44.entities.ScheduledData.filter({
      date: batchHeader.date,
      department_id: batchHeader.department
    }),
    enabled: !!batchHeader?.date && !!batchHeader?.department,
    staleTime: 0
  });

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['QC_Initial_Stock', batchId],
    queryFn: () => base44.entities.QC_Initial_Stock.filter({ batch_header_id: batchId }),
    enabled: !!batchId,
    staleTime: 0
  });

  // Fetch QC rules from bundle for calculated extra time
  const { data: qcSetLines = [] } = useQuery({
    queryKey: ['QCSetLines', batchHeader?.bundle_id],
    queryFn: () => base44.entities.QCSetLines.filter({ bundle_id: batchHeader.bundle_id }),
    enabled: !!batchHeader?.bundle_id,
    staleTime: 0
  });

  // Auto-fill QC initial stock from scheduled data (only on initial load)
  useMemo(() => {
    if (!batchId || lines.length > 0 || scheduledData.length === 0) return;

    // Create QC records from scheduled data that have QC qty
    const autoFillLines = scheduledData
      .filter(sd => sd.qc_qty && sd.qc_qty > 0)
      .map(sd => ({
        batch_header_id: batchId,
        item_code: sd.item_code,
        qc_type: sd.qc_type || '',
        qc_level: sd.qc_level || '',
        qty_affected: sd.qc_qty
      }));

    if (autoFillLines.length === 0) return;

    // Create all lines
    Promise.all(autoFillLines.map(line =>
      base44.entities.QC_Initial_Stock.create(line)
    )).then(() => {
      queryClient.invalidateQueries({ queryKey: ['QC_Initial_Stock', batchId] });
      toast.success(`Auto-filled ${autoFillLines.length} QC records from schedule`);
    }).catch(() => {
      // Silent fail on auto-fill
    });
  }, [batchId, lines.length, scheduledData, queryClient]);

  // Add QC per-piece to each line
  const linesWithQCPerPiece = useMemo(() => {
    return lines.map(line => {
      const trimmedItemCode = (line.item_code || '').trim();
      const qcRule = qcSetLines.find(
        ql => (ql.item_code || '').trim().toLowerCase() === trimmedItemCode.toLowerCase() &&
             ql.qc_type === line.qc_type &&
             ql.qc_level === line.qc_level
      );
      
      let qcPerPiece = 0;
      if (qcRule && qcRule.calculated_extra_time) {
        qcPerPiece = parseFloat(qcRule.calculated_extra_time);
      }
      
      return {
        ...line,
        qcPerPiece: qcPerPiece.toFixed(2)
      };
    });
  }, [lines, qcSetLines]);

  const filteredLines = useMemo(() => {
    if (!searchFilter) return linesWithQCPerPiece;
    const term = searchFilter.toLowerCase();
    return linesWithQCPerPiece.filter(l => l.item_code?.toLowerCase().includes(term));
  }, [linesWithQCPerPiece, searchFilter]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.QC_Initial_Stock.create({
      batch_header_id: batchId,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['QC_Initial_Stock']);
      setShowAddDialog(false);
      setFormData({ item_code: '', qc_type: '', qc_level: '', qty_affected: '' });
      toast.success('QC initial stock added');
    },
    onError: () => toast.error('Failed to add QC initial stock')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QC_Initial_Stock.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['QC_Initial_Stock']);
      setShowAddDialog(false);
      setEditingLine(null);
      setFormData({ item_code: '', qc_type: '', qc_level: '', qty_affected: '' });
      toast.success('QC initial stock updated');
    },
    onError: () => toast.error('Failed to update QC initial stock')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.QC_Initial_Stock.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['QC_Initial_Stock']);
      toast.success('QC initial stock deleted');
    },
    onError: () => toast.error('Failed to delete QC initial stock')
  });

  const handleAdd = () => {
    if (!formData.item_code || !formData.qc_type || !formData.qc_level || !formData.qty_affected) {
      toast.error('All fields are required');
      return;
    }

    const data = {
      ...formData,
      qty_affected: parseFloat(formData.qty_affected)
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
      qty_affected: line.qty_affected || ''
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({ item_code: '', qc_type: '', qc_level: '', qty_affected: '' });
    setEditingLine(null);
    setShowAddDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!hasItemCodes && !itemCodesLoading && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            No item codes found in active standards bundle for this department.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center gap-4">
        <h3 className="text-lg font-semibold">QC Initial Stock</h3>
        <div className="flex gap-2 items-center flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Filter by item code..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm" disabled={!hasItemCodes}>
          <Plus className="w-4 h-4 mr-2" />
          Add QC Stock
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Item Code</TableHead>
              <TableHead className="font-semibold">QC Type</TableHead>
              <TableHead className="font-semibold">QC Level</TableHead>
              <TableHead className="font-semibold">Qty Affected</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-12">
                  {searchFilter ? 'No matching QC records found' : 'No QC initial stock defined. Click "Add QC Stock" to start.'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredLines.map(line => (
                  <TableRow key={line.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{line.item_code}</TableCell>
                    <TableCell>{line.qc_type}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-sm font-medium">
                        {line.qc_level}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">{line.qty_affected}</TableCell>
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
                <TableRow className="bg-blue-50 font-semibold border-t-2">
                  <TableCell colSpan={3} className="text-right">Total:</TableCell>
                  <TableCell className="font-mono font-bold">
                    {filteredLines.reduce((sum, line) => sum + (parseFloat(line.qty_affected) || 0), 0).toFixed(2)}
                  </TableCell>
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
            <DialogTitle>{editingLine ? 'Edit QC Initial Stock' : 'Add QC Initial Stock'}</DialogTitle>
            <DialogDescription>
              {editingLine ? 'Update initial QC stock for this item' : 'Record initial QC stock for an item'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Item Code *</Label>
              <Select value={formData.item_code} onValueChange={(v) => setFormData({ ...formData, item_code: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item code from standards" />
                </SelectTrigger>
                <SelectContent>
                  {itemCodes.map(code => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
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
                <Label>Qty Affected *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.qty_affected}
                  onChange={(e) => setFormData({ ...formData, qty_affected: e.target.value })}
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