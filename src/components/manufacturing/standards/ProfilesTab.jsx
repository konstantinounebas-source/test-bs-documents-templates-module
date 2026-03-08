import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit, AlertCircle, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { exportProfilesToExcel } from './shared/exportToExcel';

export default function ProfilesTab({ bundle, isEditable }) {
  const queryClient = useQueryClient();

  // State
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOperations, setFormOperations] = useState([]);

  // Fetch departments to resolve bundle department id
  const { data: allDepartments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.filter({ is_active: true }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  const bundleDepartmentId = useMemo(() => {
    if (!bundle?.department) return null;
    const dept = allDepartments.find(d => d.name === bundle.department);
    return dept?.id || null;
  }, [bundle, allDepartments]);

  // Fetch Operations (active, max 10)
  const { data: allOperations = [], isLoading: opsLoading } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.filter({ is_active: true }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  const operations = useMemo(() => {
    return allOperations
      .filter(op => {
        if (op.is_allowed === false) return false;
        if (!op.department_ids || op.department_ids.length === 0) return true;
        if (!bundleDepartmentId) return true;
        return op.department_ids.includes(bundleDepartmentId);
      })
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .slice(0, 10);
  }, [allOperations, bundleDepartmentId]);

  // Fetch Operation Profiles for this department
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['OperationProfileName', bundle?.department],
    queryFn: () => base44.entities.OperationProfileName.filter({ department: bundle.department }),
    enabled: !!bundle,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  // Filter profiles by search
  const filteredProfiles = useMemo(() => {
    if (!searchTerm) return profiles;
    return profiles.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [profiles, searchTerm]);

  // Mutations
  const createProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationProfileName.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['OperationProfileName', bundle?.department] });
      toast.success('Profile created');
      handleCloseDialog();
    },
    onError: (err) => toast.error('Failed to create profile: ' + err.message)
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OperationProfileName.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['OperationProfileName', bundle?.department] });
      toast.success('Profile updated');
      handleCloseDialog();
    },
    onError: (err) => toast.error('Failed to update profile: ' + err.message)
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (id) => base44.entities.OperationProfileName.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['OperationProfileName', bundle?.department] });
      toast.success('Profile deleted');
    },
    onError: (err) => toast.error('Failed to delete profile: ' + err.message)
  });

  const handleOpenAddDialog = () => {
    setEditingProfile(null);
    setFormName('');
    setFormDescription('');
    setFormOperations([]);
    setShowAddDialog(true);
  };

  const handleOpenEditDialog = (profile) => {
    setEditingProfile(profile);
    setFormName(profile.name);
    setFormDescription(profile.description || '');
    setFormOperations(profile.operations_required || []);
    setShowAddDialog(true);
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingProfile(null);
    setFormName('');
    setFormDescription('');
    setFormOperations([]);
  };

  const handleToggleOperation = (opId) => {
    if (formOperations.includes(opId)) {
      setFormOperations(formOperations.filter(id => id !== opId));
    } else {
      setFormOperations([...formOperations, opId]);
    }
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      toast.error('Profile name is required');
      return;
    }
    if (formOperations.length === 0) {
      toast.error('Select at least one operation');
      return;
    }

    const data = {
      name: formName.trim(),
      department: bundle.department,
      description: formDescription.trim(),
      is_active: true,
      operations_required: formOperations
    };

    if (editingProfile) {
      updateProfileMutation.mutate({ id: editingProfile.id, data });
    } else {
      createProfileMutation.mutate(data);
    }
  };

  const handleDelete = (profile) => {
    if (confirm(`Delete profile "${profile.name}"?`)) {
      deleteProfileMutation.mutate(profile.id);
    }
  };

  if (!bundle) {
    return <Alert><AlertCircle className="w-4 h-4" /><AlertDescription>No bundle selected</AlertDescription></Alert>;
  }

  if (opsLoading || profilesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>No active operations found. Please add operations in Step 1 (Reference Data Setup).</AlertDescription>
      </Alert>
    );
  }

  if (operations.length > 10) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4 text-orange-600" />
        <AlertDescription>Warning: More than 10 operations found. Only the first 10 will be available for selection.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Operation Profiles
            <div className="flex gap-2">
              <Button 
                onClick={() => exportProfilesToExcel(filteredProfiles, operations, bundle?.name)}
                variant="outline"
                size="sm"
                disabled={filteredProfiles.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {isEditable && (
                <Button onClick={handleOpenAddDialog} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Profile
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Search profiles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Profiles Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile Name</TableHead>
                  <TableHead>Operations</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  {isEditable && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map(profile => {
                  const profileOps = (profile.operations_required || [])
                    .map(opId => operations.find(o => o.id === opId))
                    .filter(Boolean);
                  
                  return (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {profileOps.map(op => (
                            <Badge key={op.id} variant="secondary" className="text-xs">
                              {op.name}
                            </Badge>
                          ))}
                          {profileOps.length === 0 && <span className="text-slate-500 text-sm">None</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{profile.description || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={profile.is_active ? 'default' : 'outline'}>
                          {profile.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      {isEditable && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditDialog(profile)}>
                              <Edit className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(profile)}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {filteredProfiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isEditable ? 5 : 4} className="text-center text-slate-500">
                      No profiles found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Profile Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Edit Profile' : 'Add Profile'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Profile Name *</Label>
              <Input
                placeholder="e.g., Standard Process"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div>
              <Label>Operations Required *</Label>
              <p className="text-xs text-slate-500 mb-2">Select operations included in this profile (max 10)</p>
              <div className="grid grid-cols-2 gap-3 border rounded-lg p-4">
                {operations.map(op => (
                  <div key={op.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`op-${op.id}`}
                      checked={formOperations.includes(op.id)}
                      onCheckedChange={() => handleToggleOperation(op.id)}
                    />
                    <Label htmlFor={`op-${op.id}`} className="text-sm font-normal cursor-pointer">
                      {op.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Description / Notes</Label>
              <Textarea
                placeholder="Optional description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingProfile ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}