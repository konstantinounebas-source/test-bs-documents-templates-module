import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBundleItemCodes } from './useBundleItemCodes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function DailyTargetsTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [formData, setFormData] = useState({
    date: '',
    item_code: '',
    target_qty: '',
    notes: ''
  });

  // Fetch item codes from DATA tab (master list)
  const { data: itemCodes = [], isLoading: itemCodesLoading } = useBundleItemCodes(bundle?.id);
  const hasItemCodes = itemCodes.length > 0;

  // Fetch daily targets lines
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['Target_Daily', bundle.id],
    queryFn: () => base44.entities.Target_Daily.filter({ bundle_id: bundle.id }),
    enabled: !!bundle
  });

  // Filtered lines
  const filteredLines = useMemo(() => {
    if (!searchFilter) return lines;
    const term = searchFilter.toLowerCase();
    return lines.filter(l => l.item_code?.toLowerCase().includes(term) || l.date?.includes(term));
  }, [lines, searchFilter]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Target_Daily.create({
        bundle_id: bundle.id,
        department: bundle.department,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Target_Daily'] });
      setShowAddDialog(false);
      setFormData({
        date: '',
        item_code: '',
        target_qty: '',
        notes: ''
      });
      toast.success('Daily target added');
    },
    onError: (error) => {
      toast.error('Failed to add: ' + error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Target_Daily.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Target_Daily'] });
      toast.success('Daily target deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  const handleAdd = () => {
    if (!formData.date || !formData.item_code || !formData.target_qty) {
      toast.error('Please fill required fields');
      return;
    }
    createMutation.mutate({
      date: formData.date,
      item_code: formData.item_code,
      target_qty: parseFloat(formData.target_qty) || 0,
      notes: formData.notes
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
            Add Item Codes in DATA tab first before defining daily targets.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center gap-4">
        <h3 className="text-lg font-semibold">Daily Targets (Standards)</h3>
        <div className="flex gap-2 items-center flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Filter by item code or date..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {isEditable && (
          <Button 
            onClick={() => setShowAddDialog(true)} 
            variant="outline" 
            size="sm"
            disabled={!hasItemCodes}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Target
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Item Code</TableHead>
              <TableHead className="font-semibold">Target Qty</TableHead>
              <TableHead className="font-semibold">Notes</TableHead>
              {isEditable && <TableHead className="font-semibold">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-12">
                  {searchFilter ? 'No matching daily targets found' : 'No daily targets defined. Click "Add Target" to start.'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredLines.map(line => (
                  <TableRow key={line.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{line.date}</TableCell>
                    <TableCell className="font-medium">{line.item_code}</TableCell>
                    <TableCell className="font-mono">{line.target_qty}</TableCell>
                    <TableCell className="text-slate-600">{line.notes || '-'}</TableCell>
                    {isEditable && (
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
                    )}
                  </TableRow>
                ))}
                <TableRow className="bg-green-50 font-semibold border-t-2">
                  <TableCell colSpan={2} className="text-right">Total Target Qty:</TableCell>
                  <TableCell className="font-mono font-bold">
                    {filteredLines.reduce((sum, line) => sum + (parseFloat(line.target_qty) || 0), 0).toFixed(2)}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Daily Target</DialogTitle>
            <DialogDescription>Define a daily target for production</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div>
              <Label>Item Code *</Label>
              <Select value={formData.item_code} onValueChange={(v) => setFormData({ ...formData, item_code: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item code from DATA tab" />
                </SelectTrigger>
                <SelectContent>
                  {itemCodes.map(code => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Target Quantity *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.target_qty}
                onChange={(e) => setFormData({ ...formData, target_qty: e.target.value })}
                placeholder="Enter target quantity"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
                rows={2}
              />
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