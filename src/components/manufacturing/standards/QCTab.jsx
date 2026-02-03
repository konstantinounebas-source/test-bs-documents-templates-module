import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function QCTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({ qc_type: '', qc_level: '', time_add_min: '', notes: '' });

  // Fetch QC types (allowed only, max 10)
  const { data: allQCTypes = [] } = useQuery({
    queryKey: ['QC_Type'],
    queryFn: () => base44.entities.QC_Type.list()
  });

  const qcTypes = allQCTypes.filter(qt => qt.is_active).slice(0, 10);

  // Fetch lines
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['QCSetLines', bundle.id],
    queryFn: () => base44.entities.QCSetLines.filter({ bundle_id: bundle.id }),
    enabled: !!bundle
  });

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
    if (!formData.qc_type || !formData.qc_level || !formData.time_add_min) {
      toast.error('Please fill required fields');
      return;
    }
    createMutation.mutate({
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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">QC Standards</h3>
        {isEditable && (
          <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add QC Line
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>QC Type</TableHead>
              <TableHead>QC Level</TableHead>
              <TableHead>Time Added (min)</TableHead>
              <TableHead>Notes</TableHead>
              {isEditable && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  No QC standards defined. Click "Add QC Line" to start.
                </TableCell>
              </TableRow>
            ) : (
              lines.map(line => (
                <TableRow key={line.id}>
                  <TableCell>{line.qc_type}</TableCell>
                  <TableCell>{line.qc_level}</TableCell>
                  <TableCell>{line.time_add_min}</TableCell>
                  <TableCell>{line.notes || '-'}</TableCell>
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
              <Input
                placeholder="e.g., L1, L2, L3"
                value={formData.qc_level}
                onChange={(e) => setFormData({ ...formData, qc_level: e.target.value })}
              />
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