import React from "react";
import CustomFieldLabelManagement from "../components/admin/CustomFieldLabelManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal } from "lucide-react";

export default function CustomFieldsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Custom Fields</h1>
          <p className="text-slate-600 mt-1">Define and manage custom field labels for templates</p>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" />
              Custom Field Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomFieldLabelManagement />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}