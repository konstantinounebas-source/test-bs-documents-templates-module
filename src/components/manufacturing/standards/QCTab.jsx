import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBundleItemCodes } from './useBundleItemCodes';

export default function QCTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({ item_code: '', qc_type: '', qc_level: '', time_add_min: '', notes: '' });
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch QC types (allowed only, max 10)
  const { data: allQCTypes = [] } = useQuery({
    queryKey: ['QC_Type'],
    queryFn: () => base44.entities.QC_Type.list()
  });

  const qcTypes = allQCTypes.filter(qt => qt.is_active).slice(0, 10);

  // Fetch QC levels
  const { data: qcLevels = [] } = useQuery({
    queryKey: ['QCLevel'],
    queryFn: () => base44.entities.QCLevel.filter({ is_active: true })
  });

  // Fetch item codes from DATA tab (master list)
  const { data: itemCodes = [], isLoading: itemCodesLoading } = useBundleItemCodes(bundle?.id);
  const hasItemCodes = itemCodes.length > 0;

  // Fetch lines
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['QCSetLines', bundle.id],
    queryFn: () => base44.entities.QCSetLines.filter({ bundle_id: bundle.id }),
    enabled: !!bundle
  });

  // Filtered lines
  const filteredLines = useMemo(() => {
    if (!searchFilter) return lines;
    const term = searchFilter.toLowerCase();
    return lines.filter(l => l.item_code?.toLowerCase().includes(term));
  }, [lines, searchFilter]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.QCSetLines.create({
        bundle_id: bundle.id,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['QCSetLines'] });
      setShowAddDialog(false);
      setFormData({ qc_type: '', qc_level: '', time_add_min: '', notes: '' });
      toast.success('QC line added');
    },
    onError: (error) => {
      toast.error('Failed to add: ' + error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.QCSetLines.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['QCSetLines'] });
      toast.success('QC line deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  const handleAdd = () => {
    if (!formData.item_code || !formData.qc_type || !formData.qc_level || !formData.time_add_min) {
      toast.error('Please fill required fields');
      return;
    }
    createMutation.mutate({
      item_code: formData.item_code,
      qc_type: formData.qc_type,
      qc_level: formData.qc_level,
      time_add_min: parseFloat(formData.time_add_min),
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
            Add Item Codes in DATA tab first before defining QC standards.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center gap-4">
        <h3 className="text-lg font-semibold">QC Standards</h3>
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
        {isEditable && (
          <Button 
            onClick={() => setShowAddDialog(true)} 
            variant="outline" 
            size="sm"
            disabled={!hasItemCodes}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add QC Line
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Item Code</TableHead>
              <TableHead className="font-semibold">QC Type</TableHead>
              <TableHead className="font-semibold">QC Level</TableHead>
              <TableHead className="font-semibold">Time Added (min)</TableHead>
              <TableHead className="font-semibold">Notes</TableHead>
              {isEditable && <TableHead className="font-semibold">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-12">
                  {searchFilter ? 'No matching QC standards found' : 'No QC standards defined. Click "Add QC Line" to start.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLines.map(line => (
                <TableRow key={line.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">{line.item_code}</TableCell>
                  <TableCell>{line.qc_type}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-sm font-medium">
                      {line.qc_level}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">{line.time_add_min}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add QC Standard</DialogTitle>
            <DialogDescription>Define a QC standard for this bundle</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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

            <div>
              <Label>QC Level *</Label>
              <Select value={formData.qc_level} onValueChange={(v) => setFormData({ ...formData, qc_level: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select QC level" />
                </SelectTrigger>
                <SelectContent>
                  {qcLevels.map(ql => (
                    <SelectItem key={ql.id} value={ql.name}>{ql.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Time Added (min) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.time_add_min}
                onChange={(e) => setFormData({ ...formData, time_add_min: e.target.value })}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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