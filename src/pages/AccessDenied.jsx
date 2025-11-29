import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AccessDeniedPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <ShieldX className="w-8 h-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl text-slate-900">Access Denied</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-slate-600">
                        You don't have permission to access this page. Please contact your administrator if you believe this is an error.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button asChild variant="outline" className="flex-1">
                            <Link to={createPageUrl("MyWorkday")}>
                                <Home className="w-4 h-4 mr-2" />
                                Go to My Tasks
                            </Link>
                        </Button>
                        <Button asChild variant="default" className="flex-1">
                            <Link to="#" onClick={() => window.history.back()}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Go Back
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}