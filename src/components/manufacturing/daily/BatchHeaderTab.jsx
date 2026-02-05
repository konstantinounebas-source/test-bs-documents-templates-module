import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Save, Edit2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import DailyProductionCalendarSelector from './DailyProductionCalendarSelector';

export default function BatchHeaderTab({ batchHeaders, selectedBatch, onBatchSelect, onBatchCreated }) {
  const queryClient = useQueryClient();
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [editingBatch, setEditingBatch] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    department: '',
    bundle_id: '',
    notes: ''
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list()
  });

  // Fetch scheduled day headers for bundle resolution
  const { data: scheduledDayHeaders = [] } = useQuery({
    queryKey: ['ScheduledDayHeader', selectedDepartment],
    queryFn: () => base44.entities.ScheduledDayHeader.filter({ department_id: selectedDepartment }),
    enabled: !!selectedDepartment,
    staleTime: 0
  });

  // Fetch all bundles (all statuses) for selected department
  const { data: allBundles = [] } = useQuery({
    queryKey: ['StandardsBundle', selectedDepartment],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      const all = await base44.entities.StandardsBundle.list();
      return all.filter(b => b.department === selectedDepartment);
    },
    enabled: !!selectedDepartment,
    staleTime: 0
  });

  // Fetch ALL bundles globally for table lookup (to show bundle info even if department filter changes)
  const { data: allBundlesGlobal = [] } = useQuery({
    queryKey: ['StandardsBundle-Global'],
    queryFn: () => base44.entities.StandardsBundle.list(),
    staleTime: 0
  });

  // Migration: Copy data from old Batch_Header to new BatchHeader
  useEffect(() => {
    const migrateOldData = async () => {
      try {
        const oldBatches = await base44.entities.Batch_Header.list();
        if (oldBatches.length === 0) return;

        setIsMigrating(true);
        const allBundlesData = await base44.entities.StandardsBundle.list();

        for (const oldBatch of oldBatches) {
          const activeBundle = allBundlesData.find(b => b.department === oldBatch.department && b.status === 'ACTIVE');
          
          const existing = await base44.entities.BatchHeader.filter({ 
            date: oldBatch.date, 
            department: oldBatch.department 
          });
          
          if (existing.length === 0 && activeBundle) {
            await base44.entities.BatchHeader.create({
              date: oldBatch.date,
              department: oldBatch.department,
              bundle_id: activeBundle.id,
              notes: oldBatch.notes || '',
              created_by: oldBatch.created_by
            });
            console.log(`Migrated batch ${oldBatch.date} - ${oldBatch.department}`);
          }
        }
        
        queryClient.invalidateQueries(['BatchHeader']);
        toast.success('Data migration complete');
      } catch (error) {
        console.error('Migration error:', error);
      } finally {
        setIsMigrating(false);
      }
    };

    migrateOldData();
  }, [queryClient]);

  // Determine which bundle to use (from scheduled day or active bundle)
  const defaultBundleId = useMemo(() => {
    if (!selectedDate || !selectedDepartment) return '';

    // Check if there's a scheduled day for this date
    const scheduledDay = scheduledDayHeaders.find(h => h.date === selectedDate);
    if (scheduledDay && scheduledDay.source_bundle_id) {
      return scheduledDay.source_bundle_id;
    }

    // Fallback to active bundle
    const activeBundle = allBundles.find(b => b.status === 'ACTIVE');
    return activeBundle ? activeBundle.id : '';
  }, [selectedDate, selectedDepartment, scheduledDayHeaders, allBundles]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const newBatch = await base44.entities.BatchHeader.create(data);
      
      // Fetch all metrics and create them with initial value 0
      const metrics = await base44.entities.MetricDefinition.list();
      for (const metric of metrics) {
        await base44.entities.DailyMetricValue.create({
          metric_code: metric.metric_code,
          date: newBatch.date,
          department: newBatch.department,
          bundle_id: newBatch.bundle_id,
          value: 0
        });
      }
      
      return newBatch;
    },
    onSuccess: (newBatch) => {
      queryClient.invalidateQueries(['BatchHeader']);
      queryClient.invalidateQueries(['DailyMetricValue']);
      resetForm();
      toast.success('Batch header created');
      onBatchCreated(newBatch);
    },
    onError: () => toast.error('Failed to create batch header')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BatchHeader.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['BatchHeader']);
      resetForm();
      toast.success('Batch header updated');
    },
    onError: () => toast.error('Failed to update batch header')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BatchHeader.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['BatchHeader']);
      toast.success('Batch header deleted');
    },
    onError: () => toast.error('Failed to delete batch header')
  });

  const resetForm = () => {
    setFormData({ date: '', department: '', bundle_id: '', notes: '' });
    setEditingBatch(null);
    setShowCreateDialog(false);
    setSelectedDepartment('');
  };



  const handleCreateBatch = (dateStr) => {
    setShowCreateDialog(true);
    setFormData({
      date: dateStr,
      department: selectedDepartment,
      bundle_id: defaultBundleId,
      notes: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.date || !formData.department || !formData.bundle_id) {
      toast.error('Date, department and standards bundle are required');
      return;
    }

    const payload = {
      date: formData.date,
      department: formData.department,
      bundle_id: formData.bundle_id,
      notes: formData.notes
    };

    console.log('BatchHeader payload:', payload);

    if (editingBatch) {
      updateMutation.mutate({ id: editingBatch.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (batch) => {
    setEditingBatch(batch);
    setSelectedDepartment(batch.department);
    setFormData({
      date: batch.date,
      department: batch.department,
      bundle_id: batch.bundle_id || '',
      notes: batch.notes || ''
    });
    setShowCreateDialog(true);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this batch header? This will also delete all related production data.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {isMigrating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">Migrating batch headers...</p>
            <p className="text-xs text-blue-700 mt-1">Setting bundle_id for existing records without one</p>
          </div>
        </div>
      )}

      <div>
        <Label className="text-sm font-semibold">Select Department</Label>
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map(d => (
              <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDepartment && (
        <DailyProductionCalendarSelector
          selectedDepartment={selectedDepartment}
          selectedDate={selectedDate}
          onDateSelect={(dateStr) => {
            setSelectedDate(dateStr);
            // Find if batch exists for this date
            const existingBatch = batchHeaders.find(b => b.date === dateStr && b.department === selectedDepartment);
            if (existingBatch) {
              onBatchSelect(existingBatch);
            }
          }}
          onCreateBatch={handleCreateBatch}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBatch ? 'Edit Batch Header' : 'Create Batch Header'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Standards Bundle *</Label>
              <Select
                value={formData.bundle_id}
                onValueChange={(value) => setFormData({ ...formData, bundle_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bundle" />
                </SelectTrigger>
                <SelectContent>
                  {allBundles.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.version_no || b.version || '?'} ({b.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : editingBatch ? (
                <Save className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {editingBatch ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing Batch Headers</CardTitle>
        </CardHeader>
        <CardContent>
          {batchHeaders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No batch headers found. Select a date from the calendar to create one.
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Dept</TableHead>
                    <TableHead>Bundle</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchHeaders
                    .filter(b => !selectedDepartment || b.department === selectedDepartment)
                    .map(batch => (
                    <TableRow 
                      key={batch.id}
                      className={selectedBatch?.id === batch.id ? 'bg-blue-50' : ''}
                    >
                      <TableCell className="font-medium">{batch.date}</TableCell>
                      <TableCell>{batch.department}</TableCell>
                      <TableCell>
                        {(() => {
                          const bundle = allBundlesGlobal.find(b => b.id === batch.bundle_id);
                          if (!bundle) return `❌ missing (${batch.bundle_id})`;
                          const version = bundle.version_no || bundle.version || '?';
                          return `${version} (${bundle.status})`;
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onBatchSelect(batch)}
                            disabled={selectedBatch?.id === batch.id}
                          >
                            Select
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(batch)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(batch.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}