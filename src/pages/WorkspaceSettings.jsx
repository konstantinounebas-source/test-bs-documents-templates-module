import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, UserCog, Calendar, Globe } from "lucide-react";
import CompanyHolidaysManagement from '../components/admin/CompanyHolidaysManagement';
import UserVisibilityManagement from '../components/admin/UserVisibilityManagement';

export default function WorkspaceSettingsPage() {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkUserRole = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
                if (currentUser.role === 'admin') {
                    setIsAdmin(true);
                }
            } catch (error) {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkUserRole();
    }, []);

    if (isLoading) {
        return <div className="p-6">Loading...</div>;
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                            <Lock className="w-6 h-6 text-red-500" />
                            Access Denied
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600">You do not have permission to view this page. Please contact an administrator.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Workspace Settings</h1>
                    <p className="text-slate-600 mt-1">Manage global settings like company holidays and user data visibility.</p>
                </div>

                <Tabs defaultValue="visibility" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="visibility">
                            <UserCog className="w-4 h-4 mr-2" />
                            User Visibility
                        </TabsTrigger>
                        <TabsTrigger value="holidays">
                            <Globe className="w-4 h-4 mr-2" />
                            Company Holidays
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="visibility">
                        <Card>
                             <CardHeader>
                                <CardTitle>User Visibility Settings</CardTitle>
                                <CardDescription>Define which users can view the workspace data (tasks, schedule, etc.) of other users.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <UserVisibilityManagement />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="holidays">
                        <Card>
                            <CardHeader>
                                <CardTitle>Company Holidays Management</CardTitle>
                                <CardDescription>Manage public holidays for the entire organization. These are excluded from all users' working day calculations.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CompanyHolidaysManagement />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}