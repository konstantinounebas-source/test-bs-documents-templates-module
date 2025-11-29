import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AccessControlManagement from "../components/admin/AccessControlManagement";
import { ShieldCheck, Loader2 } from 'lucide-react';
import { usePageAccess } from "@/components/lib/usePageAccess";

export default function AccessControlPage() {
    // Check page access first
    const { hasAccess, isLoading: accessLoading, accessLevel } = usePageAccess('AccessControl');

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
                    <h1 className="text-3xl font-bold text-slate-900">Access Control</h1>
                    <p className="text-slate-600 mt-1">Manage user access profiles and their page permissions.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <ShieldCheck className="w-5 h-5" />
                           Access Profile Management
                        </CardTitle>
                        <CardDescription>
                            Create and configure access profiles. Assign page permissions for each profile, which will determine what users can see and do.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AccessControlManagement accessLevel={accessLevel} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}