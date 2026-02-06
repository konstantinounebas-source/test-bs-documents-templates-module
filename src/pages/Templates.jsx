import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FormTemplate } from "@/entities/FormTemplate";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, ChevronDown, Download, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import orderBy from 'lodash/orderBy';

import CreateTemplateDialog from "../components/templates/CreateTemplateDialog";
import TemplateTable from "../components/templates/TemplateTable";
import TemplateStats from "../components/templates/TemplateStats";
import ConfigurableStatCard from "../components/templates/ConfigurableStatCard";
import { logAction } from "@/components/lib/logger";
import { User } from "@/entities/User";
import { AppUser } from "@/entities/AppUser";
import { getCustomFieldLabels } from "@/components/lib/customFieldLabels";
import { usePageAccess } from "@/components/lib/usePageAccess";

// ALL available columns for selection
const ALL_COLUMNS = [
  { key: 'template_type', label: 'Type' },
  { key: 'template_code', label: 'Code' },
  { key: 'title_english', label: 'Title (EN)' },
  { key: 'title_greek', label: 'Title (GR)' },
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'current_version', label: 'Version' },
  { key: 'activity', label: 'Activity' },
  { key: 'sequence_number', label: 'Sequence #' },
  { key: 'description', label: 'Description' },
  { key: 'template_availability', label: 'Template Availability' },
  { key: 'sop_reference_title', label: 'SOP Reference' },
  { key: 'sop_availability', label: 'SOP Availability' },
  { key: 'memo', label: 'Memo' },
  { key: 'completion_frequency', label: 'Completion Frequency' },
  { key: 'responsibility_completion', label: 'Resp. Completion' },
  { key: 'responsibility_processing', label: 'Resp. Processing' },
  { key: 'responsibility_internal', label: 'Resp. Internal' },
  { key: 'responsibility_external', label: 'Resp. External' },
  { key: 'control_mechanism', label: 'Control Mechanism' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'effective_date', label: 'Effective Date' },
  { key: 'template_custom_field_1', label: 'Custom Field 1' },
  { key: 'template_custom_field_2', label: 'Custom Field 2' },
  { key: 'template_custom_field_3', label: 'Custom Field 3' },
  { key: 'template_custom_field_4', label: 'Custom Field 4' },
  { key: 'created_by', label: 'Created By' },
  { key: 'created_date', label: 'Created' },
  { key: 'updated_date', label: 'Updated' },
];

// New categorized structure for the dropdown
const COLUMN_CATEGORIES = [
  {
    label: 'Core Identification',
    keys: ['template_type', 'template_code', 'title_english', 'title_greek', 'sequence_number', 'description']
  },
  {
    label: 'Classification & Status',
    keys: ['category', 'status', 'activity', 'template_availability', 'sop_reference_title', 'sop_availability']
  },
  {
    label: 'Custom Fields',
    keys: ['template_custom_field_1', 'template_custom_field_2', 'template_custom_field_3', 'template_custom_field_4']
  },
  {
    label: 'Responsibilities & Control',
    keys: ['responsibility_completion', 'responsibility_processing', 'responsibility_internal', 'responsibility_external', 'control_mechanism']
  },
  {
    label: 'Frequency, Memos & Remarks',
    keys: ['completion_frequency', 'memo', 'remarks']
  },
  {
    label: 'System & Versioning',
    keys: ['current_version', 'effective_date', 'created_by', 'created_date', 'updated_date']
  },
];


