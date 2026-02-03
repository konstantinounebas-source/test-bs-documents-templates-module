import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Search, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

function useBatchItemCodes(batchId, department) {
  return useQuery({
    queryKey: ['BatchItemCodes', batchId, department],
    queryFn: async () => {
      if (!batchId || !department) return [];
      
      // Get active bundle for this department
      const bundles = await base44.entities.StandardsBundle.filter({ 
        department: department,
        status: 'ACTIVE'
      });
      
      if (bundles.length === 0) return [];
      
      const activeBundle = bundles[0];
      const lines = await base44.entities.StdSetLines.filter({ bundle_id: activeBundle.id });
      
      const uniqueItemCodes = [...new Set(lines.map(l => l.item_code))].filter(Boolean);
      return uniqueItemCodes.sort();
    },
    enabled: !!batchId && !!department,
    staleTime: 0
  });
}

export default function BatchLinesTab({ batchId, department }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [formData, setFormData] = useState({
    item_code: '',
    scheduled_qty: '',
    qty_processed: '',
    qty_out_good: '',
    qty_scrap: ''
  });

  const { data: itemCodes = [], isLoading: itemCodesLoading } = useBatchItemCodes(batchId, department);
  const hasItemCodes = itemCodes.length > 0;

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['Batch_Lines', batchId],
    queryFn: () => base44.entities.Batch_Lines.filter({ batch_header_id: batchId }),
    enabled: !!batchId
  });

  const filteredLines = useMemo(() => {
    if (!searchFilter) return lines;
    const term = searchFilter.toLowerCase();
    return lines.filter(l => l.item_code?.toLowerCase().includes(term));
  }, [lines, searchFilter]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Batch_Lines.create({
      batch_header_id: batchId,
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['Batch_Lines']);
      setShowAddDialog(false);
      setFormData({ item_code: '', scheduled_qty: '', qty_processed: '', qty_out_good: '', qty_scrap: '' });
      toast.success('Batch line added');
    },
    onError: () => toast.error('Failed to add batch line')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Batch_Lines.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['Batch_Lines']);
      toast.success('Batch line deleted');
    },
    onError: () => toast.error('Failed to delete batch line')
  });

  const handleAdd = () => {
    if (!formData.item_code) {
      toast.error('Item code is required');
      return;
    }
    createMutation.mutate({
      item_code: formData.item_code,
      scheduled_qty: parseFloat(formData.scheduled_qty) || 0,
      qty_processed: parseFloat(formData.qty_processed) || 0,
      qty_out_good: parseFloat(formData.qty_out_good) || 0,
      qty_scrap: parseFloat(formData.qty_scrap) || 0
    });
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
            No item codes found in active standards bundle for this department. Please set up standards first.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center gap-4">
        <h3 className="text-lg font-semibold">Batch Lines</h3>
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
          Add Line
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Code</TableHead>
              <TableHead>Scheduled Qty</TableHead>
              <TableHead>Qty Processed</TableHead>
              <TableHead>Qty Out Good</TableHead>
              <TableHead>Qty Scrap</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500">
                  {searchFilter ? 'No matching batch lines found' : 'No batch lines defined. Click "Add Line" to start.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLines.map(line => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.item_code}</TableCell>
                  <TableCell>{line.scheduled_qty || 0}</TableCell>
                  <TableCell>{line.qty_processed || 0}</TableCell>
                  <TableCell>{line.qty_out_good || 0}</TableCell>
                  <TableCell>{line.qty_scrap || 0}</TableCell>
                  <TableCell>
                    <Button
                      onClick={() => deleteMutation.mutate(line.id)}
                      variant="ghost"
                      size="icon"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Batch Line</DialogTitle>
            <DialogDescription>Add production quantities for an item</DialogDescription>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scheduled Qty</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.scheduled_qty}
                  onChange={(e) => setFormData({ ...formData, scheduled_qty: e.target.value })}
                />
              </div>
              <div>
                <Label>Qty Processed</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.qty_processed}
                  onChange={(e) => setFormData({ ...formData, qty_processed: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Qty Out Good</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.qty_out_good}
                  onChange={(e) => setFormData({ ...formData, qty_out_good: e.target.value })}
                />
              </div>
              <div>
                <Label>Qty Scrap</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.qty_scrap}
                  onChange={(e) => setFormData({ ...formData, qty_scrap: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}