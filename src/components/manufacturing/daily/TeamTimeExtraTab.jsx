import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Plus, Trash2, Loader2, Check, ChevronsUpDown, Pencil, X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function TeamTimeExtraTab({ batchId }) {
  const queryClient = useQueryClient();
  const [openPersonSelect, setOpenPersonSelect] = useState(false);
  const [formData, setFormData] = useState({
    person_names: [],
    charge_dept: '',
    work_type: '',
    duration_min: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list(),
    staleTime: Infinity
  });

  const { data: workTypes = [] } = useQuery({
    queryKey: ['Work_Type'],
    queryFn: () => base44.entities.Work_Type.list(),
    staleTime: Infinity
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
      
      // Calculate total from records where charge_dept != batch department
      // AND (work_type is "Other Departments Works" OR "Supportive Works")
      const totalODTime = allExtra
        .filter(te => te.charge_dept !== batchDept && 
                     (te.work_type === 'Other Departments Works' || te.work_type === 'Supportive Works'))
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
      const helpTime = allMetrics.find(m => m.metric_code === 'HELP_TIME')?.value || 0;
      const neTime = allMetrics.find(m => m.metric_code === 'NE_TIME')?.value || 0;
      const odTime = allMetrics.find(m => m.metric_code === 'OD_TIME')?.value || 0;

      // Calculate NAT_TIME = GT_TIME + HELP_TIME - NE_TIME - OD_TIME
      const natTime = gtTime + helpTime - neTime - odTime;

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
    if (!formData.person_names || formData.person_names.length === 0 || !formData.charge_dept || !formData.work_type || !formData.duration_min) {
      toast.error('All fields are required');
      return;
    }
    const addNext = (index) => {
      if (index >= formData.person_names.length) {
        setFormData({ person_names: [], charge_dept: '', work_type: '', duration_min: '' });
        return;
      }
      createMutation.mutate({
        person_name: formData.person_names[index],
        charge_dept: formData.charge_dept,
        work_type: formData.work_type,
        duration_min: parseFloat(formData.duration_min)
      }, {
        onSuccess: () => addNext(index + 1)
      });
    };
    addNext(0);
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
      <h3 className="text-lg font-semibold">Team Time - Extra</h3>

      {/* Inline Add Form */}
      <div className="border rounded-lg p-4 bg-slate-50">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-slate-600 mb-1 block">Person Name(s) *</Label>
            <Popover open={openPersonSelect} onOpenChange={setOpenPersonSelect}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal bg-white">
                  {formData.person_names.length > 0
                    ? formData.person_names.join(', ')
                    : 'Select person(s)...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search person..." />
                  <CommandEmpty>No person found.</CommandEmpty>
                  <CommandGroup className="max-h-60 overflow-auto">
                    {persons.map(p => (
                      <CommandItem
                        key={p.id}
                        value={p.name}
                        onSelect={() => {
                          setFormData(prev => ({
                            ...prev,
                            person_names: prev.person_names.includes(p.name)
                              ? prev.person_names.filter(n => n !== p.name)
                              : [...prev.person_names, p.name]
                          }));
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', formData.person_names.includes(p.name) ? 'opacity-100' : 'opacity-0')} />
                        {p.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-40">
            <Label className="text-xs text-slate-600 mb-1 block">Charge Dept *</Label>
            <Select value={formData.charge_dept} onValueChange={(v) => setFormData({ ...formData, charge_dept: v })}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select dept" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <Label className="text-xs text-slate-600 mb-1 block">Work Type *</Label>
            <Select value={formData.work_type} onValueChange={(v) => setFormData({ ...formData, work_type: v })}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {workTypes.map(w => (
                  <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-32">
            <Label className="text-xs text-slate-600 mb-1 block">Duration (min) *</Label>
            <Input
              type="number"
              className="bg-white"
              value={formData.duration_min}
              onChange={(e) => setFormData({ ...formData, duration_min: e.target.value })}
            />
          </div>

          <Button onClick={handleAdd} disabled={createMutation.isPending} className="h-9">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Add
          </Button>
        </div>
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
    </div>
  );
}