import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function HelpInTab({ batchId, department }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    department: '',
    from_department: '',
    help_min: ''
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list()
  });

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['Help_In', batchId],
    queryFn: () => base44.entities.Help_In.filter({ batch_header_id: batchId }),
    enabled: !!batchId
  });

  const { data: batchHeader } = useQuery({
    queryKey: ['BatchHeader', batchId],
    queryFn: () => base44.entities.BatchHeader.filter({ id: batchId }),
    enabled: !!batchId,
    select: (data) => data?.[0]
  });

  const saveHelpTimeMetric = async () => {
    try {
      if (!batchHeader?.date || !department) return;

      // Fetch fresh Help_In data from database
      const allHelpIn = await base44.entities.Help_In.filter({ batch_header_id: batchId });
      
      // Calculate total HELP_TIME for this department (where department = receiving department)
      const totalHelpTime = allHelpIn
        .filter(h => h.department === department)
        .reduce((sum, h) => sum + (h.help_min || 0), 0);
      
      // Find and update the HELP_TIME metric
      const existingMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'HELP_TIME',
        date: batchHeader.date,
        department: department
      });

      if (existingMetrics.length > 0) {
        await base44.entities.DailyMetricValue.update(existingMetrics[0].id, {
          value: totalHelpTime
        });
      } else {
        await base44.entities.DailyMetricValue.create({
          metric_code: 'HELP_TIME',
          date: batchHeader.date,
          department: department,
          value: totalHelpTime
        });
      }

      queryClient.invalidateQueries(['DailyMetricValue']);
    } catch (error) {
      console.error('Failed to save HELP_TIME metric:', error);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Help_In.create({
      batch_header_id: batchId,
      ...data
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['Help_In']);
      await saveHelpTimeMetric();
      setShowAddDialog(false);
      setFormData({ department: '', from_department: '', help_min: '' });
      toast.success('Help-in record added');
    },
    onError: () => toast.error('Failed to add help-in record')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Help_In.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['Help_In']);
      await saveHelpTimeMetric();
      toast.success('Help-in record deleted');
    },
    onError: () => toast.error('Failed to delete help-in record')
  });

  const handleAdd = () => {
    if (!formData.department || !formData.from_department || !formData.help_min) {
      toast.error('All fields are required');
      return;
    }
    createMutation.mutate({
      ...formData,
      help_min: parseFloat(formData.help_min)
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
        <h3 className="text-lg font-semibold">Help In</h3>
        <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Help-In
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department (Receiving)</TableHead>
              <TableHead>From Department (Providing)</TableHead>
              <TableHead>Help Time (min)</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500">
                  No help-in records defined.
                </TableCell>
              </TableRow>
            ) : (
              lines.map(line => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.department}</TableCell>
                  <TableCell>{line.from_department}</TableCell>
                  <TableCell>{line.help_min}</TableCell>
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
            <DialogTitle>Add Help-In</DialogTitle>
            <DialogDescription>Record help received from another department</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Department (Receiving Help) *</Label>
              <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Department receiving help" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>From Department (Providing Help) *</Label>
              <Select value={formData.from_department} onValueChange={(v) => setFormData({ ...formData, from_department: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Department providing help" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Help Time (min) *</Label>
              <Input
                type="number"
                value={formData.help_min}
                onChange={(e) => setFormData({ ...formData, help_min: e.target.value })}
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