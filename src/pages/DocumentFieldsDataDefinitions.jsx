
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { TemplateCategory } from "@/entities/TemplateCategory";
import { TemplateAvailabilityOption } from "@/entities/TemplateAvailabilityOption";
import { SOPAvailabilityOption } from "@/entities/SOPAvailabilityOption";
import { TemplateStatusOption } from "@/entities/TemplateStatusOption";
import { CustomField1Option } from "@/entities/CustomField1Option";
import { CustomField2Option } from "@/entities/CustomField2Option";
import { CustomField3Option } from "@/entities/CustomField3Option";
import { CustomField4Option } from "@/entities/CustomField4Option";
import { ActivityOption } from "@/entities/ActivityOption";
import { CompletionFrequencyOption } from "@/entities/CompletionFrequencyOption";
import { ResponsibilityCompletionOption } from "@/entities/ResponsibilityCompletionOption";
import { ResponsibilityProcessingOption } from "@/entities/ResponsibilityProcessingOption";
import { ResponsibilityInternalOption } from "@/entities/ResponsibilityInternalOption";
import { ResponsibilityExternalOption } from "@/entities/ResponsibilityExternalOption";
import { ControlMechanismOption } from "@/entities/ControlMechanismOption";
import { CustomFieldLabel } from "@/entities/CustomFieldLabel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Loader2 } from "lucide-react";

import CategoryManagement from "../components/admin/CategoryManagement";
import OptionManagement from "../components/admin/OptionManagement";
import StatusManagement from "../components/admin/StatusManagement";
import CustomFieldLabelManagement from "../components/admin/CustomFieldLabelManagement";
import UserTaskCategoryManagement from "../components/admin/UserTaskCategoryManagement";
import { clearCustomFieldLabelsCache, getCustomFieldLabels } from "@/components/lib/customFieldLabels";
import { usePageAccess } from "@/components/lib/usePageAccess";

