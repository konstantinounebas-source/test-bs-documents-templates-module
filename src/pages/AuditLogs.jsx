import React from "react";
import AuditLogViewer from "../components/admin/AuditLogViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

export default function AuditLogsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-600 mt-1">Track and monitor all system activities</p>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="w-5 h-5" />
              System Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AuditLogViewer />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}