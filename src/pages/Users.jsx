import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Users as UsersIcon, Loader2 } from "lucide-react";
import AppUserManagement from "../components/admin/AppUserManagement";
import PlatformUserList from "../components/admin/PlatformUserList";
import { usePageAccess } from "@/components/lib/usePageAccess";

export default function UsersPage() {
    // Check page access first
    const { hasAccess, isLoading: accessLoading, accessLevel } = usePageAccess('Users');

    // Show loading while checking access
    if (accessLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    // If no access, this component won't render (user will be redirected)
    if (!hasAccess) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
                    <p className="text-slate-600 mt-1">Manage platform users and application-specific users.</p>
                </div>

                <Tabs defaultValue="app-users" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="app-users">
                            <UsersIcon className="w-4 h-4 mr-2" />
                            Application Users
                        </TabsTrigger>
                        <TabsTrigger value="platform-users">
                            <User className="w-4 h-4 mr-2" />
                            Platform Users
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="app-users">
                        <Card>
                             <CardHeader>
                                <CardTitle>Application Users</CardTitle>
                                <p className="text-sm text-slate-600">Manage user records for assignment and roles, independent of platform access.</p>
                            </CardHeader>
                            <CardContent>
                                <AppUserManagement accessLevel={accessLevel} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="platform-users">
                        <Card>
                            <CardHeader>
                                <CardTitle>Platform Users</CardTitle>
                                <p className="text-sm text-slate-600">Users with active accounts on the Base44 platform.</p>
                            </CardHeader>
                            <CardContent>
                                <PlatformUserList accessLevel={accessLevel} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}