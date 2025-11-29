
import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { usePageAccess } from '@/components/lib/usePageAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BarChart3, PieChart, TrendingUp, Plus, X, Download, Printer, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import DataTableFilter from '../components/delivery/DataTableFilter'; // Assuming this path is correct based on original file
import { format } from 'date-fns';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const AVAILABLE_FIELDS = [
  { value: 'bus_stop_city', label: 'Πόλη Στάσης', source: 'bus_stop' },
  { value: 'bus_stop_shelter_type', label: 'Τύπος Στεγάστρου', source: 'bus_stop' },
  { value: 'bus_stop_status', label: 'Κατάσταση Στάσης', source: 'bus_stop' },
  { value: 'snag_snag_type', label: 'Τύπος Εκκρεμότητας', source: 'snag' },
  { value: 'snag_snag_category', label: 'Κατηγορία Εκκρεμότητας', source: 'snag' },
  { value: 'snag_element_category', label: 'Στοιχείο', source: 'snag' },
  { value: 'snag_work_type', label: 'Τύπος Εργασίας', source: 'snag' }
];

export default function DeliveryReportingPage() {
  const { hasAccess, isLoading: accessLoading } = usePageAccess('DeliveryReporting');
  
  const [busStops, setBusStops] = useState([]);
  const [statesOfDelivery, setStatesOfDelivery] = useState([]);
  const [snags, setSnags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customTables, setCustomTables] = useState([]);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [newTable, setNewTable] = useState({ 
    name: '', 
    rowFields: [], 
    columnFields: []
  });

  // Chart filters and sorting
  const [chartFilters, setChartFilters] = useState({});
  const [chartSort, setChartSort] = useState({});

  // Pivot table filters and sorting
  const [pivotTableFilters, setPivotTableFilters] = useState({}); // { tableId: { row: { field: [values] }, col: { field: [values] } } }
  const [pivotTableSorts, setPivotTableSorts] = useState({}); // { tableId: { row: { field: direction }, col: { field: direction } } }

  useEffect(() => {
    if (hasAccess) {
      loadData();
      loadCustomTables();
    }
  }, [hasAccess]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [busStopsData, statesData, snagsData] = await Promise.all([
        base44.entities.BusStop.list(),
        base44.entities.StateOfDelivery.list(),
        base44.entities.SnaggingList.list()
      ]);
      
      setBusStops(busStopsData);
      setStatesOfDelivery(statesData);
      setSnags(snagsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  const loadCustomTables = () => {
    const saved = localStorage.getItem('customDeliveryTables');
    if (saved) {
      try {
        const parsedTables = JSON.parse(saved);
        
        const migratedTables = parsedTables.map(table => {
          let currentTable = { ...table };

          if (currentTable.rowField && currentTable.columnField) {
            currentTable.rowFields = [currentTable.rowField];
            currentTable.columnFields = [currentTable.columnField];
            delete currentTable.rowField;
            delete currentTable.columnField;
          }

          if (!Array.isArray(currentTable.rowFields)) {
            currentTable.rowFields = currentTable.rowFields ? [currentTable.rowFields] : [];
          }

          if (!Array.isArray(currentTable.columnFields)) {
            currentTable.columnFields = currentTable.columnFields ? [currentTable.columnFields] : [];
          }
          
          return currentTable;
        }).filter(table => table.rowFields.length > 0 && table.columnFields.length > 0);
        
        setCustomTables(migratedTables);
        
        if (migratedTables.length > 0) {
          localStorage.setItem('customDeliveryTables', JSON.stringify(migratedTables));
        } else {
          localStorage.removeItem('customDeliveryTables');
        }
      } catch (e) {
        console.error('Error loading custom tables:', e);
        localStorage.removeItem('customDeliveryTables');
        setCustomTables([]);
      }
    }
  };

  const saveCustomTables = (tables) => {
    localStorage.setItem('customDeliveryTables', JSON.stringify(tables));
    setCustomTables(tables);
  };

  const stats = useMemo(() => {
    const totalStops = busStops.length;
    const closedStops = statesOfDelivery.filter(s => s.closed).length;
    const installedStops = statesOfDelivery.filter(s => s.installed && !s.closed).length;
    const openInternalSnags = snags.filter(s => !s.closed && s.snag_category === 'internal').length;
    const openExternalSnags = snags.filter(s => !s.closed && s.snag_category === 'external').length;
    const totalOpenSnags = openInternalSnags + openExternalSnags;

    return {
      totalStops,
      closedStops,
      installedStops,
      pendingStops: totalStops - closedStops - installedStops,
      openInternalSnags,
      openExternalSnags,
      totalOpenSnags,
      completionRate: totalStops > 0 ? Math.round((closedStops / totalStops) * 100) : 0
    };
  }, [busStops, statesOfDelivery, snags]);

  // Apply filters and sorting to chart data
  const applyChartFiltersAndSort = (data, chartId) => {
    let filtered = [...data];
    
    // Apply filters
    const filters = chartFilters[chartId];
    if (filters) {
      Object.entries(filters).forEach(([field, values]) => {
        if (values && values.length > 0) {
          filtered = filtered.filter(item => values.includes(String(item[field])));
        }
      });
    }

    // Apply sorting
    const sort = chartSort[chartId];
    if (sort) {
      filtered.sort((a, b) => {
        const aVal = String(a[sort.field] || '');
        const bVal = String(b[sort.field] || '');
        return sort.direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }

    return filtered;
  };

  const cityData = useMemo(() => {
    const cities = {};
    busStops.forEach(stop => {
      cities[stop.city] = (cities[stop.city] || 0) + 1;
    });
    const data = Object.entries(cities).map(([name, value]) => ({ name, value }));
    return applyChartFiltersAndSort(data, 'city');
  }, [busStops, chartFilters, chartSort]);

  const shelterTypeData = useMemo(() => {
    const types = {};
    busStops.forEach(stop => {
      types[stop.shelter_type] = (types[stop.shelter_type] || 0) + 1;
    });
    const data = Object.entries(types).map(([name, value]) => ({ name, value }));
    return applyChartFiltersAndSort(data, 'shelterType');
  }, [busStops, chartFilters, chartSort]);

  const statusData = useMemo(() => {
    const data = [
      { name: 'Ολοκληρωμένες', value: stats.closedStops, color: '#10b981' },
      { name: 'Σε Εξέλιξη', value: stats.installedStops, color: '#3b82f6' },
      { name: 'Εκκρεμούν', value: stats.pendingStops, color: '#f59e0b' }
    ];
    return applyChartFiltersAndSort(data, 'status');
  }, [stats, chartFilters, chartSort]);

  const snagTypeData = useMemo(() => {
    const types = {};
    snags.filter(s => !s.closed).forEach(snag => {
      types[snag.snag_type] = (types[snag.snag_type] || 0) + 1;
    });
    const data = Object.entries(types).map(([name, value]) => ({ name, value })).slice(0, 10);
    return applyChartFiltersAndSort(data, 'snagType');
  }, [snags, chartFilters, chartSort]);

  const handleChartFilter = (chartId, field, values) => {
    setChartFilters(prev => ({
      ...prev,
      [chartId]: {
        ...prev[chartId],
        [field]: values
      }
    }));
  };

  const handleChartSort = (chartId, field, direction) => {
    setChartSort(prev => ({
      ...prev,
      [chartId]: { field, direction }
    }));
  };

  const exportChartData = (data, filename, formatType) => { // Renamed format to formatType to avoid clash with date-fns format
    if (formatType === 'csv' || formatType === 'excel') {
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).join(',')).join('\n');
      const csvContent = `${headers}\n${rows}`;
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (formatType === 'print') {
      window.print();
    }
  };

  const exportPivotTable = (tableData, columnKeys, tableName, formatType) => { // Renamed format to formatType
    if (formatType === 'csv' || formatType === 'excel') {
      const headers = ['Row', ...columnKeys.map(col => col.values.join(' - '))].join(',');
      const rows = tableData.map(row => 
        [row.rowValues.join(' - '), ...columnKeys.map(col => row[col.key] || 0)].join(',')
      ).join('\n');
      const csvContent = `${headers}\n${rows}`;
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${tableName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (formatType === 'print') {
      window.print();
    }
  };

  const handleCreateTable = () => {
    if (!newTable.name || newTable.rowFields.length === 0 || newTable.columnFields.length === 0) return;
    
    const table = {
      id: Date.now().toString(),
      ...newTable
    };
    
    saveCustomTables([...customTables, table]);
    setShowTableDialog(false);
    setNewTable({ name: '', rowFields: [], columnFields: [] });
  };

  const handleDeleteTable = (id) => {
    saveCustomTables(customTables.filter(t => t.id !== id));
  };

  const toggleRowField = (fieldValue) => {
    setNewTable(prev => {
      const isSelected = prev.rowFields.includes(fieldValue);
      return {
        ...prev,
        rowFields: isSelected 
          ? prev.rowFields.filter(f => f !== fieldValue)
          : [...prev.rowFields, fieldValue]
      };
    });
  };

  const toggleColumnField = (fieldValue) => {
    setNewTable(prev => {
      const isSelected = prev.columnFields.includes(fieldValue);
      return {
        ...prev,
        columnFields: isSelected 
          ? prev.columnFields.filter(f => f !== fieldValue)
          : [...prev.columnFields, fieldValue]
      };
    });
  };

  const handlePivotRowFilter = (tableId, field, filterValues, sortOrder) => {
    setPivotTableFilters(prev => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        row: {
          ...(prev[tableId]?.row || {}),
          [field]: filterValues
        }
      }
    }));
    if (sortOrder) {
      setPivotTableSorts(prev => ({
        ...prev,
        [tableId]: {
          ...prev[tableId],
          row: {
            ...(prev[tableId]?.row || {}),
            [field]: sortOrder
          }
        }
      }));
    }
  };

  const handlePivotColFilter = (tableId, field, filterValues, sortOrder) => {
    setPivotTableFilters(prev => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        col: {
          ...(prev[tableId]?.col || {}),
          [field]: filterValues
        }
      }
    }));
    if (sortOrder) {
      setPivotTableSorts(prev => ({
        ...prev,
        [tableId]: {
          ...prev[tableId],
          col: {
            ...(prev[tableId]?.col || {}),
            [field]: sortOrder
          }
        }
      }));
    }
  };

  const applyFiltersAndSort = (keys, filters, sorts) => {
    let result = [...keys];

    // Apply filters - now checking if filters is an array
    if (Array.isArray(filters) && filters.length > 0) {
      result = result.filter(value => {
        const stringValue = String(value || '');
        if (stringValue === '' && filters.includes('(Blanks)')) return true;
        return filters.includes(stringValue);
      });
    }

    // Apply sorting - now checking the sort direction
    if (sorts === 'asc' || sorts === 'desc') {
      result.sort((a, b) => {
        if (sorts === 'asc') {
          return String(a || '').localeCompare(String(b || ''));
        } else {
          return String(b || '').localeCompare(String(a || ''));
        }
      });
    }

    return result;
  };

  const generatePivotTable = (table) => {
    let sourceData = [];
    const needsBusStops = table.rowFields.some(f => f.startsWith('bus_stop_')) || 
                          table.columnFields.some(f => f.startsWith('bus_stop_'));
    const needsSnags = table.rowFields.some(f => f.startsWith('snag_')) || 
                       table.columnFields.some(f => f.startsWith('snag_'));

    if (needsBusStops && !needsSnags) {
      sourceData = busStops.map(bs => ({
        ...bs,
        bus_stop_status: statesOfDelivery.find(s => s.bus_stop_id === bs.id)?.closed ? 'Ολοκληρωμένη' : 
                statesOfDelivery.find(s => s.bus_stop_id === bs.id)?.installed ? 'Σε Εξέλιξη' : 'Εκκρεμεί'
      }));
    } else if (needsSnags) {
      sourceData = snags.map(snag => {
        const busStop = busStops.find(bs => bs.id === snag.bus_stop_id);
        return {
          ...snag,
          bus_stop_city: busStop?.city,
          bus_stop_shelter_type: busStop?.shelter_type,
          bus_stop_status: statesOfDelivery.find(s => s.bus_stop_id === busStop?.id)?.closed ? 'Ολοκληρωμένη' : 
                          statesOfDelivery.find(s => s.bus_stop_id === busStop?.id)?.installed ? 'Σε Εξέλιξη' : 'Εκκρεμεί'
        };
      });
    }

    const getFieldValue = (item, field) => {
      const cleanField = field.replace('bus_stop_', '').replace('snag_', '');
      return item[cleanField] || item[field] || 'N/A';
    };

    const createRowKey = (item) => {
      return table.rowFields.map(f => getFieldValue(item, f)).join('|||');
    };

    const createColumnKey = (item) => {
      return table.columnFields.map(f => getFieldValue(item, f)).join('|||');
    };

    const pivotMap = {};
    const allRowKeys = new Set();
    const allColKeys = new Set();

    sourceData.forEach(item => {
      const rowKey = createRowKey(item);
      const colKey = createColumnKey(item);
      
      allRowKeys.add(rowKey);
      allColKeys.add(colKey);
      
      if (!pivotMap[rowKey]) {
        pivotMap[rowKey] = {};
      }
      pivotMap[rowKey][colKey] = (pivotMap[rowKey][colKey] || 0) + 1;
    });

    const currentTableFilters = pivotTableFilters[table.id] || {};
    const currentTableSorts = pivotTableSorts[table.id] || {};

    const filteredSortedRowKeys = applyFiltersAndSort(
        Array.from(allRowKeys),
        currentTableFilters.row?.['rows'] || [],
        currentTableSorts.row?.['rows']
    );

    const filteredSortedColKeys = applyFiltersAndSort(
        Array.from(allColKeys),
        currentTableFilters.col?.['cols'] || [],
        currentTableSorts.col?.['cols']
    );

    const data = filteredSortedRowKeys.map(rowKey => {
      const rowValues = rowKey.split('|||');
      const row = { rowKey, rowValues };
      
      filteredSortedColKeys.forEach(colKey => {
        row[colKey] = pivotMap[rowKey]?.[colKey] || 0;
      });
      
      return row;
    });

    const columnKeys = filteredSortedColKeys.map(key => ({
      key,
      values: key.split('|||')
    }));

    return { data, columnKeys, pivotMap }; // Return pivotMap to easily access cell values later
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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Delivery Reporting & Analytics</h1>
          <p className="text-slate-600 mt-1">Αναλυτικά στατιστικά και custom reports παραδόσεων</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Σύνολο Στάσεων</p>
                      <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalStops}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Ολοκληρωμένες</p>
                      <p className="text-2xl font-bold text-green-600 mt-2">{stats.closedStops}</p>
                      <p className="text-xs text-slate-500">{stats.completionRate}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Σε Εξέλιξη</p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">{stats.installedStops}</p>
                    </div>
                    <Loader2 className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Ανοιχτές Εκκρεμότητες</p>
                      <p className="text-2xl font-bold text-orange-600 mt-2">{stats.totalOpenSnags}</p>
                      <p className="text-xs text-slate-500">Εσ: {stats.openInternalSnags} | Εξ: {stats.openExternalSnags}</p>
                    </div>
                    <PieChart className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle>Κατάσταση Στάσεων</CardTitle>
                      <DataTableFilter
                        data={statusData}
                        field="name"
                        label="Κατάσταση"
                        onFilterChange={(field, values) => handleChartFilter('status', field, values)}
                        onSortChange={(field, direction) => handleChartSort('status', field, direction)}
                        currentFilters={chartFilters['status']?.['name'] || []}
                        currentSort={chartSort['status']?.['name'] || ''}
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => exportChartData(statusData, 'status_chart', 'csv')}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Export Excel/CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportChartData(statusData, 'status_chart', 'print')}>
                          <Printer className="w-4 h-4 mr-2" />
                          Print
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* City Distribution */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle>Κατανομή ανά Πόλη</CardTitle>
                      <DataTableFilter
                        data={cityData}
                        field="name"
                        label="Πόλη"
                        onFilterChange={(field, values) => handleChartFilter('city', field, values)}
                        onSortChange={(field, direction) => handleChartSort('city', field, direction)}
                        currentFilters={chartFilters['city']?.['name'] || []}
                        currentSort={chartSort['city']?.['name'] || ''}
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => exportChartData(cityData, 'city_chart', 'csv')}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Export Excel/CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportChartData(cityData, 'city_chart', 'print')}>
                          <Printer className="w-4 h-4 mr-2" />
                          Print
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={cityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Shelter Type Distribution */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle>Τύποι Στεγάστρων</CardTitle>
                      <DataTableFilter
                        data={shelterTypeData}
                        field="name"
                        label="Τύπος"
                        onFilterChange={(field, values) => handleChartFilter('shelterType', field, values)}
                        onSortChange={(field, direction) => handleChartSort('shelterType', field, direction)}
                        currentFilters={chartFilters['shelterType']?.['name'] || []}
                        currentSort={chartSort['shelterType']?.['name'] || ''}
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => exportChartData(shelterTypeData, 'shelter_type_chart', 'csv')}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Export Excel/CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportChartData(shelterTypeData, 'shelter_type_chart', 'print')}>
                          <Printer className="w-4 h-4 mr-2" />
                          Print
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={shelterTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {shelterTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Snag Types */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle>Top 10 Τύποι Εκκρεμοτήτων (Ανοιχτές)</CardTitle>
                      <DataTableFilter
                        data={snagTypeData}
                        field="name"
                        label="Τύπος"
                        onFilterChange={(field, values) => handleChartFilter('snagType', field, values)}
                        onSortChange={(field, direction) => handleChartSort('snagType', field, direction)}
                        currentFilters={chartFilters['snagType']?.['name'] || []}
                        currentSort={chartSort['snagType']?.['name'] || ''}
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => exportChartData(snagTypeData, 'snag_types_chart', 'csv')}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Export Excel/CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportChartData(snagTypeData, 'snag_types_chart', 'print')}>
                          <Printer className="w-4 h-4 mr-2" />
                          Print
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={snagTypeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Custom Pivot Tables */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Custom Pivot Tables</CardTitle>
                  <Button onClick={() => setShowTableDialog(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Νέος Πίνακας
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {customTables.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>Δεν υπάρχουν custom πίνακες. Δημιούργησε έναν νέο!</p>
                  </div>
                ) : (
                  customTables.map(table => {
                    const { data, columnKeys, pivotMap } = generatePivotTable(table);
                    return (
                      <div key={table.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-lg">{table.name}</h3>
                          <div className="flex gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => exportPivotTable(data, columnKeys, table.name, 'csv')}>
                                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                                  Export Excel/CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportPivotTable(data, columnKeys, table.name, 'print')}>
                                  <Printer className="w-4 h-4 mr-2" />
                                  Print
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteTable(table.id)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="border p-2 text-left font-semibold text-xs sticky left-0 z-10 bg-slate-100">
                                  <div className="flex items-center gap-1">
                                    {table.rowFields.map(f => AVAILABLE_FIELDS.find(field => field.value === f)?.label || f).join(' / ')}
                                    <DataTableFilter
                                        column="rows"
                                        data={Array.from(new Set(data.map(r => r.rowKey))).map(key => ({ rows: key }))}
                                        onFilterChange={(field, filterValues, sortOrder) => handlePivotRowFilter(table.id, 'rows', filterValues, sortOrder)}
                                        currentFilters={pivotTableFilters[table.id]?.row?.['rows'] || []}
                                    />
                                  </div>
                                </th>
                                {columnKeys.map((colKey, i) => (
                                  <th key={i} className="border p-2 text-center font-semibold text-xs min-w-[120px] bg-slate-100">
                                    {i === 0 && (
                                      <div className="flex items-center justify-center gap-1 mb-1">
                                        <DataTableFilter
                                            column="cols"
                                            data={columnKeys.map(c => ({ cols: c.key }))}
                                            onFilterChange={(field, filterValues, sortOrder) => handlePivotColFilter(table.id, 'cols', filterValues, sortOrder)}
                                            currentFilters={pivotTableFilters[table.id]?.col?.['cols'] || []}
                                        />
                                      </div>
                                    )}
                                    <div className="space-y-1">
                                      {colKey.values.map((val, vIdx) => (
                                        <div key={vIdx}>{val}</div>
                                      ))}
                                    </div>
                                  </th>
                                ))}
                                <th className="border bg-slate-200 p-2 text-center font-bold">
                                  Total
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.map((row, rowIndex) => {
                                const rowTotal = columnKeys.reduce((sum, col) => {
                                  return sum + (pivotMap[row.rowKey]?.[col.key] || 0);
                                }, 0);

                                return (
                                  <tr key={rowIndex}>
                                    <td className="border bg-slate-50 p-2 font-medium sticky left-0 z-10">
                                      {row.rowValues.join(' - ')}
                                    </td>
                                    {columnKeys.map((colKey, colIndex) => {
                                      const cellValue = pivotMap[row.rowKey]?.[colKey.key] || 0;

                                      return (
                                        <td 
                                          key={colIndex} 
                                          className="border p-2 text-center text-sm"
                                        >
                                          {cellValue}
                                        </td>
                                      );
                                    })}
                                    <td className="border bg-slate-100 p-2 text-center font-bold">
                                      {rowTotal}
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr>
                                <td className="border bg-slate-200 p-2 font-bold">
                                  Total
                                </td>
                                {columnKeys.map((colKey, colIndex) => {
                                  const colTotal = data.reduce((sum, row) => {
                                    return sum + (pivotMap[row.rowKey]?.[colKey.key] || 0);
                                  }, 0);

                                  return (
                                    <td key={colIndex} className="border bg-slate-200 p-2 text-center font-bold">
                                      {colTotal}
                                    </td>
                                  );
                                })}
                                <td className="border bg-slate-300 p-2 text-center font-bold">
                                  {data.reduce((grandSum, row) => {
                                    return grandSum + columnKeys.reduce((colSum, col) => {
                                      return colSum + (pivotMap[row.rowKey]?.[col.key] || 0);
                                    }, 0);
                                  }, 0)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Create Table Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Δημιουργία Custom Pivot Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Όνομα Πίνακα</Label>
              <Input
                value={newTable.name}
                onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                placeholder="π.χ. Στάσεις ανά Πόλη & Τύπο"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Γραμμές (Rows) - Επιλέξτε ένα ή περισσότερα</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {AVAILABLE_FIELDS.map(field => (
                  <div key={field.value} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`row-${field.value}`}
                      checked={newTable.rowFields.includes(field.value)}
                      onCheckedChange={() => toggleRowField(field.value)}
                    />
                    <label 
                      htmlFor={`row-${field.value}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {field.label}
                    </label>
                  </div>
                ))}
              </div>
              {newTable.rowFields.length > 0 && (
                <p className="text-xs text-slate-600">
                  Επιλεγμένα: {newTable.rowFields.map(f => AVAILABLE_FIELDS.find(field => field.value === f)?.label).join(', ')}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Στήλες (Columns) - Επιλέξτε ένα ή περισσότερα</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {AVAILABLE_FIELDS.map(field => (
                  <div key={field.value} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`col-${field.value}`}
                      checked={newTable.columnFields.includes(field.value)}
                      onCheckedChange={() => toggleColumnField(field.value)}
                    />
                    <label 
                      htmlFor={`col-${field.value}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {field.label}
                    </label>
                  </div>
                ))}
              </div>
              {newTable.columnFields.length > 0 && (
                <p className="text-xs text-slate-600">
                  Επιλεγμένα: {newTable.columnFields.map(f => AVAILABLE_FIELDS.find(field => field.value === f)?.label).join(', ')}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>
              Ακύρωση
            </Button>
            <Button 
              onClick={handleCreateTable} 
              disabled={!newTable.name || newTable.rowFields.length === 0 || newTable.columnFields.length === 0}
            >
              Δημιουργία
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
