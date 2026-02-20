import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CalendarDays, AlertCircle, Target, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import ScheduledDataTab from "@/components/manufacturing/planning/ScheduledDataTab";
import DailyTargetTab from "@/components/manufacturing/planning/DailyTargetTab";

export default function MfgPlanningWizard() {
  const navigate = useNavigate();
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [activeTab, setActiveTab] = useState('scheduled');

  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.filter({ is_active: true })
  });

  // Fetch all bundles for selected department
  const { data: bundles = [] } = useQuery({
    queryKey: ['StandardsBundle', selectedDepartment],
    queryFn: () => base44.entities.StandardsBundle.list().then(all => all.filter(b => b.department === selectedDepartment)),
    enabled: !!selectedDepartment,
    staleTime: 0
  });

  // Auto-select bundle: prefer ACTIVE, else first available
  useEffect(() => {
    if (!selectedDepartment) { setSelectedBundle(null); return; }
    if (bundles.length === 0) { setSelectedBundle(null); return; }
    const active = bundles.find(b => b.status === 'ACTIVE');
    setSelectedBundle(active || bundles[0]);
  }, [selectedDepartment, bundles]);

  const handleBack = () => navigate(createPageUrl("MfgStandardsManagement"));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CalendarDays className="w-6 h-6 text-blue-600" />
                  Step 3: Planning - Scheduled Data
                </CardTitle>
                <p className="text-sm text-slate-600 mt-2">
                  Schedule production based on the active standards bundle for each day.
                  To change a bundle for a specific day, use the{" "}
                  <button
                    onClick={() => navigate(createPageUrl("MfgDailyStandardsAssignment"))}
                    className="text-indigo-600 underline hover:text-indigo-800"
                  >
                    Daily Standards Assignment
                  </button>{" "}
                  page.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Department Selection only */}
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label>Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBundle && (
                <div className="flex items-end gap-2 pb-1">
                  <span className="text-sm text-slate-500">Default bundle:</span>
                  <Badge className={selectedBundle.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}>
                    v{selectedBundle.version_no} ({selectedBundle.status})
                  </Badge>
                </div>
              )}
            </div>

            {!selectedDepartment ? (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Please select a department to begin. The bundle for each day is controlled via Daily Standards Assignment.
                </AlertDescription>
              </Alert>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="scheduled">
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Scheduled Data
                  </TabsTrigger>
                  <TabsTrigger value="targets">
                    <Target className="w-4 h-4 mr-2" />
                    Daily Targets
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="scheduled">
                  <ScheduledDataTab
                    selectedDepartment={selectedDepartment}
                    selectedBundle={selectedBundle}
                  />
                </TabsContent>
                <TabsContent value="targets">
                  <DailyTargetTab
                    selectedDepartment={selectedDepartment}
                    selectedBundle={selectedBundle}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}