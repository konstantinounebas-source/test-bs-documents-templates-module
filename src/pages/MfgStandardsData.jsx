import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Copy, Save, ChevronRight, AlertCircle, Lock, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { usePageAccess } from "@/components/lib/usePageAccess";

const OPERATION_COLUMNS = [
  { key: 'SANDING_MIN', label: 'Sanding (min)' },
  { key: 'MASKING_MIN', label: 'Masking (min)' },
  { key: 'ZINK_MIN', label: 'Zink (min)' },
  { key: 'REPAIR_FILLER_MIN', label: 'Repair/Filler (min)' },
  { key: 'REMAKE_MIN', label: 'Remake (min)' },
  { key: 'HANGING_MIN', label: 'Hanging (min)' },
  { key: 'UNHANGING_MIN', label: 'Unhanging (min)' },
  { key: 'OVEN_CLEAN_MIN', label: 'Oven Clean (min)' },
  { key: 'OTHER_CORRECTIONS_MIN', label: 'Other Corrections (min)' },
  { key: 'FIXED_BREAK_MIN', label: 'Fixed Break (min)' }
];

export default function MfgStandardsDataPage() {
  const { accessLevel, loading: accessLoading } = usePageAccess("MfgStandardsData");
  const queryClient = useQueryClient();
  
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSetId, setSelectedSetId] = useState("");
  const [selectedSet, setSelectedSet] = useState(null);
  const [gridRows, setGridRows] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list()
  });

  // Fetch standard sets for selected department
  const { data: standardsSets = [] } = useQuery({
    queryKey: ['Std_Set', selectedDepartment],
    queryFn: () => base44.entities.Std_Set.filter({ department: selectedDepartment }),
    enabled: !!selectedDepartment
  });

  // Fetch lines for selected set
  const { data: lines = [], isLoading: linesLoading } = useQuery({
    queryKey: ['Std_Set_Lines', selectedSetId],
    queryFn: () => base44.entities.Std_Set_Lines.filter({ std_set_id: selectedSetId }),
    enabled: !!selectedSetId
  });

  // Load grid from lines (pivot)
  useEffect(() => {
    if (!lines.length) {
      setGridRows([]);
      return;
    }

    // Group by item_code
    const itemCodesMap = {};
    lines.forEach(line => {
      const itemCode = line.item_code || '';
      if (!itemCodesMap[itemCode]) {
        itemCodesMap[itemCode] = { item_code: itemCode, notes: line.notes || '' };
      }
      // Map operation to column
      itemCodesMap[itemCode][line.operation] = line.std_min_per_pc;
    });

    const rows = Object.values(itemCodesMap);
    setGridRows(rows);
    setHasUnsavedChanges(false);
  }, [lines]);

  // Open set
  const handleOpenSet = () => {
    if (!selectedSetId) return;
    const set = standardsSets.find(s => s.id === selectedSetId);
    setSelectedSet(set);
  };

  // Clone to new version
  const cloneMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSet) throw new Error("No set selected");
      
      // Create new set
      const newVersionNo = selectedSet.version_no.split('.').map((n, i) => i === 2 ? parseInt(n) + 1 : n).join('.');
      const newSet = await base44.entities.Std_Set.create({
        department: selectedSet.department,
        version_no: newVersionNo,
        status: 'DRAFT',
        notes: `Cloned from ${selectedSet.version_no}`
      });

      // Clone all lines
      const clonedLines = lines.map(line => ({
        std_set_id: newSet.id,
        item_code: line.item_code,
        operation: line.operation,
        std_min_per_pc: line.std_min_per_pc,
        notes: line.notes
      }));

      await Promise.all(clonedLines.map(l => base44.entities.Std_Set_Lines.create(l)));

      return newSet;
    },
    onSuccess: (newSet) => {
      toast.success("New version created successfully");
      queryClient.invalidateQueries(['Std_Set']);
      setSelectedSetId(newSet.id);
      setSelectedSet(newSet);
    },
    onError: (error) => {
      toast.error("Failed to clone version");
      console.error(error);
    }
  });

  // Activate set
  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSet || selectedSet.status !== 'DRAFT') {
        throw new Error("Only DRAFT sets can be activated");
      }
      
      // Validation
      if (gridRows.length === 0) {
        throw new Error("Cannot activate empty set");
      }
      
      for (const row of gridRows) {
        const hasAnyValue = OPERATION_COLUMNS.some(col => row[col.key] != null && row[col.key] !== '');
        if (!hasAnyValue) {
          throw new Error(`Item code "${row.item_code}" has no operation values`);
        }
      }

      // Archive current active
      const activeSets = await base44.entities.Std_Set.filter({ 
        department: selectedSet.department, 
        status: 'ACTIVE' 
      });
      
      for (const active of activeSets) {
        await base44.entities.Std_Set.update(active.id, { status: 'ARCHIVED' });
      }

      // Activate this set
      await base44.entities.Std_Set.update(selectedSet.id, { 
        status: 'ACTIVE',
        activated_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast.success("Set activated successfully");
      queryClient.invalidateQueries(['Std_Set']);
      setSelectedSet(prev => ({ ...prev, status: 'ACTIVE' }));
    },
    onError: (error) => {
      toast.error(error.message || "Failed to activate set");
    }
  });

  // Save grid to lines
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSet || selectedSet.status !== 'DRAFT') {
        throw new Error("Can only edit DRAFT sets");
      }

      // Validation
      const itemCodes = gridRows.map(r => r.item_code);
      const uniqueItemCodes = new Set(itemCodes);
      if (itemCodes.length !== uniqueItemCodes.size) {
        throw new Error("Duplicate item codes found");
      }

      for (const row of gridRows) {
        if (!row.item_code || row.item_code.trim() === '') {
          throw new Error("All rows must have an item code");
        }
      }

      // Delete all existing lines for this set
      await Promise.all(lines.map(line => base44.entities.Std_Set_Lines.delete(line.id)));

      // Create new lines from grid
      const newLines = [];
      for (const row of gridRows) {
        for (const col of OPERATION_COLUMNS) {
          const value = row[col.key];
          if (value != null && value !== '' && !isNaN(parseFloat(value))) {
            newLines.push({
              std_set_id: selectedSet.id,
              item_code: row.item_code,
              operation: col.key,
              std_min_per_pc: parseFloat(value),
              notes: row.notes || ''
            });
          }
        }
      }

      await Promise.all(newLines.map(l => base44.entities.Std_Set_Lines.create(l)));
    },
    onSuccess: () => {
      toast.success("Data saved successfully");
      queryClient.invalidateQueries(['Std_Set_Lines']);
      setHasUnsavedChanges(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save data");
    }
  });

  // Grid actions
  const addRow = () => {
    setGridRows([...gridRows, { item_code: '', notes: '' }]);
    setHasUnsavedChanges(true);
  };

  const duplicateRow = (index) => {
    const newRow = { ...gridRows[index] };
    setGridRows([...gridRows.slice(0, index + 1), newRow, ...gridRows.slice(index + 1)]);
    setHasUnsavedChanges(true);
  };

  const deleteRow = (index) => {
    if (!confirm("Delete this row?")) return;
    setGridRows(gridRows.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const updateCell = (rowIndex, field, value) => {
    const newRows = [...gridRows];
    newRows[rowIndex][field] = value;
    setGridRows(newRows);
    setHasUnsavedChanges(true);
  };

  const filteredRows = gridRows.filter(row => 
    !searchFilter || row.item_code?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const isEditable = selectedSet?.status === 'DRAFT';

  if (accessLoading) {
    return <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">Loading...</div>;
  }

  if (!accessLevel || accessLevel === 'no_access') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You don't have access to this page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileText className="w-6 h-6" />
              DATA - Standard Minutes Grid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Context Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Department</label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Standards Set Version</label>
                <Select value={selectedSetId} onValueChange={setSelectedSetId} disabled={!selectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {standardsSets.map(set => (
                      <SelectItem key={set.id} value={set.id}>
                        v{set.version_no} - {set.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button onClick={handleOpenSet} disabled={!selectedSetId} className="flex-1">
                  Open
                </Button>
              </div>
            </div>

            {/* Status & Actions */}
            {selectedSet && (
              <div className="flex items-center gap-4 p-4 bg-slate-100 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{selectedSet.department} v{selectedSet.version_no}</span>
                    <Badge variant={selectedSet.status === 'ACTIVE' ? 'default' : selectedSet.status === 'DRAFT' ? 'secondary' : 'outline'}>
                      {selectedSet.status}
                    </Badge>
                    {!isEditable && <Lock className="w-4 h-4 text-slate-500" />}
                  </div>
                  {hasUnsavedChanges && (
                    <p className="text-xs text-orange-600 mt-1">⚠️ Unsaved changes</p>
                  )}
                </div>

                <div className="flex gap-2">
                  {!isEditable && (
                    <Button variant="outline" onClick={() => cloneMutation.mutate()} disabled={cloneMutation.isPending}>
                      <Copy className="w-4 h-4 mr-2" />
                      Clone to New Version
                    </Button>
                  )}
                  {isEditable && (
                    <>
                      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !hasUnsavedChanges}>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending || hasUnsavedChanges} variant="default">
                        <ChevronRight className="w-4 h-4 mr-2" />
                        Activate
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grid */}
        {selectedSet && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex-1 max-w-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by item code..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {isEditable && (
                  <Button onClick={addRow} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Row
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-white z-10 min-w-[150px]">Item Code</TableHead>
                      {OPERATION_COLUMNS.map(col => (
                        <TableHead key={col.key} className="min-w-[120px]">{col.label}</TableHead>
                      ))}
                      <TableHead className="min-w-[200px]">Notes</TableHead>
                      {isEditable && <TableHead className="w-[100px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={OPERATION_COLUMNS.length + 3} className="text-center text-slate-500">
                          No data. Click "Add Row" to start.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((row, rowIndex) => {
                        const actualIndex = gridRows.indexOf(row);
                        return (
                          <TableRow key={actualIndex}>
                            <TableCell className="sticky left-0 bg-white z-10">
                              <Input
                                value={row.item_code || ''}
                                onChange={(e) => updateCell(actualIndex, 'item_code', e.target.value)}
                                disabled={!isEditable}
                                placeholder="Item code"
                                className="min-w-[140px]"
                              />
                            </TableCell>
                            {OPERATION_COLUMNS.map(col => (
                              <TableCell key={col.key}>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={row[col.key] || ''}
                                  onChange={(e) => updateCell(actualIndex, col.key, e.target.value)}
                                  disabled={!isEditable}
                                  placeholder="-"
                                  className="min-w-[110px]"
                                />
                              </TableCell>
                            ))}
                            <TableCell>
                              <Input
                                value={row.notes || ''}
                                onChange={(e) => updateCell(actualIndex, 'notes', e.target.value)}
                                disabled={!isEditable}
                                placeholder="Notes"
                                className="min-w-[190px]"
                              />
                            </TableCell>
                            {isEditable && (
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => duplicateRow(actualIndex)}>
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => deleteRow(actualIndex)} className="text-red-600 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}