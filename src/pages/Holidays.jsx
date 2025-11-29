
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { UserVisibilitySetting } from '@/entities/UserVisibilitySetting';
import { AppUser } from '@/entities/AppUser'; // New import
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User as UserIcon, Loader2, CalendarHeart, Settings, Eye } from 'lucide-react';
import WorkScheduleManagement from '../components/holidays/WorkScheduleManagement';
import DisplayPreferencesManagement from '../components/holidays/DisplayPreferencesManagement';
import PersonalLeavesManagement from '../components/admin/PersonalLeavesManagement';
import { Toaster } from "@/components/ui/toaster";

export default function HolidaysPage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [visibleUsers, setVisibleUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);
            try {
                const loggedInUser = await User.me();
                if (!loggedInUser) {
                    setIsLoading(false);
                    return; 
                }
                setCurrentUser(loggedInUser);

                // Get the emails of users this user is allowed to see
                const visibilitySettings = await UserVisibilitySetting.filter({ viewer_user_email: loggedInUser.email });
                const visibleEmails = new Set(visibilitySettings[0]?.visible_user_emails || []);
                visibleEmails.add(loggedInUser.email); // Always ensure self is visible

                // Fetch all users from both AppUser and Platform User sources
                const appUsers = await AppUser.list();
                const platformUsers = await User.list().catch((error) => {
                    console.warn("Failed to load platform users, possibly due to non-admin permissions. Defaulting to logged-in user. Error:", error);
                    return [loggedInUser];
                });

                // Create a combined map of all users for easy lookup
                // Platform users might have more complete data for system users, so adding them second allows for overwriting AppUser data if email matches.
                const allUsersMap = new Map();
                appUsers.forEach(u => u.email && allUsersMap.set(u.email, u));
                platformUsers.forEach(u => u.email && allUsersMap.set(u.email, u));

                // Populate allUsers state for the dropdown's change handler to function correctly
                setAllUsers(Array.from(allUsersMap.values()));

                // Construct the final list of users to display in the dropdown
                let usersToDisplayInDropdown = [];
                for (const email of visibleEmails) {
                    if (allUsersMap.has(email)) {
                        usersToDisplayInDropdown.push(allUsersMap.get(email));
                    }
                }
                
                // Ensure loggedInUser is always present in the display list, adding if not already
                if (!usersToDisplayInDropdown.some(u => u.email === loggedInUser.email)) {
                    usersToDisplayInDropdown.push(loggedInUser);
                }

                // Sort users by full name for better UX
                usersToDisplayInDropdown.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
                
                setVisibleUsers(usersToDisplayInDropdown);
                setSelectedUser(loggedInUser); // Default selection

            } catch (error) {
                console.error("Failed to initialize Holidays page:", error);
            } finally {
                setIsLoading(false);
            }
        };
        initialize();
    }, []);
    
    const handleUserChange = (userEmail) => {
        const user = allUsers.find(u => u.email === userEmail);
        setSelectedUser(user);
    };

    if (isLoading) {
        return <div className="p-6 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    return (
        <>
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">My Calendar Settings</h1>
                            <p className="text-slate-600 mt-1">Manage personal leaves, work schedule and calendar preferences.</p>
                        </div>
                        {visibleUsers.length > 0 && ( // Ensure there's at least one user to select (should always be self)
                             <div className="w-full md:w-64">
                                 <Label>Viewing Settings For</Label>
                                 <Select onValueChange={handleUserChange} value={selectedUser?.email || ''}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a user..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {visibleUsers.map(user => (
                                            <SelectItem key={user.email} value={user.email}>
                                                <div className="flex items-center gap-2">
                                                    <UserIcon className="w-4 h-4" />
                                                    {user.full_name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    
                    {selectedUser && (
                        <div className="space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><CalendarHeart className="w-5 h-5 text-blue-600" /> Personal Leaves</CardTitle>
                                    <CardDescription>Manage personal leave days for {selectedUser.full_name}.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <PersonalLeavesManagement user={selectedUser} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-green-600" /> Work Schedule</CardTitle>
                                    <CardDescription>Set the standard working hours for {selectedUser.full_name}.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <WorkScheduleManagement user={selectedUser} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-purple-600" /> Display Preferences</CardTitle>
                                    <CardDescription>Set the default calendar time range for {selectedUser.full_name}.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <DisplayPreferencesManagement user={selectedUser} />
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
            <Toaster />
        </>
    );
}
