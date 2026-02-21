import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, AlertCircle, Target, ChevronLeft, ChevronRight, Info, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { buildItemOperationMap, computeOpsPerPiece } from '../standards/shared/calculateOperationsTime';

export default function DailyTargetTab({ selectedDepartment, selectedBundle }) {
  const queryClient = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  // inline row state: { item_code, operation_profile_id, target_qty }
  const [newRow, setNewRow] = useState({ item_code: '', operation_profile_id: '', target_qty: '', target_type: '' });
  const [editingId, setEditingId] = useState(null);
  const [editingRow, setEditingRow] = useState({});

  // Import from Standards dialog
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importTargetType, setImportTargetType] = useState('');

  // ---------- data fetching ----------
  const { data: allOperations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.filter({ is_active: true }),
    staleTime: Infinity
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ['OperationProfileName'],
    queryFn: () => base44.entities.OperationProfileName.filter({ is_active: true }),
    staleTime: Infinity
  });

  const profiles = useMemo(
    () => allProfiles.filter(p => p.department === selectedDepartment),
    [allProfiles, selectedDepartment]
  );

  const { data: dataLines = [], isFetched: dataLinesFetched } = useQuery({
    queryKey: ['StdSetLines', selectedBundle?.id],
    queryFn: () => base44.entities.StdSetLines.filter({ bundle_id: selectedBundle.id }),
    enabled: !!selectedBundle?.id,
    staleTime: 0
  });

  const itemCodes = useMemo(
    () => [...new Set(dataLines.map(l => l.item_code).filter(Boolean))].sort(),
    [dataLines]
  );

  const itemOperationMap = useMemo(() => buildItemOperationMap(dataLines), [dataLines]);

  const { data: targets = [], isLoading: targetsLoading } = useQuery({
    queryKey: ['TargetDaily', selectedDepartment, selectedBundle?.id],
    queryFn: () => base44.entities.TargetDaily.filter({ department: selectedDepartment, bundle_id: selectedBundle.id }),
    enabled: !!selectedDepartment && !!selectedBundle?.id,
    staleTime: 0
  });

  // ---------- calendar ----------
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  }, [currentMonth]);

  const datesWithTargets = useMemo(() => new Set(targets.map(t => t.date)), [targets]);

  // ---------- day targets ----------
  const dayTargets = useMemo(
    () => (selectedDate ? targets.filter(t => t.date === selectedDate) : []),
    [targets, selectedDate]
  );

  const dayTotalTargetMin = useMemo(
    () => dayTargets.reduce((s, t) => s + (t.target_time_min || 0), 0),
    [dayTargets]
  );

  // ---------- calculation ----------
  const calcTimes = (itemCode, profileId, targetQty) => {
    const qty = parseFloat(targetQty) || 0;
    if (!itemCode || !profileId || qty <= 0 || !dataLinesFetched) {
      return { profile_time_min_pc: 0, target_time_min: 0 };
    }
    const profile = allProfiles.find(p => p.id === profileId);
    const perPiece = computeOpsPerPiece(itemCode, profile, allOperations, itemOperationMap);
    return {
      profile_time_min_pc: perPiece,
      target_time_min: perPiece * qty
    };
  };

  // ---------- Standards Daily Target Lines (for import) ----------
  const { data: stdDailyTargetLines = [] } = useQuery({
    queryKey: ['DailyTargetLines', selectedBundle?.id],
    queryFn: () => base44.entities.DailyTargetLines.filter({ bundle_id: selectedBundle.id }),
    enabled: !!selectedBundle?.id,
    staleTime: 0
  });

  const targetTypesInStandards = useMemo(
    () => [...new Set(stdDailyTargetLines.map(l => l.target_type).filter(Boolean))].sort(),
    [stdDailyTargetLines]
  );

  // ---------- TGT_TIME metric update ----------
  const saveTGTTimeMetric = async (date, dept, bundleId, allTargets) => {
    try {
      const dayRows = allTargets.filter(t => t.date === date);
      const total = dayRows.reduce((s, t) => s + (t.target_time_min || 0), 0);

      const existing = await base44.entities.DailyMetricValue.filter({
        metric_code: 'TGT_TIME',
        date,
        department: dept
      });

      if (existing.length > 0) {
        await base44.entities.DailyMetricValue.update(existing[0].id, { value: total });
      } else {
        await base44.entities.DailyMetricValue.create({
          metric_code: 'TGT_TIME',
          date,
          department: dept,
          bundle_id: bundleId,
          value: total
        });
      }
      queryClient.invalidateQueries({ queryKey: ['DailyMetricValue'] });
    } catch (err) {
      console.error('Failed to save TGT_TIME metric:', err);
    }
  };

  // ---------- mutations ----------
  const createMutation = useMutation({
     mutationFn: async (row) => {
       const { profile_time_min_pc, target_time_min } = calcTimes(row.item_code, row.operation_profile_id, row.target_qty);
       const profile = allProfiles.find(p => p.id === row.operation_profile_id);
       return base44.entities.TargetDaily.create({
         bundle_id: selectedBundle.id,
         date: selectedDate,
         department: selectedDepartment,
         item_code: row.item_code,
         operation_profile: profile?.name || '',
         operation_profile_id: row.operation_profile_id,
         target_profile: row.target_type,
         target_qty: parseFloat(row.target_qty),
         profile_time_min_pc,
         target_time_min
       });
     },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['TargetDaily'] });
      const fresh = await base44.entities.TargetDaily.filter({ department: selectedDepartment, bundle_id: selectedBundle.id });
      await saveTGTTimeMetric(selectedDate, selectedDepartment, selectedBundle.id, fresh);
      setNewRow({ item_code: '', operation_profile_id: '', target_qty: '' });
      toast.success('Target added');
    },
    onError: (err) => toast.error('Failed: ' + err.message)
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, row }) => {
      const { profile_time_min_pc, target_time_min } = calcTimes(row.item_code, row.operation_profile_id, row.target_qty);
      const profile = allProfiles.find(p => p.id === row.operation_profile_id);
      return base44.entities.TargetDaily.update(id, {
        item_code: row.item_code,
        operation_profile: profile?.name || '',
        operation_profile_id: row.operation_profile_id,
        target_qty: parseFloat(row.target_qty),
        profile_time_min_pc,
        target_time_min
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['TargetDaily'] });
      const fresh = await base44.entities.TargetDaily.filter({ department: selectedDepartment, bundle_id: selectedBundle.id });
      await saveTGTTimeMetric(selectedDate, selectedDepartment, selectedBundle.id, fresh);
      setEditingId(null);
      toast.success('Target updated');
    },
    onError: (err) => toast.error('Failed: ' + err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TargetDaily.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['TargetDaily'] });
      const fresh = await base44.entities.TargetDaily.filter({ department: selectedDepartment, bundle_id: selectedBundle.id });
      await saveTGTTimeMetric(selectedDate, selectedDepartment, selectedBundle.id, fresh);
      toast.success('Target deleted');
    },
    onError: (err) => toast.error('Failed: ' + err.message)
  });

  // ---------- import from standards ----------
  const importMutation = useMutation({
    mutationFn: async ({ date, targetType }) => {
      const lines = stdDailyTargetLines.filter(l => l.target_type === targetType);
      if (lines.length === 0) throw new Error('No lines found for this Target Type');

      // Delete existing targets for this date first
      const existingForDate = targets.filter(t => t.date === date);
      await Promise.all(existingForDate.map(t => base44.entities.TargetDaily.delete(t.id)));

      // Create new targets from standards lines
      const created = await Promise.all(lines.map(line => {
        const profile = allProfiles.find(p => p.id === line.operation_profile_id);
        const perPc = line.per_piece_total_min || 0;
        return base44.entities.TargetDaily.create({
          bundle_id: selectedBundle.id,
          date,
          department: selectedDepartment,
          item_code: line.item_code,
          operation_profile: profile?.name || '',
          operation_profile_id: line.operation_profile_id,
          target_qty: line.target_qty,
          profile_time_min_pc: perPc,
          target_time_min: perPc * (line.target_qty || 0)
        });
      }));
      return created;
    },
    onSuccess: async (_, { date }) => {
      await queryClient.invalidateQueries({ queryKey: ['TargetDaily'] });
      const fresh = await base44.entities.TargetDaily.filter({ department: selectedDepartment, bundle_id: selectedBundle.id });
      await saveTGTTimeMetric(date, selectedDepartment, selectedBundle.id, fresh);
      setShowImportDialog(false);
      setImportTargetType('');
      toast.success('Targets imported from Standards');
    },
    onError: (err) => toast.error('Import failed: ' + err.message)
  });

  const handleImport = () => {
    if (!importTargetType) { toast.error('Select a Target Type'); return; }
    importMutation.mutate({ date: selectedDate, targetType: importTargetType });
  };

  // ---------- handlers ----------
  const handleAdd = () => {
    if (!newRow.item_code || !newRow.operation_profile_id || !newRow.target_qty || !newRow.target_type) {
      toast.error('Fill Item Code, Profile, Target Type and Target Qty');
      return;
    }
    if (!selectedDate) {
      toast.error('Select a date first');
      return;
    }
    createMutation.mutate(newRow);
  };

  const handleStartEdit = (t) => {
    setEditingId(t.id);
    setEditingRow({ item_code: t.item_code, operation_profile_id: t.operation_profile_id || '', target_qty: t.target_qty });
  };

  const handleSaveEdit = () => {
    if (!editingRow.target_qty) return;
    updateMutation.mutate({ id: editingId, row: editingRow });
  };

  // live calc preview for new row
  const newRowCalc = useMemo(
    () => calcTimes(newRow.item_code, newRow.operation_profile_id, newRow.target_qty),
    [newRow, dataLines, allProfiles, allOperations]
  );

  // live calc preview for editing row
  const editRowCalc = useMemo(
    () => calcTimes(editingRow.item_code, editingRow.operation_profile_id, editingRow.target_qty),
    [editingRow, dataLines, allProfiles, allOperations]
  );

  if (!selectedDepartment || !selectedBundle) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>Select a Department and Standards Bundle first.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-sm font-semibold text-slate-500 py-1">{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              const ds = format(day, 'yyyy-MM-dd');
              const hasT = datesWithTargets.has(ds);
              const isSelected = selectedDate === ds;
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(ds)}
                  className={`relative p-3 text-center rounded-lg border transition-all text-sm
                    ${isSelected ? 'bg-green-100 border-green-500 font-semibold' : 'border-slate-200 hover:bg-slate-50'}
                    ${isToday ? 'ring-2 ring-green-300' : ''}
                    ${!isSameMonth(day, currentMonth) ? 'text-slate-300' : 'text-slate-900'}
                  `}
                >
                  {format(day, 'd')}
                  {hasT && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-green-600 rounded-full" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {!selectedDate ? (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>Select a date from the calendar to set daily targets.</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Summary */}
          {dayTargets.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-900">Daily Target Summary — {selectedDate}</p>
                    <p className="text-xs text-green-700">{dayTargets.length} item(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-700">TGT_TIME</p>
                    <p className="text-2xl font-bold text-green-800">{dayTotalTargetMin.toFixed(1)} min</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  Daily Targets — {selectedDate}
                </CardTitle>
                {targetTypesInStandards.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setShowImportDialog(true)}>
                    <Download className="w-4 h-4 mr-1" />
                    Import from Standards
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Item Code</TableHead>
                    <TableHead>Operation Profile</TableHead>
                    <TableHead className="text-right">Target Qty</TableHead>
                    <TableHead className="text-right">Min/pc</TableHead>
                    <TableHead className="text-right">Target Time (min)</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targetsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : dayTargets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                        No targets for this date yet. Add one below.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dayTargets.map(t => (
                      <TableRow key={t.id} className="hover:bg-slate-50">
                        {editingId === t.id ? (
                          <>
                            <TableCell>
                              <Select value={editingRow.item_code} onValueChange={v => setEditingRow(r => ({ ...r, item_code: v }))}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>{itemCodes.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select value={editingRow.operation_profile_id} onValueChange={v => setEditingRow(r => ({ ...r, operation_profile_id: v }))}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input type="number" className="h-8 w-24 text-right" value={editingRow.target_qty}
                                onChange={e => setEditingRow(r => ({ ...r, target_qty: e.target.value }))} />
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-slate-500">{editRowCalc.profile_time_min_pc.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-green-700">{editRowCalc.target_time_min.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending}>Save</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">{t.item_code}</TableCell>
                            <TableCell className="text-sm">{t.operation_profile || allProfiles.find(p => p.id === t.operation_profile_id)?.name || '—'}</TableCell>
                            <TableCell className="text-right font-mono">{t.target_qty}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-slate-500">{(t.profile_time_min_pc || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-green-700">{(t.target_time_min || 0).toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => handleStartEdit(t)}>Edit</Button>
                                <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(t.id); }}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  )}

                  {/* New row */}
                  <TableRow className="bg-green-50/50">
                    <TableCell>
                      <Select value={newRow.item_code} onValueChange={v => setNewRow(r => ({ ...r, item_code: v }))}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Item Code" /></SelectTrigger>
                        <SelectContent>{itemCodes.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={newRow.operation_profile_id} onValueChange={v => setNewRow(r => ({ ...r, operation_profile_id: v }))}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Profile" /></SelectTrigger>
                        <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" placeholder="Qty" className="h-8 w-24 text-right"
                        value={newRow.target_qty}
                        onChange={e => setNewRow(r => ({ ...r, target_qty: e.target.value }))} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-400">
                      {newRow.item_code && newRow.operation_profile_id ? newRowCalc.profile_time_min_pc.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-green-600 font-semibold">
                      {newRow.target_qty && newRow.item_code ? newRowCalc.target_time_min.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={handleAdd} disabled={createMutation.isPending}>
                        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Import from Standards Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import from Standards</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Select a Target Type defined in the Standards bundle. All existing targets for <strong>{selectedDate}</strong> will be replaced.
            </p>
            <div className="space-y-2">
              <Label>Target Type</Label>
              <Select value={importTargetType} onValueChange={setImportTargetType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Target Type..." />
                </SelectTrigger>
                <SelectContent>
                  {targetTypesInStandards.map(t => {
                    const lines = stdDailyTargetLines.filter(l => l.target_type === t);
                    const totalMin = lines.reduce((s, l) => s + (l.item_total_min || 0), 0);
                    return (
                      <SelectItem key={t} value={t}>
                        {t} ({lines.length} items, {totalMin.toFixed(0)} min)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {importTargetType && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1 max-h-48 overflow-y-auto">
                {stdDailyTargetLines.filter(l => l.target_type === importTargetType).map(l => (
                  <div key={l.id} className="flex justify-between gap-4">
                    <span className="font-mono text-slate-700 shrink-0">{l.item_code}</span>
                    <span className="text-slate-500 text-right">qty: {l.target_qty} × {(l.per_piece_total_min || 0).toFixed(2)} min/pc = <strong>{(l.item_total_min || 0).toFixed(1)} min</strong></span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={importMutation.isPending || !importTargetType}>
              {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}