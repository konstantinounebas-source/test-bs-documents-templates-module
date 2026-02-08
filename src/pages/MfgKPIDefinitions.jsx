import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import KPIDefinitionsTable from "@/components/manufacturing/KPIDefinitionsTable";

export default function MfgKPIDefinitionsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              KPI Definitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <KPIDefinitionsTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}