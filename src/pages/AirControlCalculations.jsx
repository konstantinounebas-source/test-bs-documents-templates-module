import React from 'react';
import { usePageAccess } from "@/components/lib/usePageAccess";
import { Loader2 } from 'lucide-react';

export default function AirControlCalculations() {
    const { hasAccess, isLoading: accessLoading } = usePageAccess('AirControlCalculations');

    if (accessLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!hasAccess) return null;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <h1 className="text-3xl font-bold text-slate-900">Air Control Calculations</h1>
        </div>
    );
}