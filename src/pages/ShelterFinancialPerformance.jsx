import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, DollarSign, PieChart, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePageAccess } from "@/components/lib/usePageAccess";

export default function ShelterFinancialPerformancePage() {
  const { hasAccess, isLoading: accessLoading } = usePageAccess('ShelterFinancialPerformance');
  const [selectedShelterType, setSelectedShelterType] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Fetch all shelter types
  const { data: shelterTypes = [], isLoading: shelterTypesLoading } = useQuery({
    queryKey: ['shelterTypes'],
    queryFn: () => base44.entities.ShelterType.list(),
  });

  // Fetch all financial profiles
  const { data: financialProfiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['shelterFinancialProfiles'],
    queryFn: () => base44.entities.ShelterFinancialProfile.list(),
  });

  // Auto-select first shelter type
  useEffect(() => {
    if (shelterTypes.length > 0 && !selectedShelterType) {
      setSelectedShelterType(shelterTypes[0].id);
    }
  }, [shelterTypes, selectedShelterType]);

  // Select profile based on selected shelter type
  useEffect(() => {
    if (selectedShelterType && financialProfiles.length > 0) {
      const profile = financialProfiles.find(p => p.shelter_type_id === selectedShelterType);
      setSelectedProfile(profile || null);
    }
  }, [selectedShelterType, financialProfiles]);

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  const isLoading = shelterTypesLoading || profilesLoading;
  const selectedShelterTypeData = shelterTypes.find(st => st.id === selectedShelterType);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Shelter Financial Performance</h1>
          <p className="text-slate-600 mt-1">Track income, costs, and profit distribution for each Shelter Type independently</p>
        </div>

        {/* Shelter Type Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Shelter Type</CardTitle>
            <CardDescription>Choose a Shelter Type to view its complete financial position</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full md:w-96">
              <Select value={selectedShelterType || ''} onValueChange={setSelectedShelterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a Shelter Type..." />
                </SelectTrigger>
                <SelectContent>
                  {shelterTypes.map(st => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.name || st.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : selectedProfile ? (
          <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Financial tracking for: <strong>{selectedShelterTypeData?.name || selectedShelterType}</strong>
              </AlertDescription>
            </Alert>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Income Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Total Income
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€0</div>
                  <p className="text-xs text-slate-500 mt-1">Contract + Extra Works</p>
                </CardContent>
              </Card>

              {/* Total Costs Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-red-600" />
                    Total Costs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€0</div>
                  <p className="text-xs text-slate-500 mt-1">BOM + Waste + Unfinalised</p>
                </CardContent>
              </Card>

              {/* Gross Balance Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Gross Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€0</div>
                  <p className="text-xs text-slate-500 mt-1">Income - Costs</p>
                </CardContent>
              </Card>

              {/* Net Profit Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-blue-600" />
                    Net Profit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€0</div>
                  <p className="text-xs text-slate-500 mt-1">After warranty provision</p>
                </CardContent>
              </Card>
            </div>

            {/* Profit Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Profit Distribution</CardTitle>
                <CardDescription>Partner allocation based on agreed percentages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-medium">Company Share</h4>
                    <div className="text-xl font-bold">€0</div>
                    <p className="text-sm text-slate-600">{selectedProfile?.company_profit_share_percentage || 50}%</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Partner Share</h4>
                    <div className="text-xl font-bold">€0</div>
                    <p className="text-sm text-slate-600">{selectedProfile?.partner_profit_share_percentage || 50}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Placeholders for Future Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Income Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Contract Income, Extra Works</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cost Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">BOM-based costs by category</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Waste Allowance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Waste percentages by category</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Unfinalised Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Pending and estimated expenses</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <p className="text-slate-600">No financial data available for this Shelter Type. Create a financial profile to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}