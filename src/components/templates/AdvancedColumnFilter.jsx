
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, X } from "lucide-react";
import { Label } from "@/components/ui/label"; // Added Label import

// This component implementation replaces the original AdvancedColumnFilter
// based on the provided outline, which describes a different filtering mechanism.
// It assumes immediate application of filters via `onFilterChange`.

export default function AdvancedColumnFilter({ onFilterChange, categories = [], customFieldLabels = {} }) {
  // State to hold current filter selections
  const [filters, setFilters] = useState({});

  // Placeholder data for demonstration. In a real app, these would likely be fetched or passed as props.
  const statusOptions = [
    { id: 'active', name: 'Active' },
    { id: 'pending', name: 'Pending' },
    { id: 'completed', name: 'Completed' },
  ];

  const activityOptions = [
    { id: 'created', name: 'Created' },
    { id: 'updated', name: 'Updated' },
    { id: 'deleted', name: 'Deleted' },
  ];

  // Dynamic options for custom fields. Assuming similar structure to categories/status.
  // In a real application, these might be loaded based on configuration or fetched.
  const [dynamicOptions, setDynamicOptions] = useState({
    custom1Options: [{ id: 'c1o1', name: 'Project Alpha' }, { id: 'c1o2', name: 'Project Beta' }],
    custom2Options: [{ id: 'c2o1', name: 'Department A' }, { id: 'c2o2', name: 'Department B' }],
    custom3Options: [{ id: 'c3o1', name: 'Region North' }, { id: 'c3o2', name: 'Region South' }],
    custom4Options: [{ id: 'c4o1', name: 'Level 1' }, { id: 'c4o2', name: 'Level 2' }],
  });

  // Function to handle changes in filter selections
  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // Remove empty values from the filter object before sending to parent
      if (value === '') {
        delete newFilters[key];
      }
      onFilterChange(newFilters); // Notify parent component of filter changes
      return newFilters;
    });
  };

  // Function to clear all filters
  const handleClearFilters = () => {
    setFilters({});
    onFilterChange({}); // Notify parent component that all filters are cleared
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800">Advanced Filters</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Category Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Category</Label>
          <Select value={filters.category || 'all'} onValueChange={(value) => handleFilterChange('category', value === 'all' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.filter(cat => cat.id).map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Status</Label>
          <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statusOptions.filter(opt => opt.id).map((option) => (
                <SelectItem key={option.id} value={option.name}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Activity Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Activity</Label>
          <Select value={filters.activity || 'all'} onValueChange={(value) => handleFilterChange('activity', value === 'all' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Activities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              {activityOptions.filter(opt => opt.id).map((option) => (
                <SelectItem key={option.id} value={option.name}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Template Type Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Template Type</Label>
          <Select value={filters.template_type || 'all'} onValueChange={(value) => handleFilterChange('template_type', value === 'all' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="file_template">File Template</SelectItem>
              <SelectItem value="interactive_form">Interactive Form</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Field Filters */}
        {[1, 2, 3, 4].map(num => {
          const fieldKey = `template_custom_field_${num}`;
          const label = customFieldLabels[fieldKey] || `Custom Field ${num}`;
          const optionsKey = `custom${num}Options`;
          const filterKey = `template_custom_field_${num}`;

          return (
            <div key={fieldKey} className="space-y-2">
              <Label className="text-sm">{label}</Label>
              <Select value={filters[filterKey] || 'all'} onValueChange={(value) => handleFilterChange(filterKey, value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={`All ${label}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {label}</SelectItem>
                  {(dynamicOptions[optionsKey] || []).filter(opt => opt.id).map((option) => (
                    <SelectItem key={option.id} value={option.name}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button size="sm" variant="outline" onClick={handleClearFilters} className="w-full sm:w-auto">
          Clear Filters
        </Button>
      </div>
    </div>
  );
}
