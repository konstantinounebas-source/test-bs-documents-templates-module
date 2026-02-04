import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Search, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export default function QCTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();
  
  // QC Rule Header State
  const [selectedOperation, setSelectedOperation] = useState('');
  const [selectedQCType, setSelectedQCType] = useState('');
  const [selectedQCLevel, setSelectedQCLevel] = useState('');
  const [mode, setMode] = useState('percent'); // 'percent' or 'fixed'
  const [bulkValue, setBulkValue] = useState('');
  
  // Grid State
  const [gridData, setGridData] = useState({});
  const [selectedRows, setSelectedRows] = useState({});
  const [searchFilter, setSearchFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');

  // Fetch operations (max 10)
  const { data: allOperations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.list()
  });
  const operations = allOperations
    .filter(op => op.is_active && op.is_allowed)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .slice(0, 10);
  
  console.log("operations count:", operations.length, operations);

  // Fetch QC types
  const { data: allQCTypes = [] } = useQuery({
    queryKey: ['QC_Type'],
    queryFn: () => base44.entities.QC_Type.filter({ is_active: true })
  });

  // Fetch QC levels
  const { data: qcLevels = [] } = useQuery({
    queryKey: ['QCLevel'],
    queryFn: () => base44.entities.QCLevel.filter({ is_active: true })
  });

  // Fetch DATA tab lines to get base times
  const { data: dataLines = [] } = useQuery({
    queryKey: ['StdSetLines', bundle?.id],
    queryFn: () => base44.entities.StdSetLines.filter({ bundle_id: bundle.id }),
    enabled: !!bundle
  });

  // Fetch existing QC lines
  const { data: qcLines = [], isLoading: qcLoading } = useQuery({
    queryKey: ['QCSetLines', bundle?.id, selectedOperation, selectedQCType, selectedQCLevel],
    queryFn: () => base44.entities.QCSetLines.filter({ 
      bundle_id: bundle.id,
      operation: selectedOperation,
      qc_type: selectedQCType,
      qc_level: selectedQCLevel
    }),
    enabled: !!bundle && !!selectedOperation && !!selectedQCType && !!selectedQCLevel
  });

  // Get filtered item codes with base times for selected operation
  const itemsWithBaseTimes = useMemo(() => {
    if (!selectedOperation) return [];
    
    const items = dataLines
      .filter(line => line.operation === selectedOperation && line.item_code && line.std_min_per_pc > 0)
      .map(line => ({
        item_code: line.item_code,
        base_time: line.std_min_per_pc
      }));
    
    // Remove duplicates
    const uniqueItems = [];
    const seen = new Set();
    for (const item of items) {
      if (!seen.has(item.item_code)) {
        seen.add(item.item_code);
        uniqueItems.push(item);
      }
    }
    
    return uniqueItems.sort((a, b) => a.item_code.localeCompare(b.item_code));
  }, [dataLines, selectedOperation]);

  // Initialize grid data when QC lines load
  useEffect(() => {
    if (!selectedOperation || !selectedQCType || !selectedQCLevel) return;
    
    const newGridData = {};
    itemsWithBaseTimes.forEach(item => {
      const existingLine = qcLines.find(l => l.item_code === item.item_code);
      newGridData[item.item_code] = {
        qc_value: existingLine?.qc_value || '',
        notes: existingLine?.notes || '',
        id: existingLine?.id
      };
    });
    setGridData(newGridData);
  }, [qcLines, itemsWithBaseTimes, selectedOperation, selectedQCType, selectedQCLevel]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let items = itemsWithBaseTimes;
    
    // Search filter
    if (searchFilter) {
      const term = searchFilter.toLowerCase();
      items = items.filter(item => item.item_code.toLowerCase().includes(term));
    }
    
    // Quick filters
    if (quickFilter === 'with_base') {
      items = items.filter(item => item.base_time > 0);
    } else if (quickFilter === 'missing_qc') {
      items = items.filter(item => !gridData[item.item_code]?.qc_value);
    }
    
    return items;
  }, [itemsWithBaseTimes, searchFilter, quickFilter, gridData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOperation || !selectedQCType || !selectedQCLevel) {
        throw new Error('Operation, QC Type, and QC Level are required');
      }

      const updates = [];
      
      for (const item of itemsWithBaseTimes) {
        const data = gridData[item.item_code];
        if (!data || !data.qc_value) continue;
        
        const qc_value = parseFloat(data.qc_value);
        if (isNaN(qc_value) || qc_value < 0) continue;
        
        let calculated_extra_time = 0;
        if (mode === 'percent') {
          calculated_extra_time = item.base_time * (qc_value / 100);
        } else {
          calculated_extra_time = qc_value;
        }
        
        const payload = {
          bundle_id: bundle.id,
          operation: selectedOperation,
          item_code: item.item_code,
          qc_type: selectedQCType,
          qc_level: selectedQCLevel,
          mode: mode,
          qc_value: qc_value,
          base_time_min: item.base_time,
          calculated_extra_time_min: calculated_extra_time,
          notes: data.notes || ''
        };
        
        if (data.id) {
          // Update existing
          updates.push(base44.entities.QCSetLines.update(data.id, payload));
        } else {
          // Create new
          updates.push(base44.entities.QCSetLines.create(payload));
        }
      }
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['QCSetLines'] });
      toast.success('QC standards saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    }
  });

  const handleBulkApply = () => {
    if (!bulkValue) {
      toast.error('Please enter a value to apply');
      return;
    }
    
    const newGridData = { ...gridData };
    const selectedItems = Object.keys(selectedRows).filter(k => selectedRows[k]);
    
    if (selectedItems.length === 0) {
      // Apply to all filtered items
      filteredItems.forEach(item => {
        newGridData[item.item_code] = {
          ...newGridData[item.item_code],
          qc_value: bulkValue
        };
      });
    } else {
      // Apply to selected items only
      selectedItems.forEach(item_code => {
        newGridData[item_code] = {
          ...newGridData[item_code],
          qc_value: bulkValue
        };
      });
    }
    
    setGridData(newGridData);
    toast.success('Value applied');
  };

  const updateGridCell = (item_code, field, value) => {
    setGridData(prev => ({
      ...prev,
      [item_code]: {
        ...prev[item_code],
        [field]: value
      }
    }));
  };

  const toggleRowSelection = (item_code) => {
    setSelectedRows(prev => ({
      ...prev,
      [item_code]: !prev[item_code]
    }));
  };

  const canSave = selectedOperation && selectedQCType && selectedQCLevel;
  const rowCount = filteredItems.length;
  const selectedCount = Object.values(selectedRows).filter(Boolean).length;

  if (qcLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* QC Rule Header */}
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">QC Rule Configuration</h3>
        
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label>Operation *</Label>
            <Select value={selectedOperation} onValueChange={setSelectedOperation}>
              <SelectTrigger>
                <SelectValue placeholder="Select operation" />
              </SelectTrigger>
              <SelectContent>
                {operations.length === 0 && (
                  <div className="p-2 text-sm text-slate-500">No operations found</div>
                )}
                {operations.map((op, idx) => {
                  console.log(`Operation ${idx}:`, op.id, op.name);
                  return <SelectItem key={op.id} value={op.name}>{op.name}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>QC Type *</Label>
            <Select value={selectedQCType} onValueChange={setSelectedQCType}>
              <SelectTrigger>
                <SelectValue placeholder="Select QC type" />
              </SelectTrigger>
              <SelectContent>
                {allQCTypes.map(qt => (
                  <SelectItem key={qt.id} value={qt.name}>{qt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>QC Level *</Label>
            <Select value={selectedQCLevel} onValueChange={setSelectedQCLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select QC level" />
              </SelectTrigger>
              <SelectContent>
                {qcLevels.map(ql => (
                  <SelectItem key={ql.id} value={ql.name}>{ql.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Mode *</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percent (%)</SelectItem>
                <SelectItem value="fixed">Fixed Minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {canSave && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-semibold">Editing QC for:</span> {selectedOperation} | {selectedQCType} | {selectedQCLevel} | Rows: {rowCount}
              </div>
              <Badge variant="outline">
                Mode: {mode === 'percent' ? 'Percentage' : 'Fixed Minutes'}
              </Badge>
            </div>
          </div>
        )}

        {canSave && isEditable && (
          <div className="flex gap-4 items-end border-t pt-4">
            <div className="flex-1">
              <Label>Apply same value to {selectedCount > 0 ? 'selected' : 'all filtered'} rows</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder={mode === 'percent' ? 'e.g., 10 (%)' : 'e.g., 2.5 (min)'}
              />
            </div>
            <Button onClick={handleBulkApply} variant="outline">
              Apply to {selectedCount > 0 ? `${selectedCount} selected` : 'all'}
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      {canSave && (
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search item code..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={quickFilter} onValueChange={setQuickFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="with_base">Base Time &gt; 0</SelectItem>
              <SelectItem value="missing_qc">Missing QC Value</SelectItem>
            </SelectContent>
          </Select>

          {isEditable && (
            <Button 
              onClick={() => saveMutation.mutate()} 
              disabled={!canSave || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save All
            </Button>
          )}
        </div>
      )}

      {/* Grid */}
      {!canSave ? (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Please select Operation, QC Type, and QC Level to begin editing QC standards.
          </AlertDescription>
        </Alert>
      ) : itemsWithBaseTimes.length === 0 ? (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            No items found with base time for operation "{selectedOperation}". Please add standards in DATA tab first.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="border rounded-lg overflow-auto bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                {isEditable && <TableHead className="w-12"></TableHead>}
                <TableHead className="font-semibold">Item Code</TableHead>
                <TableHead className="font-semibold">Base Time (min)</TableHead>
                <TableHead className="font-semibold">
                  QC Value {mode === 'percent' ? '(%)' : '(min)'}
                </TableHead>
                <TableHead className="font-semibold">Calculated Extra Time (min)</TableHead>
                <TableHead className="font-semibold">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isEditable ? 6 : 5} className="text-center text-slate-500 py-12">
                    No items match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map(item => {
                  const data = gridData[item.item_code] || {};
                  const qc_value = parseFloat(data.qc_value) || 0;
                  const calculated = mode === 'percent' 
                    ? item.base_time * (qc_value / 100)
                    : qc_value;
                  
                  return (
                    <TableRow key={item.item_code} className="hover:bg-slate-50">
                      {isEditable && (
                        <TableCell>
                          <Checkbox
                            checked={!!selectedRows[item.item_code]}
                            onCheckedChange={() => toggleRowSelection(item.item_code)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{item.item_code}</TableCell>
                      <TableCell className="font-mono text-slate-600">
                        {item.base_time.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {isEditable ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.qc_value || ''}
                            onChange={(e) => updateGridCell(item.item_code, 'qc_value', e.target.value)}
                            className="w-24"
                          />
                        ) : (
                          <span className="font-mono">{data.qc_value || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-blue-600 font-semibold">
                        {qc_value > 0 ? calculated.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell>
                        {isEditable ? (
                          <Input
                            value={data.notes || ''}
                            onChange={(e) => updateGridCell(item.item_code, 'notes', e.target.value)}
                            placeholder="Optional"
                            className="w-full"
                          />
                        ) : (
                          <span className="text-slate-600">{data.notes || '-'}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}