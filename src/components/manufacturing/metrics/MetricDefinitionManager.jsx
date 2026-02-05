import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MetricDefinitionManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);
  const [formData, setFormData] = useState({
    metric_code: '',
    metric_name: '',
    applies_to: '',
    description: '',
    formula_full: '',
    source_tables_fields: ''
  });

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['MetricDefinition'],
    queryFn: () => base44.entities.MetricDefinition.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MetricDefinition.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['MetricDefinition'] });
      resetForm();
      toast.success('Metric definition created');
    },
    onError: () => toast.error('Failed to create metric')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MetricDefinition.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['MetricDefinition'] });
      resetForm();
      toast.success('Metric definition updated');
    },
    onError: () => toast.error('Failed to update metric')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MetricDefinition.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['MetricDefinition'] });
      toast.success('Metric definition deleted');
    },
    onError: () => toast.error('Failed to delete metric')
  });

  const handleSubmit = () => {
    if (!formData.metric_code || !formData.metric_name || !formData.formula_full) {
      toast.error('Required fields: metric code, name, and formula');
      return;
    }

    if (editingMetric) {
      updateMutation.mutate({ id: editingMetric.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (metric) => {
    setEditingMetric(metric);
    setFormData({
      metric_code: metric.metric_code,
      metric_name: metric.metric_name,
      applies_to: metric.applies_to || '',
      description: metric.description || '',
      formula_full: metric.formula_full,
      source_tables_fields: metric.source_tables_fields || ''
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
      metric_code: '',
      metric_name: '',
      applies_to: '',
      description: '',
      formula_full: '',
      source_tables_fields: ''
    });
    setEditingMetric(null);
    setShowDialog(false);
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Metric Definitions</h3>
        <Button onClick={() => setShowDialog(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Metric
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Code</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Applies To</TableHead>
              <TableHead className="font-semibold">Formula</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                  No metrics defined yet
                </TableCell>
              </TableRow>
            ) : (
              metrics.map(metric => (
                <TableRow key={metric.id} className="hover:bg-slate-50">
                  <TableCell className="font-mono font-semibold">{metric.metric_code}</TableCell>
                  <TableCell>{metric.metric_name}</TableCell>
                  <TableCell className="text-sm text-slate-600">{metric.applies_to}</TableCell>
                  <TableCell className="text-sm font-mono text-slate-600 truncate max-w-xs">{metric.formula_full}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(metric)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(metric.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowDialog(open);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMetric ? 'Edit Metric Definition' : 'Add Metric Definition'}</DialogTitle>
            <DialogDescription>
              Define a metric and its calculation formula
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Metric Code *</Label>
                <Input
                  value={formData.metric_code}
                  onChange={(e) => setFormData({ ...formData, metric_code: e.target.value })}
                  placeholder="e.g., GT_TIME"
                  disabled={!!editingMetric}
                />
              </div>
              <div>
                <Label>Metric Name *</Label>
                <Input
                  value={formData.metric_name}
                  onChange={(e) => setFormData({ ...formData, metric_name: e.target.value })}
                  placeholder="e.g., Gross Team Time"
                />
              </div>
            </div>

            <div>
              <Label>Applies To</Label>
              <Input
                value={formData.applies_to}
                onChange={(e) => setFormData({ ...formData, applies_to: e.target.value })}
                placeholder="e.g., Operations, QC"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this metric measures..."
                rows={3}
              />
            </div>

            <div>
              <Label>Formula *</Label>
              <Textarea
                value={formData.formula_full}
                onChange={(e) => setFormData({ ...formData, formula_full: e.target.value })}
                placeholder="e.g., SUM(Operations.operation_time_min) + SUM(TeamTimePersons.time_duration)"
                rows={3}
              />
            </div>

            <div>
              <Label>Source Tables & Fields</Label>
              <Textarea
                value={formData.source_tables_fields}
                onChange={(e) => setFormData({ ...formData, source_tables_fields: e.target.value })}
                placeholder="e.g., Operations.qty_operation, Operations.operation_time_min, TeamTimePersons.time_duration"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : editingMetric ? (
                <Edit2 className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {editingMetric ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}