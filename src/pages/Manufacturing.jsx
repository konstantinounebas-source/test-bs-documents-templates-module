import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Database, 
  FileText, 
  CalendarDays, 
  ClipboardList, 
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Settings
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ManufacturingPage() {
  const navigate = useNavigate();

  // Check completion status for each step
  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list()
  });

  const { data: operations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.list()
  });

  const { data: stdSets = [] } = useQuery({
    queryKey: ['Std_Set'],
    queryFn: () => base44.entities.Std_Set.filter({ status: 'ACTIVE' })
  });

  const { data: profileSets = [] } = useQuery({
    queryKey: ['Profile_Set'],
    queryFn: () => base44.entities.Profile_Set.filter({ status: 'ACTIVE' })
  });

  const { data: qcSets = [] } = useQuery({
    queryKey: ['QC_Set'],
    queryFn: () => base44.entities.QC_Set.filter({ status: 'ACTIVE' })
  });

  const { data: targetDaily = [] } = useQuery({
    queryKey: ['Target_Daily'],
    queryFn: () => base44.entities.Target_Daily.list('-date', 5)
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['Batch_Header'],
    queryFn: () => base44.entities.Batch_Header.list('-date', 5)
  });

  const steps = [
    {
      id: 1,
      title: "Reference Data",
      description: "Setup departments, operations, QC types, consumables",
      icon: Database,
      status: departments.length > 0 && operations.length > 0 ? 'complete' : 'incomplete',
      page: "MfgReferenceData",
      stats: `${departments.length} depts, ${operations.length} operations`
    },
    {
      id: 2,
      title: "Standards Management",
      description: "Define standards, profiles, QC sets, consumables standards, KPI/Metrics definitions",
      icon: FileText,
      status: stdSets.length > 0 && profileSets.length > 0 && qcSets.length > 0 ? 'complete' : 'incomplete',
      page: null,
      stats: `${stdSets.length} std sets, ${profileSets.length} profile sets, ${qcSets.length} QC sets`,
      subPages: [
        { name: "Standards", page: "MfgStandards" },
        { name: "Profiles", page: "MfgProfiles" },
        { name: "QC Sets", page: "MfgQC" },
        { name: "Consumables", page: "MfgConsumables" },
        { name: "KPI & Metrics Definitions", page: "MfgKPIDefinitions" }
      ]
    },
    {
      id: 3,
      title: "Planning",
      description: "Set daily targets and scheduled production",
      icon: CalendarDays,
      status: targetDaily.length > 0 ? 'complete' : 'incomplete',
      page: "MfgPlanning",
      stats: `${targetDaily.length} recent targets`
    },
    {
      id: 4,
      title: "Daily Production Entry",
      description: "Record daily production batches and operations",
      icon: ClipboardList,
      status: batches.length > 0 ? 'complete' : 'incomplete',
      page: "MfgDailyProduction",
      stats: `${batches.length} recent batches`
    },
    {
      id: 5,
      title: "KPI Dashboard",
      description: "View performance metrics and analytics",
      icon: TrendingUp,
      status: batches.length > 0 ? 'complete' : 'incomplete',
      page: "MfgKPIDashboard",
      stats: "View analytics"
    }
  ];

  const getStatusIcon = (status) => {
    if (status === 'complete') {
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    }
    return <AlertCircle className="w-5 h-5 text-orange-500" />;
  };

  const getStatusBadge = (status) => {
    if (status === 'complete') {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Complete</Badge>;
    }
    return <Badge variant="outline" className="text-orange-600 border-orange-300">Incomplete</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Settings className="w-8 h-8 text-blue-600" />
                Manufacturing Production System
              </h1>
              <p className="text-slate-600 mt-2">
                Follow the guided workflow below to setup and manage your manufacturing operations
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <Card key={step.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <step.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">
                          Step {step.id}: {step.title}
                        </CardTitle>
                        {getStatusBadge(step.status)}
                        {getStatusIcon(step.status)}
                      </div>
                      <CardDescription className="text-base">
                        {step.description}
                      </CardDescription>
                      <p className="text-sm text-slate-500 mt-2">{step.stats}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {step.page ? (
                      <Button onClick={() => navigate(createPageUrl(step.page))}>
                        Open
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : step.subPages ? (
                      <div className="flex flex-col gap-2">
                        {step.subPages.map(sub => (
                          <Button 
                            key={sub.page}
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(createPageUrl(sub.page))}
                          >
                            {sub.name}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardHeader>

              {index < steps.length - 1 && (
                <div className="flex justify-center pb-4">
                  <div className="h-8 w-0.5 bg-slate-200"></div>
                </div>
              )}
            </Card>
          ))}
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">Workflow Guide</p>
                <p className="text-sm text-blue-700 mt-1">
                  Complete steps in order. Reference Data must be setup before Standards. 
                  Standards must be active before Planning. Daily Production requires active standards.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}