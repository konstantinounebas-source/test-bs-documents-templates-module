
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ALL_FIELDS = [
  { key: 'status', label: 'Status', hasCustomLabels: false },
  { key: 'activity', label: 'Activity', hasCustomLabels: false },
  { key: 'category', label: 'Category', hasCustomLabels: false },
  { key: 'template_availability', label: 'Template Availability', hasCustomLabels: false },
  { key: 'sop_availability', label: 'SOP Availability', hasCustomLabels: false },
  { key: 'completion_frequency', label: 'Completion Frequency', hasCustomLabels: false },
  { key: 'control_mechanism', label: 'Control Mechanism', hasCustomLabels: false },
  { key: 'template_custom_field_1', label: 'Custom Field 1', hasCustomLabels: true },
  { key: 'template_custom_field_2', label: 'Custom Field 2', hasCustomLabels: true },
  { key: 'template_custom_field_3', label: 'Custom Field 3', hasCustomLabels: true },
  { key: 'template_custom_field_4', label: 'Custom Field 4', hasCustomLabels: true },
  { key: 'created_by', label: 'Created By', hasCustomLabels: false },
  { key: 'responsibility_completion', label: 'Resp. Completion', hasCustomLabels: false },
  { key: 'responsibility_processing', label: 'Resp. Processing', hasCustomLabels: false },
  { key: 'responsibility_internal', label: 'Resp. Internal', hasCustomLabels: false },
  { key: 'responsibility_external', label: 'Resp. External', hasCustomLabels: false },
];

export default function ConfigurableStatCard({ 
  cardId, 
  templates, 
  isLoading, 
  onStatClick, 
  activeFilter, 
  customFieldLabels,
  usersCache 
}) {
  const [selectedField, setSelectedField] = useState('');
  const [stats, setStats] = useState([]);
  
  // Load saved configuration on mount
  useEffect(() => {
    const saved = localStorage.getItem(`statCard_${cardId}`);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setSelectedField(config.field);
      } catch (error) {
        console.warn(`Failed to load config for card ${cardId}:`, error);
      }
    }
  }, [cardId]);

  // Calculate stats when field or templates change
  useEffect(() => {
    if (!selectedField || !templates || templates.length === 0) {
      setStats([]);
      return;
    }

    const fieldCounts = {};
    templates.forEach(template => {
      let value = template[selectedField];
      
      // For user-related fields, convert IDs to names using usersCache
      if (['created_by', 'responsibility_completion', 'responsibility_processing', 
           'responsibility_internal', 'responsibility_external'].includes(selectedField)) {
        value = usersCache[value] || value || 'Not Set';
      } else if (value === null || value === undefined || value === '') {
        value = 'Not Set';
      }
      
      fieldCounts[value] = (fieldCounts[value] || 0) + 1;
    });

    // Convert to array and sort by count (descending)
    const sortedStats = Object.entries(fieldCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    setStats(sortedStats);
  }, [selectedField, templates, usersCache]);

  // Save configuration when field changes
  useEffect(() => {
    if (selectedField) {
      localStorage.setItem(`statCard_${cardId}`, JSON.stringify({
        field: selectedField
      }));
    }
  }, [selectedField, cardId]);

  const getFieldLabel = (field) => {
    if (field.hasCustomLabels) {
      return customFieldLabels[field.key] || field.label;
    }
    return field.label;
  };

  const handleStatClick = (value) => {
    if (onStatClick && selectedField) {
      onStatClick(selectedField, value);
    }
  };

  const isActive = (value) => {
    return activeFilter && 
           activeFilter.field === selectedField && 
           activeFilter.value === value;
  };

  return (
    <Card className="border-slate-200 hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Field Selection */}
          <div className="flex items-center justify-between">
            <Select 
              value={selectedField || 'no_field'} 
              onValueChange={(val) => setSelectedField(val === 'no_field' ? '' : val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a field to analyze" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="no_field">-- Select Field --</SelectItem>
                {ALL_FIELDS.map(field => (
                  <SelectItem key={field.key} value={field.key}>
                    {getFieldLabel(field)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats Display */}
          {!selectedField ? (
            <div className="text-center py-8 text-slate-400">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a field to see statistics</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-6" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stats.slice(0, 10).map((stat, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer ${
                    isActive(stat.value)
                      ? 'bg-blue-100 border border-blue-300' 
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => handleStatClick(stat.value)}
                >
                  <span className="text-sm font-medium text-slate-700 truncate max-w-32" title={stat.value}>
                    {stat.value}
                  </span>
                  <span className="text-sm text-slate-900 font-semibold bg-slate-100 px-2 py-1 rounded">
                    {stat.count}
                  </span>
                </div>
              ))}
              {stats.length === 0 && (
                <div className="text-center py-4 text-slate-400">
                  <p className="text-sm">No data available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
