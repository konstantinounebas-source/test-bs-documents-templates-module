import React, { useState, useMemo } from "react";
import { OrderTypeOption } from "@/entities/OrderTypeOption";
import { ClientOption } from "@/entities/ClientOption";
import { ExistingElementOption } from "@/entities/ExistingElementOption";
import { PavementOption } from "@/entities/PavementOption";
import { CrossingOption } from "@/entities/CrossingOption";
import { ShelterTypeOption } from "@/entities/ShelterTypeOption";
import { ProposedShelterTypeOption } from "@/entities/ProposedShelterTypeOption";
import { ShelterUpgradeOption } from "@/entities/ShelterUpgradeOption";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import OptionManagement from "../components/admin/OptionManagement";
import { usePageAccess } from "@/components/lib/usePageAccess";


export default function BSOrderFieldsDataDefinitionsPage() {
  const { hasAccess, isLoading: accessLoading, accessLevel } = usePageAccess('BSOrderFieldsDataDefinitions');
  const [selectedOption, setSelectedOption] = useState('order-type');

  const managementOptions = useMemo(() => {
    return [
      {
        id: 'order-type',
        label: 'Order Type Options',
        description: 'Manage order type options',
        entity: OrderTypeOption,
        component: 'OptionManagement'
      },
      {
        id: 'client',
        label: 'Client Options',
        description: 'Manage client options',
        entity: ClientOption,
        component: 'OptionManagement'
      },
      {
        id: 'existing-element',
        label: 'Existing Element Options',
        description: 'Manage existing element options',
        entity: ExistingElementOption,
        component: 'OptionManagement'
      },
      {
        id: 'pavement',
        label: 'Pavement Options',
        description: 'Manage pavement options',
        entity: PavementOption,
        component: 'OptionManagement'
      },
      {
        id: 'crossing',
        label: 'Crossing Options',
        description: 'Manage crossing options',
        entity: CrossingOption,
        component: 'OptionManagement'
      },
      {
        id: 'shelter-type',
        label: 'Shelter Type Options',
        description: 'Manage shelter type options',
        entity: ShelterTypeOption,
        component: 'OptionManagement'
      },
      {
        id: 'proposed-shelter-type',
        label: 'Proposed Shelter Type Options',
        description: 'Manage proposed shelter type options',
        entity: ProposedShelterTypeOption,
        component: 'OptionManagement'
      },
      {
        id: 'shelter-upgrade',
        label: 'Shelter Upgrade Options',
        description: 'Manage shelter upgrade options',
        entity: ShelterUpgradeOption,
        component: 'OptionManagement'
      }
    ];
  }, []);

  const currentOption = managementOptions.find(opt => opt.id === selectedOption);

  const renderManagementComponent = () => {
    if (!currentOption) return null;

    return (
      <OptionManagement 
        entity={currentOption.entity}
        title={currentOption.label}
        onUpdate={() => {}}
        accessLevel={accessLevel}
      />
    );
  };
  
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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">BS Order Fields & Data Definitions</h1>
          <p className="text-slate-600 mt-1">Manage lookup tables and system configuration for bus stop orders</p>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Bus Stop Orders Management
              </CardTitle>
              <div className="w-full md:w-80">
                <Select value={selectedOption} onValueChange={setSelectedOption}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select management area" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {managementOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-slate-500">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderManagementComponent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}