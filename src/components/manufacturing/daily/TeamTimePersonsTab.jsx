import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Plus, Trash2, Loader2, Edit2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function TeamTimePersonsTab({ batchId }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [inlineForm, setInlineForm] = useState({
    person_names: [],
    from_time: '07:00',
    to_time: '15:30',
    break_time_minutes: 45,
    notes: ''
  });
  const [openPersonSelect, setOpenPersonSelect] = useState(false);
  const [formData, setFormData] = useState({
    person_name: '',
    from_time: '07:00',
    to_time: '15:30',
    break_time_minutes: 0,
    notes: ''
  });

  const { data: persons = [] } = useQuery({
    queryKey: ['Person'],
    queryFn: () => base44.entities.Person.filter({ is_active: true }),
    staleTime: Infinity
  });

  const { data: breakTimes = [] } = useQuery({
    queryKey: ['BreakTime'],
    queryFn: () => base44.entities.BreakTime.list(),
    staleTime: Infinity
  });

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['TeamTimePerson', batchId],
    queryFn: () => base44.entities.TeamTimePerson.filter({ batch_header_id: batchId }),
    enabled: !!batchId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamTimePerson.create({
      batch_header_id: batchId,
      person_name: data.person_name,
      from_time: data.from_time,
      to_time: data.to_time,
      break_time_minutes: data.break_time_minutes || 0,
      notes: data.notes
    }),
    onSuccess: async () => {
      queryClient.invalidateQueries(['TeamTimePerson', batchId]);
      resetForm();
      setShowAddDialog(false);
      toast.success('Team time added');
      saveMetric().catch(console.error);
      saveNATTimeMetric().catch(console.error);
    },
    onError: () => toast.error('Failed to add team time')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamTimePerson.update(id, {
      person_name: data.person_name,
      from_time: data.from_time,
      to_time: data.to_time,
      break_time_minutes: data.break_time_minutes || 0,
      notes: data.notes
    }),
    onSuccess: async () => {
      queryClient.invalidateQueries(['TeamTimePerson', batchId]);
      setEditingLine(null);
      setFormData({ person_name: '', from_time: '07:00', to_time: '15:30', break_time_minutes: 0, notes: '' });
      setShowAddDialog(false);
      toast.success('Team time updated');
      saveMetric().catch(console.error);
      saveNATTimeMetric().catch(console.error);
    },
    onError: () => toast.error('Failed to update team time')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamTimePerson.delete(id),
    onSuccess: async () => {
      queryClient.invalidateQueries(['TeamTimePerson', batchId]);
      toast.success('Team time deleted');
      saveMetric().catch(console.error);
      saveNATTimeMetric().catch(console.error);
    },
    onError: () => toast.error('Failed to delete team time')
  });

  const handleAdd = () => {
    if (!formData.person_name || !formData.from_time || !formData.to_time) {
      toast.error('Person name and time range are required');
      return;
    }
    if (editingLine) {
      updateMutation.mutate({ id: editingLine.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleInlineAdd = async () => {
    if (!inlineForm.person_names || inlineForm.person_names.length === 0 || !inlineForm.from_time || !inlineForm.to_time) {
      toast.error('Select at least one person and set time range');
      return;
    }
    const existingNames = lines.map(l => l.person_name);
    const duplicates = inlineForm.person_names.filter(n => existingNames.includes(n));
    if (duplicates.length > 0) {
      toast.error(`Already added: ${duplicates.join(', ')}`);
      return;
    }
    const records = inlineForm.person_names.map(person_name => ({
      batch_header_id: batchId,
      person_name,
      from_time: inlineForm.from_time,
      to_time: inlineForm.to_time,
      break_time_minutes: inlineForm.break_time_minutes || 0,
      notes: inlineForm.notes || ''
    }));
    
    try {
      for (const record of records) {
        await base44.entities.TeamTimePerson.create(record);
      }
      queryClient.invalidateQueries(['TeamTimePerson', batchId]);
      const activeBreakTimes = breakTimes.filter(b => b.is_active !== false);
      const defaultBreak = activeBreakTimes.length > 0 ? activeBreakTimes[0].duration_minutes || 45 : 45;
      setInlineForm({ person_names: [], from_time: '07:00', to_time: '15:30', break_time_minutes: defaultBreak, notes: '' });
      toast.success(`✅ Added ${records.length} person(s)`);
      saveMetric().catch(console.error);
      saveNATTimeMetric().catch(console.error);
    } catch (error) {
      toast.error('Failed to add team time records');
      console.error(error);
    }
  };

  const handleEdit = (line) => {
    setEditingLine(line);
    setFormData({
      person_name: line.person_name,
      from_time: line.from_time,
      to_time: line.to_time,
      break_time_minutes: line.break_time_minutes || 0,
      notes: line.notes || ''
    });
    setShowAddDialog(true);
  };

  const calculateAvailableTime = () => {
    if (!formData.from_time || !formData.to_time) return 0;
    const [fromH, fromM] = formData.from_time.split(':').map(Number);
    const [toH, toM] = formData.to_time.split(':').map(Number);
    const totalMin = (toH * 60 + toM) - (fromH * 60 + fromM);
    return Math.max(0, totalMin - (formData.break_time_minutes || 0));
  };

  const calculateInlineAvailableTime = () => {
    if (!inlineForm.from_time || !inlineForm.to_time) return 0;
    const [fromH, fromM] = inlineForm.from_time.split(':').map(Number);
    const [toH, toM] = inlineForm.to_time.split(':').map(Number);
    const totalMin = (toH * 60 + toM) - (fromH * 60 + fromM);
    return Math.max(0, totalMin - (inlineForm.break_time_minutes || 0));
  };

  const resetForm = () => {
    setFormData({ person_name: '', from_time: '07:00', to_time: '15:30', break_time_minutes: 0, notes: '' });
    setEditingLine(null);
    setShowAddDialog(false);
  };

  const calculateTotalAvailableTime = () => {
    return lines.reduce((sum, line) => {
      const [fromH, fromM] = line.from_time.split(':').map(Number);
      const [toH, toM] = line.to_time.split(':').map(Number);
      const totalMin = (toH * 60 + toM) - (fromH * 60 + fromM);
      const availableMin = Math.max(0, totalMin - (line.break_time_minutes || 0));
      return sum + availableMin;
    }, 0);
  };

  const saveMetric = async () => {
    try {
      const allBatchHeaders = await base44.entities.BatchHeader.list();
      const batchHeader = allBatchHeaders.filter(b => b.id === batchId);
      if (!batchHeader || batchHeader.length === 0) return;

      // Fetch fresh team time data from database
      const allLines = await base44.entities.TeamTimePerson.filter({ batch_header_id: batchId });
      
      // Calculate total from fresh data
      const totalAvailableTime = allLines.reduce((sum, line) => {
        const [fromH, fromM] = line.from_time.split(':').map(Number);
        const [toH, toM] = line.to_time.split(':').map(Number);
        const totalMin = (toH * 60 + toM) - (fromH * 60 + fromM);
        const availableMin = Math.max(0, totalMin - (line.break_time_minutes || 0));
        return sum + availableMin;
      }, 0);

      // Find and update the GT_TIME metric by date and department
      const existingMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'GT_TIME',
        date: batchHeader[0].date,
        department: batchHeader[0].department
      });

      if (existingMetrics.length > 0) {
        // Update only the first matching metric
        await base44.entities.DailyMetricValue.update(existingMetrics[0].id, {
          value: totalAvailableTime
        });
      }

      queryClient.invalidateQueries(['DailyMetricValue']);
    } catch (error) {
      console.error('Failed to save metric:', error);
    }
  };

  const saveNATTimeMetric = async () => {
    try {
      const allBatchHeaders = await base44.entities.BatchHeader.list();
      const batchHeader = allBatchHeaders.filter(b => b.id === batchId);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Team Time - Persons</h3>

      {/* Inline Add Form */}
      <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-slate-600 mb-1 block">Person Name(s) *</Label>
            <Popover open={openPersonSelect} onOpenChange={setOpenPersonSelect}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal bg-white">
                  {inlineForm.person_names.length > 0
                    ? inlineForm.person_names.join(', ')
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
                          setInlineForm(prev => ({
                            ...prev,
                            person_names: prev.person_names.includes(p.name)
                              ? prev.person_names.filter(n => n !== p.name)
                              : [...prev.person_names, p.name]
                          }));
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', inlineForm.person_names.includes(p.name) ? 'opacity-100' : 'opacity-0')} />
                        {p.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="w-28">
            <Label className="text-xs text-slate-600 mb-1 block">From Time *</Label>
            <Input
              type="time"
              value={inlineForm.from_time}
              onChange={(e) => setInlineForm({ ...inlineForm, from_time: e.target.value })}
            />
          </div>
          <div className="w-28">
            <Label className="text-xs text-slate-600 mb-1 block">To Time *</Label>
            <Input
              type="time"
              value={inlineForm.to_time}
              onChange={(e) => setInlineForm({ ...inlineForm, to_time: e.target.value })}
            />
          </div>
          <div className="w-32">
            <Label className="text-xs text-slate-600 mb-1 block">Break (min)</Label>
            <Input
              type="number"
              min="0"
              value={inlineForm.break_time_minutes}
              onChange={(e) => setInlineForm({ ...inlineForm, break_time_minutes: Number(e.target.value) })}
            />
          </div>
          <div className="w-28">
            <Label className="text-xs text-slate-600 mb-1 block">Available</Label>
            <div className="h-9 flex items-center px-3 border rounded-md bg-white text-sm text-slate-600">
              {calculateInlineAvailableTime()} min
            </div>
          </div>
          <Button onClick={handleInlineAdd} disabled={createMutation.isPending} className="h-9">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Add
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">Total Available Time</span>
          <span className="text-lg font-bold text-blue-900">{calculateTotalAvailableTime().toFixed(2)} min ({(calculateTotalAvailableTime() / 60).toFixed(2)} hrs)</span>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person Name</TableHead>
              <TableHead>From Time</TableHead>
              <TableHead>To Time</TableHead>
              <TableHead>Break (min)</TableHead>
              <TableHead>Available (min)</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500">
                  No team time records defined.
                </TableCell>
              </TableRow>
            ) : (
              lines.map(line => {
                const [fromH, fromM] = line.from_time.split(':').map(Number);
                const [toH, toM] = line.to_time.split(':').map(Number);
                const totalMin = (toH * 60 + toM) - (fromH * 60 + fromM);
                const availableMin = Math.max(0, totalMin - (line.break_time_minutes || 0));
                
                return (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.person_name}</TableCell>
                    <TableCell>{line.from_time}</TableCell>
                    <TableCell>{line.to_time}</TableCell>
                    <TableCell>{line.break_time_minutes || 0}</TableCell>
                    <TableCell className="font-semibold text-blue-600">{availableMin}</TableCell>
                    <TableCell>{line.notes || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(line)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => deleteMutation.mutate(line.id)}
                          variant="ghost"
                          size="icon"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLine ? 'Edit Team Time - Person' : 'Add Team Time - Person'}</DialogTitle>
            <DialogDescription>
              {editingLine ? 'Update time worked by a team member' : 'Record time worked by a team member'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Person Name *</Label>
              <Input
                placeholder="Select from list or enter name"
                value={formData.person_name}
                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                list="person-list"
              />
              <datalist id="person-list">
                {persons.map(p => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Time *</Label>
                <Input
                  type="time"
                  value={formData.from_time}
                  onChange={(e) => setFormData({ ...formData, from_time: e.target.value })}
                />
              </div>
              <div>
                <Label>To Time *</Label>
                <Input
                  type="time"
                  value={formData.to_time}
                  onChange={(e) => setFormData({ ...formData, to_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Break Time (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.break_time_minutes || 0}
                  onChange={(e) => setFormData({ ...formData, break_time_minutes: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Available Time</Label>
                <Input type="text" value={`${calculateAvailableTime()} min`} disabled className="bg-slate-100" />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
           <Button variant="outline" onClick={() => {
             resetForm();
             setShowAddDialog(false);
           }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : editingLine ? (
                <Edit2 className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {editingLine ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}