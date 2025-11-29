
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Loader2 } from "lucide-react";
import { usePageAccess } from "@/components/lib/usePageAccess";
import OptionManagement from "@/components/admin/OptionManagement";
import { ShelterTypeDeliveryOption } from "@/entities/ShelterTypeDeliveryOption";
import { BusStopField1Option } from "@/entities/BusStopField1Option";
import { BusStopField2Option } from "@/entities/BusStopField2Option";
import { SnagTypeOption } from "@/entities/SnagTypeOption";
import { ElementCategoryOption } from "@/entities/ElementCategoryOption";
import { WorkTypeOption } from "@/entities/WorkTypeOption";
import { CityMunicipalityOption } from "@/entities/CityMunicipalityOption";

export default function DeliveryFieldsDataDefinitionsPage() {
  const { hasAccess, isLoading: accessLoading, accessLevel } = usePageAccess('DeliveryFieldsDataDefinitions');
  const [selectedOption, setSelectedOption] = useState('city-municipality');

  const managementOptions = [
    {
      id: 'city-municipality',
      label: 'Πόλεις/Δήμοι',
      description: 'Διαχείριση πόλεων και δήμων',
      entity: CityMunicipalityOption,
      component: 'OptionManagement'
    },
    {
      id: 'shelter-type',
      label: 'Τύποι Στεγάστρου',
      description: 'Διαχείριση τύπων στεγάστρου για παραδόσεις',
      entity: ShelterTypeDeliveryOption,
      component: 'OptionManagement'
    },
    {
      id: 'field-1',
      label: 'Πρόσθετο Πεδίο 1 Επιλογές',
      description: 'Διαχείριση επιλογών για Πρόσθετο Πεδίο 1',
      entity: BusStopField1Option,
      component: 'OptionManagement'
    },
    {
      id: 'field-2',
      label: 'Πρόσθετο Πεδίο 2 Επιλογές',
      description: 'Διαχείριση επιλογών για Πρόσθετο Πεδίο 2',
      entity: BusStopField2Option,
      component: 'OptionManagement'
    },
    {
      id: 'snag-type',
      label: 'Τύποι Εκκρεμοτήτων',
      description: 'Διαχείριση τύπων εκκρεμοτήτων (π.χ. Κατασκευαστική, Αισθητική)',
      entity: SnagTypeOption,
      component: 'OptionManagement'
    },
    {
      id: 'element-category',
      label: 'Κατηγορίες Στοιχείων',
      description: 'Διαχείριση κατηγοριών στοιχείων (π.χ. Στέγαστρο, Βάση, Πίνακας)',
      entity: ElementCategoryOption,
      component: 'OptionManagement'
    },
    {
      id: 'work-type',
      label: 'Είδη Εργασιών',
      description: 'Διαχείριση ειδών εργασιών (π.χ. Επισκευή, Αντικατάσταση)',
      entity: WorkTypeOption,
      component: 'OptionManagement'
    }
  ];

  const currentOption = managementOptions.find(opt => opt.id === selectedOption);

  const renderManagementComponent = () => {
    if (!currentOption) return null;

    return (
      <OptionManagement
        entity={currentOption.entity}
        title={currentOption.label}
        description={currentOption.description}
        accessLevel={accessLevel}
        enableFiltering={true}
        enablePagination={true}
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
          <h1 className="text-3xl font-bold text-slate-900">Delivery Fields & Data Definitions</h1>
          <p className="text-slate-600 mt-1">Διαχείριση πεδίων και επιλογών για Delivery Management</p>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Delivery Management Configuration
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
