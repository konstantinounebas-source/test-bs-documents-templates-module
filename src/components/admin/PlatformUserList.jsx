
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { AccessProfile } from '@/entities/AccessProfile';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, X, User as UserIcon } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function PlatformUserList({ accessLevel }) {
  const [platformUsers, setPlatformUsers] = useState([]);
  const [accessProfiles, setAccessProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null); // Clear previous errors
      try {
        const [users, profiles] = await Promise.all([
          User.list('-created_date'),
          AccessProfile.list()
        ]);
        setPlatformUsers(users);
        setAccessProfiles(profiles);
      } catch (error) {
        console.error("Error loading platform users or profiles:", error);
        setError("Failed to load platform users or access profiles. Please try again later.");
        toast({ variant: "destructive", title: "Error", description: "Could not load data." });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [toast]);

  const handleProfileChange = async (user, profileId) => {
    // If the profile ID is not changing, do nothing
    if (user.access_profile_id === profileId) {
      return;
    }

    setIsUpdating(true);
    try {
      await User.update(user.id, { access_profile_id: profileId });
      setPlatformUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === user.id ? { ...u, access_profile_id: profileId } : u
        )
      );
      toast({ title: "Success", description: "User's access profile updated." });
    } catch (error) {
      console.error("Error updating user profile:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update profile." });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium">Platform Users</h3>
        <p className="text-sm text-slate-600">
          Users with active Base44 platform accounts. Assign access profiles to control their permissions.
          {accessLevel === 'view_only' && ' (Read-only view)'}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Access Profile</TableHead>
              <TableHead>Joined</TableHead>
              {accessLevel === 'full_access' && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={accessLevel === 'full_access' ? 6 : 5} className="h-32 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                </TableCell>
              </TableRow>
            ) : platformUsers.length > 0 ? (
              platformUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.position || <span className="text-slate-400">Not set</span>}</TableCell>
                  <TableCell>
                    {accessLevel === 'full_access' ? (
                      <Select
                        value={user.access_profile_id || 'none'}
                        onValueChange={(value) => handleProfileChange(user, value === 'none' ? null : value)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Profile</SelectItem>
                          {accessProfiles.map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span>
                        {user.access_profile_id
                          ? accessProfiles.find(p => p.id === user.access_profile_id)?.name || 'Unknown Profile'
                          : <span className="text-slate-400">No Profile</span>
                        }
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.created_date ? format(new Date(user.created_date), 'MMM d, yyyy') : 'Unknown'}
                  </TableCell>
                  {accessLevel === 'full_access' && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleProfileChange(user, null)}
                        disabled={!user.access_profile_id || isUpdating}
                        title="Remove access profile"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={accessLevel === 'full_access' ? 6 : 5} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <UserIcon className="w-8 h-8 text-slate-400" />
                    <p className="text-slate-500">No platform users found.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
