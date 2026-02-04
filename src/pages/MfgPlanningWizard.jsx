import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CalendarDays, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ScheduledDataTab from "@/components/manufacturing/planning/ScheduledDataTab";

export default function MfgPlanningWizard() {
  const navigate = useNavigate();
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBundleId, setSelectedBundleId] = useState('');
  const [selectedBundle, setSelectedBundle] = useState(null);

  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.filter({ is_active: true })
  });

  const { data: bundles = [] } = useQuery({
    queryKey: ['StandardsBundle', selectedDepartment],
    queryFn: () => base44.entities.StandardsBundle.filter({ 
      department: selectedDepartment,
      status: 'ACTIVE'
    }),
    enabled: !!selectedDepartment
  });

  const handleLoadBundle = () => {
    const bundle = bundles.find(b => b.id === selectedBundleId);
    if (bundle) {
      setSelectedBundle(bundle);
      toast.success(`Loaded bundle v${bundle.version_no}`);
    }
  };

  const handleBack = () => {
    navigate(createPageUrl("MfgStandardsManagement"));
  };

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
                  Schedule production based on active standards bundle
                </p>
              </div>
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bundle Selection */}
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

              <div className="flex-1 min-w-[200px]">
                <Label>Active Standards Bundle</Label>
                <Select 
                  value={selectedBundleId} 
                  onValueChange={setSelectedBundleId}
                  disabled={!selectedDepartment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select active bundle" />
                  </SelectTrigger>
                  <SelectContent>
                    {bundles.map(bundle => (
                      <SelectItem key={bundle.id} value={bundle.id}>
                        v{bundle.version_no} - {bundle.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleLoadBundle} disabled={!selectedBundleId}>
                Load Bundle
              </Button>
            </div>

            {!selectedBundle ? (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Please select a department and active standards bundle to begin scheduling data.
                </AlertDescription>
              </Alert>
            ) : (
              <ScheduledDataTab 
                selectedDepartment={selectedDepartment} 
                selectedBundle={selectedBundle}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
  }