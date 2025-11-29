
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppUser } from '@/entities/AppUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Edit, RefreshCw, UserX, UserCheck, Users } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import PlatformUserSync from './PlatformUserSync';

export default function AppUserManagement({ accessLevel }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', email: '', position: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await AppUser.list('-updated_date');
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error loading app users:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load application users." });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({ full_name: user.full_name, email: user.email || '', position: user.position || '' });
    setShowCreateDialog(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({ full_name: '', email: '', position: '' });
    setShowCreateDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.full_name.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Full name is required." });
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare data - don't send empty strings for optional fields
      const dataToSubmit = {
        full_name: formData.full_name.trim(),
        position: formData.position.trim() || undefined,
        email: formData.email.trim() || undefined
      };

      // Remove undefined values from the object
      Object.keys(dataToSubmit).forEach(key => {
        if (dataToSubmit[key] === undefined) {
          delete dataToSubmit[key];
        }
      });

      if (editingUser) {
        await AppUser.update(editingUser.id, dataToSubmit);
        toast({ title: "Success", description: "User updated successfully." });
      } else {
        await AppUser.create(dataToSubmit);
        toast({ title: "Success", description: "User created successfully." });
      }
      setShowCreateDialog(false);
      loadUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not save user: ${error.message || error}.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    const newStatus = !user.is_active;
    const action = newStatus ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} ${user.full_name}?`)) return;
    try {
      await AppUser.update(user.id, { is_active: newStatus });
      toast({ title: "Success", description: `User ${action}d successfully.` });
      loadUsers();
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast({ variant: "destructive", title: "Error", description: `Could not ${action} user.` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Add User Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">Application User Records</h3>
          <p className="text-sm text-slate-600">
            Manage user records for assignments and roles. These users can be referenced in templates and tasks.
            {accessLevel === 'view_only' && ' (Read-only view)'}
          </p>
        </div>
        <div className="flex gap-2">
          {accessLevel === 'full_access' && (
            <>
              <Button 
                onClick={() => setShowSyncDialog(true)}
                variant="outline"
                className="shadow-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync from Platform
              </Button>
              <Button 
                onClick={handleCreate}
                className="bg-green-600 hover:bg-green-700 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                </TableCell>
              </TableRow>
            ) : users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.position || <span className="text-slate-400">Not specified</span>}</TableCell>
                  <TableCell>{user.email || <span className="text-slate-400">No email</span>}</TableCell>
                  <TableCell>
                    <Badge className={user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.created_date ? format(new Date(user.created_date), 'MMM d, yyyy') : 'Unknown'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {accessLevel === 'full_access' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(user)}
                            className={user.is_active ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                          >
                            {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 text-slate-400" />
                    <p className="text-slate-500">No application users found.</p>
                    {accessLevel === 'full_access' && (
                      <p className="text-sm text-slate-400">Add your first user to get started.</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit User Dialog */}
      {accessLevel === 'full_access' && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add New Application User'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="Job title or position"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !formData.full_name.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingUser ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingUser ? 'Update User' : 'Add User'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Platform User Sync Dialog */}
      {accessLevel === 'full_access' && (
        <PlatformUserSync
          open={showSyncDialog}
          onClose={() => setShowSyncDialog(false)}
          onSyncComplete={loadUsers}
        />
      )}
    </div>
  );
}