export default function TemplatesPage() {
  // Check page access first
  const { hasAccess, isLoading: accessLoading, accessLevel } = usePageAccess('Templates');
  
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [columnFilters, setColumnFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'updated_date', direction: 'desc' }); // Default to descending
  const [statFilter, setStatFilter] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('visibleTemplateColumns');
      return saved ? JSON.parse(saved) : ['template_type', 'template_code', 'title_english', 'category', 'status', 'current_version', 'updated_date'];
    } catch {
      return ['template_type', 'template_code', 'title_english', 'category', 'status', 'current_version', 'updated_date'];
    }
  });
  const [customFieldLabels, setCustomFieldLabels] = useState({});
  const [usersCache, setUsersCache] = useState({});

  // Calculate actual visible columns count based on available columns
  const actualVisibleColumnsCount = useMemo(() => {
    return visibleColumns.filter(columnKey => 
      ALL_COLUMNS.find(col => col.key === columnKey)
    ).length;
  }, [visibleColumns]);

  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];

    // Apply tab filter
    if (activeTab === "file") {
      filtered = filtered.filter(t => t.template_type === "file_template");
    } else if (activeTab === "interactive") {
      filtered = filtered.filter(t => t.template_type === "interactive_form");
    }

    // Apply global search term
    if (searchTerm) {
      filtered = filtered.filter(t => 
        Object.values(t).some(value => 
          String(value || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply stat filter from clickable cards
    if (statFilter) {
        filtered = filtered.filter(t => {
            const tValue = t[statFilter.field];
            const filterValue = statFilter.value;
            if (filterValue === 'Not Set') {
                return tValue === null || tValue === undefined || tValue === '';
            }
            return String(tValue) === String(filterValue);
        });
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = orderBy(filtered, [sortConfig.key], [sortConfig.direction]);
    }

    return filtered;
  }, [templates, activeTab, searchTerm, sortConfig, statFilter]);

  useEffect(() => {
    if (hasAccess !== null && hasAccess) {
      loadTemplates();
      loadCustomFieldLabels();
      loadUsersCache();
    }
  }, [hasAccess]);
  
  useEffect(() => {
    localStorage.setItem('visibleTemplateColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Show loading while checking access
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // If no access, this component won't render (user will be redirected by usePageAccess)
  if (!hasAccess) {
    return null;
  }

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await FormTemplate.list("-updated_date"); // Default to descending order
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
    setIsLoading(false);
  };

  const loadCustomFieldLabels = async () => {
    const labels = await getCustomFieldLabels();
    setCustomFieldLabels(labels);
  };
  
  const loadUsersCache = async () => {
    try {
      const [systemUsers, appUsers] = await Promise.all([
        User.list().catch(() => []), // System users (platform)
        AppUser.list().catch(() => []) // App-specific users
      ]);
      
      const cache = {};
      
      // Add system users to cache, keyed by ID and email
      systemUsers.forEach(user => {
        if (user.id) cache[user.id] = user.full_name;
        if (user.email) cache[user.email] = user.full_name;
      });

      // Add/overwrite with app users to cache, keyed by ID
      // This allows AppUser overrides if necessary
      appUsers.forEach(user => {
        if (user.id) cache[user.id] = user.full_name;
      });

      setUsersCache(cache);
    } catch (error) {
      console.warn("Could not load users cache - using IDs/emails instead:", error);
      setUsersCache({});
    }
  };

  const handleStatClick = useCallback((field, value) => {
    setStatFilter(currentFilter => {
      if (currentFilter && currentFilter.field === field && currentFilter.value === value) {
        return null;
      }
      return { field, value };
    });
  }, []);

  const getStatFilterLabel = () => {
    if (!statFilter) return '';
    const fieldDef = ALL_COLUMNS.find(c => c.key === statFilter.field);
    const label = customFieldLabels[statFilter.field] || fieldDef?.label || statFilter.field;
    return `${label}: ${statFilter.value}`;
  };

  const handleTemplateCreated = useCallback(() => {
    setShowCreateDialog(false);
    loadTemplates();
  }, []);

  const handleTemplateUpdated = useCallback(() => {
    loadTemplates();
    loadUsersCache();
  }, []);

  const exportToCsv = useCallback((data, filename) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          let cell = row[header];
          if (cell === null || cell === undefined) return '';
          if (typeof cell === 'object') cell = JSON.stringify(cell);
          const strCell = String(cell);
          if (strCell.includes(',') || strCell.includes('"') || strCell.includes('\n') || strCell.includes('\r')) {
            return `"${strCell.replace(/"/g, '""')}"`;
          }
          return strCell;
        }).join(',')
      )
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logAction({
      action_type: 'EXPORT',
      target_entity: 'FormTemplate',
      details: { filename, record_count: data.length }
    });
  }, []);

  const handleExport = useCallback((type) => {
    const dataToExport = type === 'all' ? templates : filteredTemplates;
    const filename = `templates_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCsv(dataToExport, filename);
  }, [templates, filteredTemplates, exportToCsv]);

  const handleColumnReorder = useCallback((startIndex, endIndex) => {
    setVisibleColumns(prev => {
      const newColumns = Array.from(prev);
      const [removed] = newColumns.splice(startIndex, 1);
      newColumns.splice(endIndex, 0, removed);
      return newColumns;
    });
  }, []);

  const getColumnLabel = useCallback((column) => {
    if (column.key.startsWith('template_custom_field_')) {
      return customFieldLabels[column.key] || column.label;
    }
    return column.label;
  }, [customFieldLabels]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Document Templates</h1>
            <p className="text-slate-600 mt-1">Manage your organization's document templates and forms</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="shadow-sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleExport('view')}>
                  Export Current View (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExport('all')}>
                  Export All Data (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Only show Create button if user has full access */}
            {accessLevel === 'full_access' && (
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Template
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <TemplateStats templates={templates} isLoading={isLoading} />

        {/* Configurable Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map(id => (
            <ConfigurableStatCard 
              key={id}
              cardId={id}
              templates={templates}
              isLoading={isLoading}
              onStatClick={handleStatClick}
              activeFilter={statFilter}
              customFieldLabels={customFieldLabels}
              usersCache={usersCache}
            />
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Global search across all fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-50 border-slate-200 w-full"
              />
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              {statFilter && (
                <Badge variant="secondary" className="flex items-center gap-2 py-1.5 px-3">
                  <span className="font-normal">Filtering by:</span> 
                  <span className="font-semibold">{getStatFilterLabel && getStatFilterLabel()}</span>
                  <button onClick={() => setStatFilter(null)} className="ml-1 rounded-full hover:bg-slate-300 p-0.5">
                    <X className="w-3 h-3"/>
                  </button>
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Columns ({actualVisibleColumnsCount})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                   <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                   <DropdownMenuSeparator />
                   {COLUMN_CATEGORIES.map((category, index) => (
                     <React.Fragment key={category.label}>
                       {index > 0 && <DropdownMenuSeparator />}
                       <DropdownMenuLabel className="text-slate-500 font-semibold">{category.label}</DropdownMenuLabel>
                       {category.keys.map(key => {
                         const col = ALL_COLUMNS.find(c => c.key === key);
                         if (!col) return null;
                         return (
                           <DropdownMenuCheckboxItem
                             key={col.key}
                             checked={visibleColumns.includes(col.key)}
                             onCheckedChange={(checked) => {
                               setVisibleColumns(prev => 
                                 checked 
                                   ? prev.includes(col.key) ? prev : [...prev, col.key]
                                   : prev.filter(k => k !== col.key)
                               );
                             }}
                           >
                             {getColumnLabel(col)}
                           </DropdownMenuCheckboxItem>
                         );
                       })}
                     </React.Fragment>
                   ))}
                 </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Templates Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-slate-200 px-6 pt-6">
              <TabsList className="grid w-full max-w-md grid-cols-3 bg-slate-100">
                <TabsTrigger value="all">All Templates</TabsTrigger>
                <TabsTrigger value="file">File Templates</TabsTrigger>
                <TabsTrigger value="interactive">Interactive Forms</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="mt-0">
              <TemplateTable 
                templates={filteredTemplates} 
                isLoading={isLoading}
                onTemplateUpdated={handleTemplateUpdated}
                visibleColumns={visibleColumns}
                onColumnReorder={handleColumnReorder}
                sortConfig={sortConfig}
                setSortConfig={setSortConfig}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
                usersCache={usersCache}
                accessLevel={accessLevel} // Pass access level to table
              />
            </TabsContent>
            <TabsContent value="file" className="mt-0">
              <TemplateTable 
                templates={filteredTemplates} 
                isLoading={isLoading}
                onTemplateUpdated={handleTemplateUpdated}
                visibleColumns={visibleColumns}
                onColumnReorder={handleColumnReorder}
                sortConfig={sortConfig}
                setSortConfig={setSortConfig}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
                usersCache={usersCache}
                accessLevel={accessLevel} // Pass access level to table
              />
            </TabsContent>
            <TabsContent value="interactive" className="mt-0">
              <TemplateTable 
                templates={filteredTemplates} 
                isLoading={isLoading}
                onTemplateUpdated={handleTemplateUpdated}
                visibleColumns={visibleColumns}
                onColumnReorder={handleColumnReorder}
                sortConfig={sortConfig}
                setSortConfig={setSortConfig}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
                usersCache={usersCache}
                accessLevel={accessLevel} // Pass access level to table
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Only show Create dialog if user has full access */}
      {accessLevel === 'full_access' && (
        <CreateTemplateDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onTemplateCreated={handleTemplateCreated}
        />
      )}
    </div>
  );
}