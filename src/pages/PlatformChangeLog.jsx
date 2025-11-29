
import React, { useState, useEffect, useMemo } from "react";
import { PlatformChangeLog } from "@/entities/PlatformChangeLog";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Download, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

import CreateChangeLogDialog from "../components/changelog/CreateChangeLogDialog";
import AdvancedChangeLogTable from "../components/changelog/AdvancedChangeLogTable";
import ChangeLogStats from "../components/changelog/ChangeLogStats";
import { usePageAccess } from "@/components/lib/usePageAccess";

const statusColors = {
  "Εκκρεμεί": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Υλοποιήθηκε": "bg-green-100 text-green-800 border-green-200",
  "Προγραμματισμένο": "bg-blue-100 text-blue-800 border-blue-200",
  "Απορρίφθηκε": "bg-red-100 text-red-800 border-red-200",
  "Μελλοντική Επέκταση": "bg-purple-100 text-purple-800 border-purple-200"
};

const typeColors = {
  "Αλλαγή": "bg-blue-100 text-blue-800",
  "Εισήγηση": "bg-green-100 text-green-800",
  "Σφάλμα": "bg-red-100 text-red-800",
  "Βελτιστοποίηση": "bg-orange-100 text-orange-800",
  "Άλλο": "bg-gray-100 text-gray-800"
};

export default function PlatformChangeLogPage() {
  const { hasAccess, isLoading: accessLoading, accessLevel } = usePageAccess('PlatformChangeLog');
  
  const [changeLogItems, setChangeLogItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // Kept, though UI removed
  const [typeFilter, setTypeFilter] = useState("");     // Kept, though UI removed
  const [statFilter, setStatFilter] = useState({ field: 'status', value: 'Εκκρεμεί' }); // Default to "Εκκρεμεί"

  useEffect(() => {
    if (hasAccess) {
      loadChangeLogItems();
    }
  }, [hasAccess]);

  const loadChangeLogItems = async () => {
    setIsLoading(true);
    try {
      const data = await PlatformChangeLog.list("-updated_date");
      setChangeLogItems(data);
    } catch (error) {
      console.error("Error loading change log items:", error);
    }
    setIsLoading(false);
  };

  const handleStatClick = (field, value) => {
    // If clicking "Συνολικά" (field is null), clear the filter
    if (field === null) {
      setStatFilter(null);
      setStatusFilter("");
      return;
    }

    setStatFilter(currentFilter => {
      if (currentFilter && currentFilter.field === field && currentFilter.value === value) {
        return null; // Remove filter if clicking the same status
      }
      return { field, value };
    });
    setStatusFilter(""); // Clear dropdown filter when using stat filter
  };

  const filteredItems = useMemo(() => {
    let filtered = [...changeLogItems];

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.related_page?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply stat filter (from clicking on stat cards)
    if (statFilter) {
      filtered = filtered.filter(item => {
        const tValue = item[statFilter.field];
        const filterValue = statFilter.value;
        if (filterValue === 'Not Set') {
          return tValue === null || tValue === undefined || tValue === '';
        }
        return String(tValue) === String(filterValue);
      });
    }
    // Apply dropdown status filter (if no stat filter is active) - this will only apply if statusFilter is manually set elsewhere or has a default, as its UI is removed
    else if (statusFilter) { 
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply type filter - this will only apply if typeFilter is manually set elsewhere or has a default, as its UI is removed
    if (typeFilter) {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    return filtered;
  }, [changeLogItems, searchTerm, statusFilter, typeFilter, statFilter]);

  const handleChangeLogCreated = () => {
    setShowCreateDialog(false);
    loadChangeLogItems();
  };

  const handleChangeLogUpdated = () => {
    loadChangeLogItems();
  };

  const exportToCsv = () => {
    if (filteredItems.length === 0) return;
    
    const headers = [
      'Τίτλος', 'Περιγραφή', 'Τύπος', 'Κατάσταση', 'Σχετική Σελίδα', 
      'Δημιουργός', 'Ημερομηνία Δημιουργίας', 'Έκδοση Υλοποίησης', 
      'Ημερομηνία Υλοποίησης', 'Ανατέθηκε σε', 'Προθεσμία', 'Σημειώσεις'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredItems.map(item => [
        `"${item.title || ''}"`,
        `"${item.description || ''}"`,
        `"${item.type || ''}"`,
        `"${item.status || ''}"`,
        `"${item.related_page || ''}"`,
        `"${item.created_by_full_name || ''}"`,
        `"${item.created_date ? format(new Date(item.created_date), 'dd/MM/yyyy') : ''}"`,
        `"${item.implemented_in_release || ''}"`,
        `"${item.implemented_in_release_date ? format(new Date(item.implemented_in_release_date), 'dd/MM/yyyy') : ''}"`,
        `"${item.assigned_to || ''}"`,
        `"${item.due_date ? format(new Date(item.due_date), 'dd/MM/yyyy') : ''}"`,
        `"${item.notes || ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `platform_change_log_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatFilterLabel = () => {
    if (!statFilter) return '';
    const fieldLabel = statFilter.field === 'status' ? 'Κατάσταση' : statFilter.field;
    return `${fieldLabel}: ${statFilter.value}`;
  };

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Redirect is handled by the hook
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Platform Change Log</h1>
            <p className="text-slate-600 mt-1">Καταχωρίστε και διαχειριστείτε αλλαγές, προτάσεις και βελτιώσεις της πλατφόρμας</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={exportToCsv}
              variant="outline" 
              className="shadow-sm"
              disabled={filteredItems.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            {accessLevel === 'full_access' && (
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                <Plus className="w-5 h-5 mr-2" />
                Νέα Καταχώριση
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <ChangeLogStats 
          items={changeLogItems} 
          isLoading={isLoading} 
          onStatClick={handleStatClick}
          activeFilter={statFilter}
        />

        {/* Global Search and Active Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Αναζήτηση σε τίτλο, περιγραφή, σχετική σελίδα..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-50 border-slate-200 w-full"
              />
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              {statFilter && (
                <Badge variant="secondary" className="flex items-center gap-2 py-1.5 px-3">
                  <span className="font-normal">Φίλτρο:</span> 
                  <span className="font-semibold">{getStatFilterLabel()}</span>
                  <button onClick={() => setStatFilter(null)} className="ml-1 rounded-full hover:bg-slate-300 p-0.5">
                    <X className="w-3 h-3"/>
                  </button>
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Change Log Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <AdvancedChangeLogTable 
            items={filteredItems} 
            isLoading={isLoading}
            onItemUpdated={handleChangeLogUpdated}
            statusColors={statusColors}
            typeColors={typeColors}
            accessLevel={accessLevel}
          />
        </div>
      </div>

      {accessLevel === 'full_access' && (
        <CreateChangeLogDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onItemCreated={handleChangeLogCreated}
        />
      )}
    </div>
  );
}
