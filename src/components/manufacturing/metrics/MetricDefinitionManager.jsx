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
        <h3 className="text-lg font-semibold">Metric Definitions (Read-only)</h3>
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Applies To</TableHead>
                    <TableHead className="font-semibold">Formula</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500 py-8">
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
                  <TableCell></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>


    </div>
  );
}