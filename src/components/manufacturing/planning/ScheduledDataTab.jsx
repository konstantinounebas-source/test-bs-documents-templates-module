import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ScheduledDataTab({ selectedDepartment, selectedBundle }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [formData, setFormData] = useState({
    date: '',
    profile_name: '',
    item_code: '',
    operation: '',
    qc_type: '',
    qc_level: '',
    scheduled_qty: ''
  });

  // Fetch item codes from DATA tab of selected bundle
  const { data: dataLines = [] } = useQuery({
    queryKey: ['StdSetLines', selectedBundle?.id],
    queryFn: () => base44.entities.StdSetLines.filter({ bundle_id: selectedBundle.id }),
    enabled: !!selectedBundle
  });
  
  const itemCodes = useMemo(() => {
    return [...new Set(dataLines.map(l => l.item_code).filter(Boolean))].sort();
  }, [dataLines]);
  const hasItemCodes = itemCodes.length > 0;

  // Fetch profile names from Operation_Profile_Name
  const { data: profileNames = [] } = useQuery({
    queryKey: ['Operation_Profile_Name'],
    queryFn: () => base44.entities.Operation_Profile_Name.filter({ is_active: true })
  });

  // Fetch operations
  const { data: operations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.filter({ is_active: true, is_allowed: true })
  });

  // Fetch QC types
  const { data: qcTypes = [] } = useQuery({
    queryKey: ['QC_Type'],
    queryFn: () => base44.entities.QC_Type.filter({ is_active: true })
  });

  // Fetch QC levels
  const { data: qcLevels = [] } = useQuery({
    queryKey: ['QCLevel'],
    queryFn: () => base44.entities.QCLevel.filter({ is_active: true })
  });

  // Fetch scheduled data lines
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['Scheduled_Data', selectedBundle?.id],
    queryFn: () => base44.entities.Scheduled_Data.filter({ bundle_id: selectedBundle.id }),
    enabled: !!selectedBundle
  });

  // Filtered lines
  const filteredLines = useMemo(() => {
    if (!searchFilter) return lines;
    const term = searchFilter.toLowerCase();
    return lines.filter(l => 
      l.item_code?.toLowerCase().includes(term) || 
      l.date?.includes(term) ||
      l.profile_name?.toLowerCase().includes(term)
    );
  }, [lines, searchFilter]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Scheduled_Data.create({
        bundle_id: selectedBundle.id,
        department: selectedDepartment,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Scheduled_Data'] });
      setShowAddDialog(false);
      setFormData({
        date: '',
        profile_name: '',
        item_code: '',
        operation: '',
        qc_type: '',
        qc_level: '',
        scheduled_qty: ''
      });
      toast.success('Scheduled data added');
    },
    onError: (error) => {
      toast.error('Failed to add: ' + error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Scheduled_Data.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Scheduled_Data'] });
      toast.success('Scheduled data deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  const handleAdd = () => {
    if (!formData.date || !formData.profile_name || !formData.item_code || !formData.operation || !formData.scheduled_qty) {
      toast.error('Please fill all required fields');
      return;
    }
    createMutation.mutate({
      date: formData.date,
      profile_name: formData.profile_name,
      item_code: formData.item_code,
      operation: formData.operation,
      qc_type: formData.qc_type || null,
      qc_level: formData.qc_level || null,
      scheduled_qty: parseFloat(formData.scheduled_qty) || 0
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
      {!hasItemCodes && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Define Item Codes in Standards → DATA tab first.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center gap-4">
        <h3 className="text-lg font-semibold">Scheduled Data</h3>
        <div className="flex gap-2 items-center flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Filter by item code, date, or profile..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)} 
          variant="outline" 
          size="sm"
          disabled={!hasItemCodes}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Scheduled Data
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Profile Name</TableHead>
              <TableHead className="font-semibold">Item Code</TableHead>
              <TableHead className="font-semibold">Operation</TableHead>
              <TableHead className="font-semibold">QC Type</TableHead>
              <TableHead className="font-semibold">QC Level</TableHead>
              <TableHead className="font-semibold">Scheduled Qty</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-12">
                  {searchFilter ? 'No matching scheduled data found' : 'No scheduled data defined. Click "Add Scheduled Data" to start.'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredLines.map(line => (
                  <TableRow key={line.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{line.date}</TableCell>
                    <TableCell className="font-medium">{line.profile_name}</TableCell>
                    <TableCell className="font-medium">{line.item_code}</TableCell>
                    <TableCell>{line.operation}</TableCell>
                    <TableCell>{line.qc_type || '-'}</TableCell>
                    <TableCell>
                      {line.qc_level ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-sm font-medium">
                          {line.qc_level}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="font-mono">{line.scheduled_qty}</TableCell>
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
                ))}
                <TableRow className="bg-purple-50 font-semibold border-t-2">
                  <TableCell colSpan={6} className="text-right">Total Scheduled Qty:</TableCell>
                  <TableCell className="font-mono font-bold">
                    {filteredLines.reduce((sum, line) => sum + (parseFloat(line.scheduled_qty) || 0), 0).toFixed(2)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Scheduled Data</DialogTitle>
            <DialogDescription>Schedule production data for planning</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[500px] overflow-auto">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div>
              <Label>Profile Name *</Label>
              <Select 
                value={formData.profile_name} 
                onValueChange={(v) => setFormData({ ...formData, profile_name: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select profile name" />
                </SelectTrigger>
                <SelectContent>
                  {profileNames.map(pn => (
                    <SelectItem key={pn.id} value={pn.name}>{pn.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.profile_name && (
              <>
                <div>
                  <Label>Item Code *</Label>
                  <Select 
                    value={formData.item_code} 
                    onValueChange={(v) => setFormData({ ...formData, item_code: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item code from DATA tab" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemCodes.map(code => (
                        <SelectItem key={code} value={code}>{code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Operation *</Label>
                  <Select 
                    value={formData.operation} 
                    onValueChange={(v) => setFormData({ ...formData, operation: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select operation" />
                    </SelectTrigger>
                    <SelectContent>
                      {operations.map(op => (
                        <SelectItem key={op.id} value={op.name}>{op.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>QC Type (Optional)</Label>
                <Select 
                  value={formData.qc_type} 
                  onValueChange={(v) => setFormData({ ...formData, qc_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select QC type" />
                  </SelectTrigger>
                  <SelectContent>
                    {qcTypes.map(qt => (
                      <SelectItem key={qt.id} value={qt.name}>{qt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>QC Level (Optional)</Label>
                <Select 
                  value={formData.qc_level} 
                  onValueChange={(v) => setFormData({ ...formData, qc_level: v })}
                >
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
            </div>

            <div>
              <Label>Scheduled Quantity *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.scheduled_qty}
                onChange={(e) => setFormData({ ...formData, scheduled_qty: e.target.value })}
                placeholder="Enter scheduled quantity"
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