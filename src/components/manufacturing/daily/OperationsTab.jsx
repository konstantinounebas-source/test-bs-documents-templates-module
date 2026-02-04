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

export default function OperationsTab({ batchId, department }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [formData, setFormData] = useState({
    item_code: '',
    entry_type: '',
    operation_profile: '',
    operation: '',
    qty_operation: ''
  });

  const { data: itemCodes = [], isLoading: itemCodesLoading } = useBatchItemCodes(batchId, department);
  const hasItemCodes = itemCodes.length > 0;

  const { data: operations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.list()
  });

  const { data: profileNames = [] } = useQuery({
    queryKey: ['Operation_Profile_Name'],
    queryFn: async () => {
      const all = await base44.entities.Operation_Profile_Name.list();
      return all.filter(p => p.is_active !== false);
    }
  });

  // Fetch batch header to get date and department for scheduled data lookup
  const { data: batchHeader } = useQuery({
    queryKey: ['Batch_Header', batchId],
    queryFn: () => base44.entities.Batch_Header.filter({ id: batchId }),
    enabled: !!batchId,
    select: (data) => data?.[0]
  });

  // Fetch scheduled data for auto-filling operations
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
    queryKey: ['Operations', batchId],
    queryFn: () => base44.entities.Operations.filter({ batch_header_id: batchId }),
    enabled: !!batchId,
    staleTime: 0
  });

  // Auto-fill operations from scheduled data (only on initial load)
  useMemo(() => {
    if (!batchId || lines.length > 0 || scheduledData.length === 0) return;

    // Create operation records from scheduled data
    const autoFillLines = scheduledData.map(sd => ({
      batch_header_id: batchId,
      item_code: sd.item_code,
      entry_type: 'PROFILE',
      operation_profile: sd.operation_profile_id || '',
      operation: '',
      qty_operation: sd.ops_qty || 0
    }));

    if (autoFillLines.length === 0) return;

    // Create all lines
    Promise.all(autoFillLines.map(line =>
      base44.entities.Operations.create(line)
    )).then(() => {
      queryClient.invalidateQueries({ queryKey: ['Operations', batchId] });
      toast.success(`Auto-filled ${autoFillLines.length} operations from schedule`);
    }).catch(() => {
      // Silent fail on auto-fill
    });
  }, [batchId, lines.length, scheduledData, queryClient]);

  const filteredLines = useMemo(() => {
    if (!searchFilter) return lines;
    const term = searchFilter.toLowerCase();
    return lines.filter(l => l.item_code?.toLowerCase().includes(term));
  }, [lines, searchFilter]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Operations.create({
      batch_header_id: batchId,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['Operations']);
      setShowAddDialog(false);
      setFormData({ item_code: '', entry_type: '', operation_profile: '', operation: '', qty_operation: '' });
      toast.success('Operation added');
    },
    onError: () => toast.error('Failed to add operation')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Operations.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['Operations']);
      setShowAddDialog(false);
      setEditingLine(null);
      setFormData({ item_code: '', entry_type: '', operation_profile: '', operation: '', qty_operation: '' });
      toast.success('Operation updated');
    },
    onError: () => toast.error('Failed to update operation')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Operations.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['Operations']);
      toast.success('Operation deleted');
    },
    onError: () => toast.error('Failed to delete operation')
  });

  const handleAdd = () => {
    if (!formData.item_code || !formData.entry_type) {
      toast.error('Item code and entry type are required');
      return;
    }

    const data = {
      ...formData,
      qty_operation: parseFloat(formData.qty_operation) || 0
    };

    if (editingLine) {
      updateMutation.mutate({ id: editingLine.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (line) => {
    setEditingLine(line);
    // When editing, only get operations/profiles from the currently selected entry type
    setFormData({
      item_code: line.item_code,
      entry_type: line.entry_type,
      operation_profile: line.operation_profile || '',
      operation: line.operation || '',
      qty_operation: line.qty_operation || ''
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({ item_code: '', entry_type: '', operation_profile: '', operation: '', qty_operation: '' });
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
        <h3 className="text-lg font-semibold">Operations</h3>
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
          Add Operation
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Item Code</TableHead>
              <TableHead className="font-semibold">Entry Type</TableHead>
              <TableHead className="font-semibold">Profile</TableHead>
              <TableHead className="font-semibold">Operation</TableHead>
              <TableHead className="font-semibold">Qty</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-12">
                  {searchFilter ? 'No matching operations found' : 'No operations defined. Click "Add Operation" to start.'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredLines.map(line => (
                  <TableRow key={line.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{line.item_code}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium ${
                        line.entry_type === 'PROFILE' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {line.entry_type}
                      </span>
                    </TableCell>
                    <TableCell>{line.operation_profile || '-'}</TableCell>
                    <TableCell>{line.operation || '-'}</TableCell>
                    <TableCell className="font-mono">{line.qty_operation || 0}</TableCell>
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
                  <TableCell colSpan={4} className="text-right">Total Quantity:</TableCell>
                  <TableCell className="font-mono font-bold">
                    {filteredLines.reduce((sum, line) => sum + (parseFloat(line.qty_operation) || 0), 0).toFixed(2)}
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
            <DialogTitle>{editingLine ? 'Edit Operation' : 'Add Operation'}</DialogTitle>
            <DialogDescription>
              {editingLine ? 'Update operation for this item' : 'Record operation performed on an item'}
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
              <Label>Entry Type *</Label>
              <Select value={formData.entry_type} onValueChange={(v) => setFormData({ ...formData, entry_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROFILE">PROFILE</SelectItem>
                  <SelectItem value="OPERATION">OPERATION</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.entry_type === 'PROFILE' && (
              <div>
                <Label>Operation Profile</Label>
                <Select value={formData.operation_profile} onValueChange={(v) => setFormData({ ...formData, operation_profile: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select profile name" />
                  </SelectTrigger>
                  <SelectContent>
                    {profileNames.map(pn => (
                      <SelectItem key={pn.id} value={pn.name}>{pn.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.entry_type === 'OPERATION' && (
              <div>
                <Label>Operation</Label>
                <Select value={formData.operation} onValueChange={(v) => setFormData({ ...formData, operation: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select operation" />
                  </SelectTrigger>
                  <SelectContent>
                    {operations.map(op => (
                      <SelectItem key={op.id} value={op.name}>{op.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Qty Operation</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.qty_operation}
                onChange={(e) => setFormData({ ...formData, qty_operation: e.target.value })}
              />
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