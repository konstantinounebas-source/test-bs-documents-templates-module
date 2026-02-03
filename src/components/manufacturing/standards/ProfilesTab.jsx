import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBundleItemCodes } from './useBundleItemCodes';

export default function ProfilesTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [formData, setFormData] = useState({
    item_code: '',
    profile_name: '',
    sanding_yn: false,
    masking_yn: false,
    zink_yn: false,
    repair_yn: false,
    remake_yn: false,
    hanging_yn: false,
    unhanging_yn: false,
    oven_clean_yn: false,
    other_yn: false,
    notes: ''
  });

  // Fetch item codes from DATA tab (master list)
  const { data: itemCodes = [], isLoading: itemCodesLoading } = useBundleItemCodes(bundle?.id);
  const hasItemCodes = itemCodes.length > 0;

  // Fetch operation profile names
  const { data: profileNames = [] } = useQuery({
    queryKey: ['OperationProfileName'],
    queryFn: () => base44.entities.OperationProfileName.filter({ is_active: true })
  });

  // Fetch lines
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['ProfileSetLines', bundle.id],
    queryFn: () => base44.entities.ProfileSetLines.filter({ bundle_id: bundle.id }),
    enabled: !!bundle
  });

  // Filtered lines
  const filteredLines = useMemo(() => {
    if (!searchFilter) return lines;
    const term = searchFilter.toLowerCase();
    return lines.filter(l => l.item_code?.toLowerCase().includes(term));
  }, [lines, searchFilter]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.ProfileSetLines.create({
        bundle_id: bundle.id,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ProfileSetLines'] });
      setShowAddDialog(false);
      setFormData({
        item_code: '',
        profile_name: '',
        sanding_yn: false,
        masking_yn: false,
        zink_yn: false,
        repair_yn: false,
        remake_yn: false,
        hanging_yn: false,
        unhanging_yn: false,
        oven_clean_yn: false,
        other_yn: false,
        notes: ''
      });
      toast.success('Profile line added');
    },
    onError: (error) => {
      toast.error('Failed to add: ' + error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.ProfileSetLines.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ProfileSetLines'] });
      toast.success('Profile line deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  const handleAdd = () => {
    if (!formData.item_code || !formData.profile_name) {
      toast.error('Please fill required fields');
      return;
    }
    createMutation.mutate(formData);
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
      {!hasItemCodes && !itemCodesLoading && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Add Item Codes in DATA tab first before defining profiles.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center gap-4">
        <h3 className="text-lg font-semibold">Operation Profiles</h3>
        <div className="flex gap-2 items-center flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Filter by item code..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {isEditable && (
          <Button 
            onClick={() => setShowAddDialog(true)} 
            variant="outline" 
            size="sm"
            disabled={!hasItemCodes}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Profile
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Code</TableHead>
              <TableHead>Profile Name</TableHead>
              <TableHead>Sanding</TableHead>
              <TableHead>Masking</TableHead>
              <TableHead>Zink</TableHead>
              <TableHead>Repair</TableHead>
              <TableHead>Remake</TableHead>
              <TableHead>Hanging</TableHead>
              <TableHead>Unhanging</TableHead>
              <TableHead>Oven Clean</TableHead>
              <TableHead>Other</TableHead>
              {isEditable && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-slate-500">
                  {searchFilter ? 'No matching profiles found' : 'No profiles defined. Click "Add Profile" to start.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLines.map(line => (
                <TableRow key={line.id}>
                  <TableCell>{line.item_code}</TableCell>
                  <TableCell>{line.profile_name}</TableCell>
                  <TableCell>{line.sanding_yn ? '✓' : '-'}</TableCell>
                  <TableCell>{line.masking_yn ? '✓' : '-'}</TableCell>
                  <TableCell>{line.zink_yn ? '✓' : '-'}</TableCell>
                  <TableCell>{line.repair_yn ? '✓' : '-'}</TableCell>
                  <TableCell>{line.remake_yn ? '✓' : '-'}</TableCell>
                  <TableCell>{line.hanging_yn ? '✓' : '-'}</TableCell>
                  <TableCell>{line.unhanging_yn ? '✓' : '-'}</TableCell>
                  <TableCell>{line.oven_clean_yn ? '✓' : '-'}</TableCell>
                  <TableCell>{line.other_yn ? '✓' : '-'}</TableCell>
                  {isEditable && (
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
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Profile</DialogTitle>
            <DialogDescription>Define an operation profile for an item</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[500px] overflow-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Item Code *</Label>
                <Select value={formData.item_code} onValueChange={(v) => setFormData({ ...formData, item_code: v })}>
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
                <Label>Profile Name *</Label>
                <Select value={formData.profile_name} onValueChange={(v) => setFormData({ ...formData, profile_name: v })}>
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
            </div>

            <div className="space-y-2">
              <Label>Operations Required</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'sanding_yn', label: 'Sanding' },
                  { key: 'masking_yn', label: 'Masking' },
                  { key: 'zink_yn', label: 'Zink' },
                  { key: 'repair_yn', label: 'Repair' },
                  { key: 'remake_yn', label: 'Remake' },
                  { key: 'hanging_yn', label: 'Hanging' },
                  { key: 'unhanging_yn', label: 'Unhanging' },
                  { key: 'oven_clean_yn', label: 'Oven Clean' },
                  { key: 'other_yn', label: 'Other' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData[key]}
                      onCheckedChange={(checked) => setFormData({ ...formData, [key]: checked })}
                    />
                    <Label className="cursor-pointer">{label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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