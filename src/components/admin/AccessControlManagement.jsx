import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
const AccessProfile = base44.entities.AccessProfile;
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import PermissionManager from './PermissionManager';

// Helper to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function AccessControlManagement({ accessLevel }) {
  const [accessProfiles, setAccessProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  
  const [newProfile, setNewProfile] = useState({
    name: '',
    description: '',
    is_default: false
  });

  const loadAccessProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      await delay(200);
      const profiles = await AccessProfile.list();
      setAccessProfiles(profiles);
      
      // Auto-select the first profile if none is selected
      if (profiles.length > 0 && !selectedProfile) {
        setSelectedProfile(profiles[0]);
      }
    } catch (error) {
      console.error('Failed to load access profiles:', error);
      setError('Failed to load access profiles. Please refresh and try again.');
    }
    setIsLoading(false);
  }, [selectedProfile]);

  useEffect(() => {
    loadAccessProfiles();
  }, [loadAccessProfiles]);

  const handleCreateProfile = async () => {
    if (!newProfile.name.trim()) {
      setError('Profile name is required.');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const createdProfile = await AccessProfile.create(newProfile);
      await loadAccessProfiles();
      setSelectedProfile(createdProfile);
      setShowCreateDialog(false);
      setNewProfile({ name: '', description: '', is_default: false });
    } catch (error) {
      console.error('Failed to create access profile:', error);
      setError('Failed to create access profile. Please try again.');
    }

    setIsCreating(false);
  };

  const handleDeleteProfile = async (profileId) => {
    if (!confirm('Are you sure you want to delete this access profile?')) {
      return;
    }

    try {
      await AccessProfile.delete(profileId);
      await loadAccessProfiles();
      
      if (selectedProfile?.id === profileId) {
        setSelectedProfile(accessProfiles.length > 1 ? accessProfiles[0] : null);
      }
    } catch (error) {
      console.error('Failed to delete access profile:', error);
      setError('Failed to delete access profile. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Access Profiles</h3>
        {accessLevel === 'full_access' && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Access Profiles List */}
        <Card>
          <CardHeader>
            <CardTitle>Profiles</CardTitle>
            <CardDescription>Select a profile to manage its permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {accessProfiles.map(profile => (
                <div
                  key={profile.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedProfile?.id === profile.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedProfile(profile)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{profile.name}</h4>
                      {profile.description && (
                        <p className="text-sm text-slate-600 mt-1">{profile.description}</p>
                      )}
                      {profile.is_default && (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded mt-2">
                          Default Profile
                        </span>
                      )}
                    </div>
                    {accessLevel === 'full_access' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProfile(profile.id);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {accessProfiles.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <p>No access profiles found.</p>
                  {accessLevel === 'full_access' && (
                    <p className="text-sm mt-2">Create your first profile to get started.</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Panel: Permissions Management */}
        <div className="lg:col-span-2">
          {selectedProfile ? (
            <Card>
              <CardHeader>
                <CardTitle>Permissions for "{selectedProfile.name}"</CardTitle>
                <CardDescription>
                  Configure page access levels for this profile
                  {accessLevel === 'view_only' && ' (Read-only view)'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PermissionManager profile={selectedProfile} accessLevel={accessLevel} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <p className="text-slate-500">Select a profile to manage its permissions.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Profile Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Access Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Profile Name *</Label>
              <Input
                id="profile-name"
                value={newProfile.name}
                onChange={(e) => setNewProfile(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Manager, Basic User"
                disabled={accessLevel !== 'full_access'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-description">Description</Label>
              <Textarea
                id="profile-description"
                value={newProfile.description}
                onChange={(e) => setNewProfile(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this profile's purpose"
                rows={3}
                disabled={accessLevel !== 'full_access'}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-default"
                checked={newProfile.is_default}
                onCheckedChange={(checked) => setNewProfile(prev => ({ ...prev, is_default: checked }))}
                disabled={accessLevel !== 'full_access'}
              />
              <Label htmlFor="is-default">Set as default profile for new users</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            {accessLevel === 'full_access' && (
              <Button onClick={handleCreateProfile} disabled={isCreating || !newProfile.name.trim()}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Profile'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}