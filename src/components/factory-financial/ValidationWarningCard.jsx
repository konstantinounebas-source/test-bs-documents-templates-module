import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from 'lucide-react';

export default function ValidationWarningCard() {
    return (
        <Card className="bg-red-50 border-red-300">
            <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-red-900">Προσοχή</h3>
                        <p className="text-sm text-red-700 mt-1">Υπάρχουν allocations που δεν κάνουν 100%</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}