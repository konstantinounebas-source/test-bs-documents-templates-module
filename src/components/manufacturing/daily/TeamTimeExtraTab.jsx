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

export default function TeamTimeExtraTab({ batchId }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    person_name: '',
    charge_dept: '',
    work_type: '',
    duration_min: ''
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list()
  });

  const { data: workTypes = [] } = useQuery({
    queryKey: ['Work_Type'],
    queryFn: () => base44.entities.Work_Type.list()
  });

  const { data: persons = [] } = useQuery({
    queryKey: ['Person'],
    queryFn: async () => {
      const allPersons = await base44.entities.Person.filter({ is_active: true });
      return allPersons.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    },
    staleTime: Infinity
  });

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['Team_Time_Extra', batchId],
    queryFn: () => base44.entities.Team_Time_Extra.filter({ batch_header_id: batchId }),
    enabled: !!batchId
  });

  const saveNETimeMetric = async () => {
    try {
      const batchHeader = await base44.entities.BatchHeader.filter({ id: batchId });
      if (!batchHeader || batchHeader.length === 0) return;

      // Fetch fresh Team_Time_Extra data from database
      const allExtra = await base44.entities.Team_Time_Extra.filter({ batch_header_id: batchId });
      
      // Calculate total from records with work_type "Non Execution Time"
      const totalNETime = allExtra
        .filter(te => te.work_type === 'Non Execution Time')
        .reduce((sum, te) => sum + (te.duration_min || 0), 0);

      // Find and update the NE_TIME metric by date and department
      const existingMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'NE_TIME',
        date: batchHeader[0].date,
        department: batchHeader[0].department
      });

      if (existingMetrics.length > 0) {
        await base44.entities.DailyMetricValue.update(existingMetrics[0].id, {
          value: totalNETime
        });
      }

      queryClient.invalidateQueries(['DailyMetricValue']);
    } catch (error) {
      console.error('Failed to save NE_TIME metric:', error);
    }
  };

  const saveODTimeMetric = async () => {
    try {
      const batchHeader = await base44.entities.BatchHeader.filter({ id: batchId });
      if (!batchHeader || batchHeader.length === 0) return;

      const batchDept = batchHeader[0].department;

      // Fetch fresh Team_Time_Extra data from database
      const allExtra = await base44.entities.Team_Time_Extra.filter({ batch_header_id: batchId });
      
      // Calculate total from records with work_type "Other Departments Works" and charge_dept != batch department
      const totalODTime = allExtra
        .filter(te => te.work_type === 'Other Departments Works' && te.charge_dept !== batchDept)
        .reduce((sum, te) => sum + (te.duration_min || 0), 0);

      // Find and update the OD_TIME metric by date and department
      const existingMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'OD_TIME',
        date: batchHeader[0].date,
        department: batchHeader[0].department
      });

      if (existingMetrics.length > 0) {
        await base44.entities.DailyMetricValue.update(existingMetrics[0].id, {
          value: totalODTime
        });
      }

      queryClient.invalidateQueries(['DailyMetricValue']);
    } catch (error) {
      console.error('Failed to save OD_TIME metric:', error);
    }
  };

  const saveSUPTimeMetric = async () => {
    try {
      const batchHeader = await base44.entities.BatchHeader.filter({ id: batchId });
      if (!batchHeader || batchHeader.length === 0) return;

      const batchDept = batchHeader[0].department;

      // Fetch fresh Team_Time_Extra data from database
      const allExtra = await base44.entities.Team_Time_Extra.filter({ batch_header_id: batchId });
      
      // Calculate total from records with work_type "Supportive Works" and charge_dept == batch department
      const totalSUPTime = allExtra
        .filter(te => te.work_type === 'Supportive Works' && te.charge_dept === batchDept)
        .reduce((sum, te) => sum + (te.duration_min || 0), 0);

      // Find and update the SUP_TIME metric by date and department
      const existingMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'SUP_TIME',
        date: batchHeader[0].date,
        department: batchHeader[0].department
      });

      if (existingMetrics.length > 0) {
        await base44.entities.DailyMetricValue.update(existingMetrics[0].id, {
          value: totalSUPTime
        });
      }

      queryClient.invalidateQueries(['DailyMetricValue']);
    } catch (error) {
      console.error('Failed to save SUP_TIME metric:', error);
    }
  };

  const saveNATTimeMetric = async () => {
    try {
      const batchHeader = await base44.entities.BatchHeader.filter({ id: batchId });
      if (!batchHeader || batchHeader.length === 0) return;

      const date = batchHeader[0].date;
      const dept = batchHeader[0].department;

      // Fetch all contributing metrics
      const allMetrics = await base44.entities.DailyMetricValue.filter({
        date: date,
        department: dept
      });

      const gtTime = allMetrics.find(m => m.metric_code === 'GT_TIME')?.value || 0;
      const neTime = allMetrics.find(m => m.metric_code === 'NE_TIME')?.value || 0;
      const odTime = allMetrics.find(m => m.metric_code === 'OD_TIME')?.value || 0;
      const supTime = allMetrics.find(m => m.metric_code === 'SUP_TIME')?.value || 0;

      // Calculate NAT_TIME = GT_TIME - NE_TIME - OD_TIME - SUP_TIME
      const natTime = gtTime - neTime - odTime - supTime;

      const natMetric = allMetrics.find(m => m.metric_code === 'NAT_TIME');

      if (natMetric) {
        await base44.entities.DailyMetricValue.update(natMetric.id, {
          value: natTime
        });
      }

      queryClient.invalidateQueries(['DailyMetricValue']);
    } catch (error) {
      console.error('Failed to save NAT_TIME metric:', error);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Team_Time_Extra.create({
      batch_header_id: batchId,
      ...data
    }),
    onSuccess: async () => {
      await saveNETimeMetric();
      await saveODTimeMetric();
      await saveSUPTimeMetric();
      await saveNATTimeMetric();
      queryClient.invalidateQueries(['Team_Time_Extra']);
      setShowAddDialog(false);
      setFormData({ person_name: '', charge_dept: '', work_type: '', duration_min: '' });
      toast.success('Extra time added');
    },
    onError: () => toast.error('Failed to add extra time')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Team_Time_Extra.delete(id),
    onSuccess: async () => {
      await saveNETimeMetric();
      await saveODTimeMetric();
      await saveSUPTimeMetric();
      await saveNATTimeMetric();
      queryClient.invalidateQueries(['Team_Time_Extra']);
      toast.success('Extra time deleted');
    },
    onError: () => toast.error('Failed to delete extra time')
  });

  const handleAdd = () => {
    if (!formData.person_name || !formData.charge_dept || !formData.work_type || !formData.duration_min) {
      toast.error('All fields are required');
      return;
    }
    createMutation.mutate({
      ...formData,
      duration_min: parseFloat(formData.duration_min)
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
        <h3 className="text-lg font-semibold">Team Time - Extra</h3>
        <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Extra Time
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person Name</TableHead>
              <TableHead>Charge Dept</TableHead>
              <TableHead>Work Type</TableHead>
              <TableHead>Duration (min)</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500">
                  No extra time records defined.
                </TableCell>
              </TableRow>
            ) : (
              lines.map(line => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.person_name}</TableCell>
                  <TableCell>{line.charge_dept}</TableCell>
                  <TableCell>{line.work_type}</TableCell>
                  <TableCell>{line.duration_min}</TableCell>
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
            <DialogTitle>Add Team Time - Extra</DialogTitle>
            <DialogDescription>Record extra time worked by a team member</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Person Name *</Label>
              <Input
                list="persons-list"
                value={formData.person_name}
                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                placeholder="Type or select person name"
              />
              <datalist id="persons-list">
                {persons.map(p => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>

            <div>
              <Label>Charge Dept *</Label>
              <Select value={formData.charge_dept} onValueChange={(v) => setFormData({ ...formData, charge_dept: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Work Type *</Label>
              <Select value={formData.work_type} onValueChange={(v) => setFormData({ ...formData, work_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select work type" />
                </SelectTrigger>
                <SelectContent>
                  {workTypes.map(w => (
                    <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Duration (min) *</Label>
              <Input
                type="number"
                value={formData.duration_min}
                onChange={(e) => setFormData({ ...formData, duration_min: e.target.value })}
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