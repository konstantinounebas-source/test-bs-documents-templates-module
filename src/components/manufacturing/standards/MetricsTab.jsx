import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function MetricsTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    metric_code: '',
    metric_name: '',
    applies_to: '',
    description: '',
    formula_full: '',
    source_tables_fields: ''
  });

  // Fetch lines
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['MetricsDefSetLines', bundle.id],
    queryFn: () => base44.entities.MetricsDefSetLines.filter({ bundle_id: bundle.id }),
    enabled: !!bundle
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.MetricsDefSetLines.create({
        bundle_id: bundle.id,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['MetricsDefSetLines'] });
      setShowAddDialog(false);
      setFormData({
        metric_code: '',
        metric_name: '',
        applies_to: '',
        description: '',
        formula_full: '',
        source_tables_fields: ''
      });
      toast.success('Metric definition added');
    },
    onError: (error) => {
      toast.error('Failed to add: ' + error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.MetricsDefSetLines.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['MetricsDefSetLines'] });
      toast.success('Metric definition deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  const handleAdd = () => {
    if (!formData.metric_code || !formData.metric_name || !formData.formula_full) {
      toast.error('Please fill required fields');
      return;
    }
    createMutation.mutate(formData);
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
        <h3 className="text-lg font-semibold">Metrics Definitions</h3>
        {isEditable && (
          <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Metric
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric Code</TableHead>
              <TableHead>Metric Name</TableHead>
              <TableHead>Applies To</TableHead>
              <TableHead>Formula</TableHead>
              {isEditable && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  No metrics definitions. Click "Add Metric" to start.
                </TableCell>
              </TableRow>
            ) : (
              lines.map(line => (
                <TableRow key={line.id}>
                  <TableCell className="font-mono text-xs">{line.metric_code}</TableCell>
                  <TableCell>{line.metric_name}</TableCell>
                  <TableCell>{line.applies_to || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs">{line.formula_full}</TableCell>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Metric Definition</DialogTitle>
            <DialogDescription>Define a metric formula for this bundle</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[500px] overflow-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Metric Code *</Label>
                <Input
                  placeholder="e.g., TOTAL_PROD_TIME_MIN"
                  value={formData.metric_code}
                  onChange={(e) => setFormData({ ...formData, metric_code: e.target.value })}
                />
              </div>

              <div>
                <Label>Metric Name *</Label>
                <Input
                  placeholder="e.g., Total Production Time"
                  value={formData.metric_name}
                  onChange={(e) => setFormData({ ...formData, metric_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Applies To</Label>
              <Input
                placeholder="e.g., Department, Item, Global"
                value={formData.applies_to}
                onChange={(e) => setFormData({ ...formData, applies_to: e.target.value })}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of this metric"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label>Formula *</Label>
              <Textarea
                placeholder="e.g., SUM(Operations.operation_time_min)"
                value={formData.formula_full}
                onChange={(e) => setFormData({ ...formData, formula_full: e.target.value })}
              />
            </div>

            <div>
              <Label>Source Tables/Fields</Label>
              <Textarea
                placeholder="e.g., Operations.operation_time_min, Batch_Lines.qty_out_good"
                value={formData.source_tables_fields}
                onChange={(e) => setFormData({ ...formData, source_tables_fields: e.target.value })}
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