import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, ArrowRight, Check, Copy, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePageAccess } from '@/components/lib/usePageAccess';

// Import tab components
import DataTab from '@/components/manufacturing/standards/DataTab.jsx';
import QCTab from '@/components/manufacturing/standards/QCTab.jsx';
import ProfilesTab from '@/components/manufacturing/standards/ProfilesTab.jsx';
import ConsumablesTab from '@/components/manufacturing/standards/ConsumablesTab.jsx';
import DailyTargetsTab from '@/components/manufacturing/standards/DailyTargetsTab.jsx';

export default function MfgStandardsManagementPage() {
  const { accessLevel, loading: accessLoading } = usePageAccess('MfgStandardsManagement');
  const queryClient = useQueryClient();
  
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBundleId, setSelectedBundleId] = useState('');
  const [currentBundle, setCurrentBundle] = useState(null);
  const [activeTab, setActiveTab] = useState('data');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ version_no: '', notes: '' });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.filter({ is_active: true }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  // Fetch bundles for selected department
  const { data: bundles = [] } = useQuery({
    queryKey: ['StandardsBundle', selectedDepartment],
    queryFn: () => base44.entities.StandardsBundle.filter({ department: selectedDepartment }, '-created_date'),
    enabled: !!selectedDepartment,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  // Find the department object for selected department name
  const selectedDepartmentObj = useMemo(() => {
    return departments.find(d => d.name === selectedDepartment) || null;
  }, [departments, selectedDepartment]);

  // Create bundle mutation
  const createBundleMutation = useMutation({
    mutationFn: async (data) => {
      const bundle = await base44.entities.StandardsBundle.create({
        version_no: data.version_no,
        department: selectedDepartment,
        department_id: selectedDepartmentObj?.id || '',
        status: 'DRAFT',
        notes: data.notes
      });
      return bundle;
    },
    onSuccess: (bundle) => {
      queryClient.invalidateQueries({ queryKey: ['StandardsBundle'] });
      setSelectedBundleId(bundle.id);
      setCurrentBundle(bundle);
      setShowCreateDialog(false);
      setCreateForm({ version_no: '', notes: '' });
      toast.success('Bundle created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create bundle: ' + error.message);
    }
  });

  // Clone bundle mutation
  const cloneBundleMutation = useMutation({
    mutationFn: async ({ newVersionNo, notes }) => {
      if (!currentBundle) throw new Error('No bundle selected');

      // Create new bundle
      const newBundle = await base44.entities.StandardsBundle.create({
        version_no: newVersionNo,
        department: currentBundle.department,
        department_id: currentBundle.department_id || '',
        status: 'DRAFT',
        notes: notes || `Cloned from ${currentBundle.version_no}`
      });

      // Clone all data from each tab
      const [stdLines, qcLines, profileLines, targetTypes, targetLines, consumablesLines] = await Promise.all([
        base44.entities.StdSetLines.filter({ bundle_id: currentBundle.id }),
        base44.entities.QCSetLines.filter({ bundle_id: currentBundle.id }),
        base44.entities.ProfileSetLines.filter({ bundle_id: currentBundle.id }),
        base44.entities.TargetType.filter({ bundle_id: currentBundle.id }),
        base44.entities.DailyTargetLines.filter({ bundle_id: currentBundle.id }),
        base44.entities.ConsumablesStandardsLines.filter({ bundle_id: currentBundle.id })
      ]);

      // Create cloned lines using bulkCreate to avoid rate limits
      const cloneLines = (entity, lines) => {
        if (!lines.length) return Promise.resolve();
        const mapped = lines.map(({ id, created_date, updated_date, created_by, ...rest }) => ({ ...rest, bundle_id: newBundle.id }));
        return entity.bulkCreate(mapped);
      };

      await cloneLines(base44.entities.StdSetLines, stdLines);
      await cloneLines(base44.entities.QCSetLines, qcLines);
      await cloneLines(base44.entities.ProfileSetLines, profileLines);
      await cloneLines(base44.entities.TargetType, targetTypes);
      await cloneLines(base44.entities.DailyTargetLines, targetLines);
      await cloneLines(base44.entities.ConsumablesStandardsLines, consumablesLines);

      return newBundle;
    },
    onSuccess: (newBundle) => {
      queryClient.invalidateQueries({ queryKey: ['StandardsBundle'] });
      setSelectedBundleId(newBundle.id);
      setCurrentBundle(newBundle);
      setShowCloneDialog(false);
      toast.success('Bundle cloned successfully');
    },
    onError: (error) => {
      toast.error('Failed to clone bundle: ' + error.message);
    }
  });

  // Activate bundle mutation
  const activateBundleMutation = useMutation({
    mutationFn: async () => {
      if (!currentBundle || currentBundle.status !== 'DRAFT') {
        throw new Error('Only DRAFT bundles can be activated');
      }

      // Validation: check if bundle has data
      const [stdLines, qcLines, profileLines] = await Promise.all([
        base44.entities.StdSetLines.filter({ bundle_id: currentBundle.id }),
        base44.entities.QCSetLines.filter({ bundle_id: currentBundle.id }),
        base44.entities.ProfileSetLines.filter({ bundle_id: currentBundle.id })
      ]);

      if (stdLines.length === 0) {
        throw new Error('Cannot activate: DATA tab has no entries');
      }

      // Archive current active bundle if exists
      const activeBundles = await base44.entities.StandardsBundle.filter({
        department: currentBundle.department,
        status: 'ACTIVE'
      });

      await Promise.all(
        activeBundles.map(b => 
          base44.entities.StandardsBundle.update(b.id, { status: 'ARCHIVED' })
        )
      );

      // Activate current bundle
      await base44.entities.StandardsBundle.update(currentBundle.id, {
        status: 'ACTIVE',
        activated_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['StandardsBundle'] });
      setCurrentBundle({ ...currentBundle, status: 'ACTIVE' });
      toast.success('Bundle activated successfully');
    },
    onError: (error) => {
      toast.error('Failed to activate bundle: ' + error.message);
    }
  });

  const handleOpenBundle = () => {
    const bundle = bundles.find(b => b.id === selectedBundleId);
    if (!bundle) return;

    setCurrentBundle(bundle);
    setActiveTab('data');
    toast.success(`Loaded bundle v${bundle.version_no}`);
  };

  const handleCreateBundle = () => {
    if (!selectedDepartment) {
      toast.error('Please select a department first');
      return;
    }
    
    // If a bundle is currently open, clone it instead of creating blank
    if (currentBundle) {
      setShowCloneDialog(true);
    } else {
      setShowCreateDialog(true);
    }
  };

  // Helper: delete records in small sequential batches to avoid rate limits
  const deleteInBatches = async (entity, records, batchSize = 5) => {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await Promise.all(batch.map(r => entity.delete(r.id)));
      if (i + batchSize < records.length) await new Promise(res => setTimeout(res, 300));
    }
  };

  // Delete bundle mutation (DRAFT only)
  const deleteBundleMutation = useMutation({
    mutationFn: async () => {
      if (!currentBundle || currentBundle.status !== 'DRAFT') throw new Error('Only DRAFT bundles can be deleted');
      // Fetch all associated data
      const [stdLines, qcLines, profileLines, targetLines, consumablesLines, targetTypes] = await Promise.all([
        base44.entities.StdSetLines.filter({ bundle_id: currentBundle.id }),
        base44.entities.QCSetLines.filter({ bundle_id: currentBundle.id }),
        base44.entities.ProfileSetLines.filter({ bundle_id: currentBundle.id }),
        base44.entities.DailyTargetLines.filter({ bundle_id: currentBundle.id }),
        base44.entities.ConsumablesStandardsLines.filter({ bundle_id: currentBundle.id }),
        base44.entities.TargetType.filter({ bundle_id: currentBundle.id })
      ]);
      // Delete sequentially in batches to avoid rate limits
      await deleteInBatches(base44.entities.StdSetLines, stdLines);
      await deleteInBatches(base44.entities.QCSetLines, qcLines);
      await deleteInBatches(base44.entities.ProfileSetLines, profileLines);
      await deleteInBatches(base44.entities.DailyTargetLines, targetLines);
      await deleteInBatches(base44.entities.ConsumablesStandardsLines, consumablesLines);
      await deleteInBatches(base44.entities.TargetType, targetTypes);
      await base44.entities.StandardsBundle.delete(currentBundle.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['StandardsBundle'] });
      setCurrentBundle(null);
      setSelectedBundleId('');
      toast.success('Bundle deleted');
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message)
  });

  const isEditable = currentBundle && currentBundle.status === 'DRAFT';
  const isReadOnly = currentBundle && (currentBundle.status === 'ACTIVE' || currentBundle.status === 'ARCHIVED');

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (accessLevel !== 'full_access') {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Step 2: Standards Management</CardTitle>
          <CardDescription>
            Unified standards bundle - manage all standards in one version
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Top Controls */}
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label>Department</Label>
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

            <div className="flex-1 min-w-[200px]">
              <Label>Unified Version</Label>
              <Select 
                value={selectedBundleId} 
                onValueChange={setSelectedBundleId}
                disabled={!selectedDepartment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {bundles.map(bundle => (
                    <SelectItem key={bundle.id} value={bundle.id}>
                      v{bundle.version_no} - {bundle.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleOpenBundle} disabled={!selectedBundleId}>
              <Check className="w-4 h-4 mr-2" />
              Open
            </Button>

            <Button onClick={handleCreateBundle} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              New Bundle
            </Button>
          </div>

          {/* Bundle Info & Status */}
          {currentBundle && (
            <Alert>
              <AlertDescription className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-semibold">
                    {currentBundle.department} - v{currentBundle.version_no}
                  </span>
                  <Badge variant={currentBundle.status === 'ACTIVE' ? 'default' : currentBundle.status === 'DRAFT' ? 'secondary' : 'outline'}>
                    {currentBundle.status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {isEditable && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete DRAFT v${currentBundle.version_no} and all its data? This cannot be undone.`)) {
                          deleteBundleMutation.mutate();
                        }
                      }}
                      disabled={deleteBundleMutation.isPending}
                    >
                      {deleteBundleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                      Delete Draft
                    </Button>
                  )}
                  {isReadOnly && (
                    <Button onClick={() => setShowCloneDialog(true)} variant="outline" size="sm">
                      <Copy className="w-4 h-4 mr-2" />
                      Clone to New Version
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs - Only mount active tab to reduce initial API calls */}
          {currentBundle ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="data">DATA</TabsTrigger>
                <TabsTrigger value="qc">QC</TabsTrigger>
                <TabsTrigger value="profiles">Profiles</TabsTrigger>
                <TabsTrigger value="targets">Daily Targets</TabsTrigger>
                <TabsTrigger value="consumables">Consumables</TabsTrigger>
              </TabsList>

              <div className="mt-6">
                {activeTab === 'data' && <DataTab bundle={currentBundle} isEditable={isEditable} />}
                {activeTab === 'qc' && <QCTab bundle={currentBundle} isEditable={isEditable} />}
                {activeTab === 'profiles' && <ProfilesTab bundle={currentBundle} isEditable={isEditable} />}
                {activeTab === 'targets' && <DailyTargetsTab bundle={currentBundle} isEditable={isEditable} />}
                {activeTab === 'consumables' && <ConsumablesTab bundle={currentBundle} isEditable={isEditable} />}
              </div>

              {/* Action Buttons */}
              {isEditable && (
                <div className="flex gap-3 justify-end mt-6">
                  <div className="text-xs text-slate-500">
                    <p>• Save individual tabs separately</p>
                    <p>• All tabs will be locked after activation</p>
                  </div>
                  <Button
                    onClick={() => activateBundleMutation.mutate()}
                    disabled={activateBundleMutation.isPending}
                    variant="default"
                  >
                    {activateBundleMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Activate All Tabs
                  </Button>
                </div>
              )}
            </Tabs>
          ) : (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Please select a department and bundle version to begin, or create a new bundle.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Create Bundle Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Standards Bundle</DialogTitle>
            <DialogDescription>
              Create a new unified standards bundle for {selectedDepartment}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Version Number *</Label>
              <Input
                placeholder="e.g., 1.0.0"
                value={createForm.version_no}
                onChange={(e) => setCreateForm({ ...createForm, version_no: e.target.value })}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional description of this version"
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createBundleMutation.mutate(createForm)}
              disabled={!createForm.version_no || createBundleMutation.isPending}
            >
              {createBundleMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Bundle Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Bundle to New Version</DialogTitle>
            <DialogDescription>
              Clone all data from {currentBundle?.version_no} to a new DRAFT version
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>New Version Number *</Label>
              <Input
                placeholder="e.g., 1.0.1"
                value={createForm.version_no}
                onChange={(e) => setCreateForm({ ...createForm, version_no: e.target.value })}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional description of changes"
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => cloneBundleMutation.mutate({
                newVersionNo: createForm.version_no,
                notes: createForm.notes
              })}
              disabled={!createForm.version_no || cloneBundleMutation.isPending}
            >
              {cloneBundleMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Clone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}