// Helper to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function DocumentFieldsDataDefinitionsPage() {
    const { hasAccess, isLoading: accessLoading, accessLevel } = usePageAccess('DocumentFieldsDataDefinitions');
  const [selectedOption, setSelectedOption] = useState('template-categories');
  const [customFieldLabels, setCustomFieldLabels] = useState({});

  const loadCustomFieldLabels = useCallback(async () => {
    try {
      // Add delay before API call to avoid rate limiting
      await delay(300);
      const labels = await getCustomFieldLabels();
      setCustomFieldLabels(labels);
    } catch (error) {
      console.error("Error loading custom field labels:", error);
      setCustomFieldLabels({});
    }
  }, []);

  useEffect(() => {
    const initializePage = async () => {
      if (hasAccess) {
        // Add additional delay to space out API calls from layout and page
        await delay(500);
        await loadCustomFieldLabels();
      }
    };
    
    initializePage();
  }, [hasAccess, loadCustomFieldLabels]);

  const managementOptions = useMemo(() => {
    return [
      {
        id: 'template-categories',
        label: 'Template Categories',
        description: 'Manage categories for organizing templates',
        entity: TemplateCategory,
        component: 'CategoryManagement'
      },
      {
        id: 'task-categories',
        label: 'Task Categories',
        description: 'Manage categories for organizing personal and team tasks',
        entity: null, // Special handling
        component: 'UserTaskCategoryManagement'
      },
      {
        id: 'template-status',
        label: 'Template Status Options',
        description: 'Manage template status states',
        entity: TemplateStatusOption,
        component: 'StatusManagement'
      },
      {
        id: 'template-activity',
        label: 'Template Activity Options',
        description: 'Manage activity categories',
        entity: ActivityOption,
        component: 'StatusManagement'
      },
      {
        id: 'template-availability',
        label: 'Template Availability Options',
        description: 'Manage template availability states',
        entity: TemplateAvailabilityOption,
        component: 'OptionManagement'
      },
      {
        id: 'sop-availability',
        label: 'SOP Availability Options',
        description: 'Manage SOP availability states',
        entity: SOPAvailabilityOption,
        component: 'OptionManagement'
      },
      {
        id: 'completion-frequency',
        label: 'Frequency Options',
        description: 'Manage frequency options',
        entity: CompletionFrequencyOption,
        component: 'OptionManagement'
      },
      {
        id: 'responsibility-completion',
        label: 'Responsibility Completion Options',
        description: 'Manage responsibility completion options',
        entity: ResponsibilityCompletionOption,
        component: 'OptionManagement'
      },
      {
        id: 'responsibility-processing',
        label: 'Responsibility Processing Options',
        description: 'Manage responsibility processing options',
        entity: ResponsibilityProcessingOption,
        component: 'OptionManagement'
      },
      {
        id: 'responsibility-internal',
        label: 'Responsibility Internal Options',
        description: 'Manage internal responsibility options',
        entity: ResponsibilityInternalOption,
        component: 'OptionManagement'
      },
      {
        id: 'responsibility-external',
        label: 'Responsibility External Options',
        description: 'Manage external responsibility options',
        entity: ResponsibilityExternalOption,
        component: 'OptionManagement'
      },
      {
        id: 'control-mechanism',
        label: 'Control Mechanism Options',
        description: 'Manage control mechanism options',
        entity: ControlMechanismOption,
        component: 'OptionManagement'
      },
      {
        id: 'custom-field-1',
        label: customFieldLabels['template_custom_field_1'] ? `${customFieldLabels['template_custom_field_1']} Options` : 'Custom Field 1 Options',
        description: 'Manage custom field 1 options',
        entity: CustomField1Option,
        component: 'OptionManagement'
      },
      {
        id: 'custom-field-2',
        label: customFieldLabels['template_custom_field_2'] ? `${customFieldLabels['template_custom_field_2']} Options` : 'Custom Field 2 Options',
        description: 'Manage custom field 2 options',
        entity: CustomField2Option,
        component: 'OptionManagement'
      },
      {
        id: 'custom-field-3',
        label: customFieldLabels['template_custom_field_3'] ? `${customFieldLabels['template_custom_field_3']} Options` : 'Custom Field 3 Options',
        description: 'Manage custom field 3 options',
        entity: CustomField3Option,
        component: 'OptionManagement'
      },
      {
        id: 'custom-field-4',
        label: customFieldLabels['template_custom_field_4'] ? `${customFieldLabels['template_custom_field_4']} Options` : 'Custom Field 4 Options',
        description: 'Manage custom field 4 options',
        entity: CustomField4Option,
        component: 'OptionManagement'
      },
      {
        id: 'custom-field-labels',
        label: 'Custom Field Labels',
        description: 'Define user-friendly names for custom fields',
        entity: CustomFieldLabel,
        component: 'CustomFieldLabelManagement'
      }
    ];
  }, [customFieldLabels]);

  const currentOption = managementOptions.find(opt => opt.id === selectedOption);

  const renderManagementComponent = () => {
    if (!currentOption) return null;

    switch (currentOption.component) {
      case 'CategoryManagement':
        return <CategoryManagement onStatsUpdate={loadCustomFieldLabels} accessLevel={accessLevel} />;
      
      case 'UserTaskCategoryManagement':
        return <UserTaskCategoryManagement accessLevel={accessLevel} />;
      
      case 'StatusManagement':
        return (
          <StatusManagement 
            entity={currentOption.entity}
            title={currentOption.label}
            description={currentOption.description}
            onUpdate={loadCustomFieldLabels}
            accessLevel={accessLevel}
          />
        );
      
      case 'OptionManagement':
        return (
          <OptionManagement
            entity={currentOption.entity}
            title={currentOption.label}
            description={currentOption.description}
            onUpdate={loadCustomFieldLabels}
            isResponsibility={currentOption.id.startsWith('responsibility-')}
            accessLevel={accessLevel}
          />
        );
      
      case 'CustomFieldLabelManagement':
        return (
          <CustomFieldLabelManagement 
            onStatsUpdate={() => {
              clearCustomFieldLabelsCache();
              loadCustomFieldLabels();
            }} 
            accessLevel={accessLevel} 
          />
        );
      
      default:
        return null;
    }
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
          <h1 className="text-3xl font-bold text-slate-900">Documents Fields & Data Definitions</h1>
          <p className="text-slate-600 mt-1">Manage lookup tables and system configuration</p>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Document Templates Management
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
