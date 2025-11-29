import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MoreHorizontal, Eye, Edit, ArrowUp, ArrowDown, Columns, Download, FileText, ImageIcon, AlertTriangle, MapPin, GripVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import ViewOrderDialog from "./ViewOrderDialog";
import CreateEditOrderDialog from "./CreateEditOrderDialog";
import DateRangeFilter from "./DateRangeFilter";

const ALL_COLUMNS = [
  { key: 'duplicate_indicator', label: '', sortable: false, filterable: false, width: '40px' },
  { key: 'stop_code', label: 'Κωδικός Στάσης', sortable: true, filterable: true },
  { key: 'stop_name', label: 'Ονομασία Στάσης', sortable: true, filterable: true },
  { key: 'municipality_community', label: 'Δήμος/Κοινότητα', sortable: true, filterable: true },
  { key: 'district', label: 'Επαρχία', sortable: true, filterable: true },
  { key: 'is_active', label: 'Κατάσταση', sortable: true, filterable: true },
  { key: 'order_date', label: 'Ημερ. Παραγγελίας', sortable: true, filterable: false, dateFilter: true },
  { key: 'order_type', label: 'Τύπος Παραγγελίας', sortable: true, filterable: true },
  { key: 'implementation_schedule', label: 'Χρονοδιάγραμμα', sortable: true, filterable: false, dateFilter: true },
  { key: 'is_urgent', label: 'Επείγον', sortable: true, filterable: true },
  { key: 'main_order_reference', label: 'Αναφορά Παραγγελίας', sortable: true, filterable: true },
  { key: 'latitude', label: 'Γ. Πλάτος', sortable: true, filterable: false },
  { key: 'longitude', label: 'Γ. Μήκος', sortable: true, filterable: false },
  { key: 'updated_date', label: 'Τελευταία Ενημέρωση', sortable: true, filterable: false, dateFilter: true },
  { key: 'created_by', label: 'Δημιουργός', sortable: true, filterable: true },
];

export default function OrderTable({ items, isLoading, onOrderSaved, usersCache }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'updated_date', direction: 'desc' });
  
  // Filtering state
  const [columnFilters, setColumnFilters] = useState({});
  const [dateRangeFilters, setDateRangeFilters] = useState({});
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('bsOrderVisibleColumns');
      return saved ? JSON.parse(saved) : ['duplicate_indicator', 'stop_code', 'stop_name', 'municipality_community', 'district', 'is_active', 'order_date', 'is_urgent', 'main_order_reference'];
    } catch {
      return ['duplicate_indicator', 'stop_code', 'stop_name', 'municipality_community', 'district', 'is_active', 'order_date', 'is_urgent', 'main_order_reference'];
    }
  });

  // Calculate duplicates
  const duplicateStopCodes = useMemo(() => {
    const stopCodeCounts = {};
    items.forEach(item => {
      if (item.stop_code) {
        stopCodeCounts[item.stop_code] = (stopCodeCounts[item.stop_code] || 0) + 1;
      }
    });
    
    return Object.keys(stopCodeCounts).filter(code => stopCodeCounts[code] > 1);
  }, [items]);

  const getDuplicateInfo = (item) => {
    if (!duplicateStopCodes.includes(item.stop_code)) return null;
    
    const duplicates = items.filter(i => i.stop_code === item.stop_code);
    return {
      count: duplicates.length,
      items: duplicates
    };
  };

  // Save visible columns to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('bsOrderVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const handleSort = (columnKey) => {
    let direction = 'desc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key: columnKey, direction });
  };

  const handleFilter = (columnKey, value) => {
    setColumnFilters(prev => {
      if (value === '' || value === 'all') {
        const newFilters = { ...prev };
        delete newFilters[columnKey];
        return newFilters;
      }
      return { ...prev, [columnKey]: value };
    });
  };

  const handleDateRangeFilter = (columnKey, dateRange) => {
    setDateRangeFilters(prev => {
      if (!dateRange || (!dateRange.startDate && !dateRange.endDate)) {
        const newFilters = { ...prev };
        delete newFilters[columnKey];
        return newFilters;
      }
      return { ...prev, [columnKey]: dateRange };
    });
  };

  const toggleColumnVisibility = (columnKey) => {
    setVisibleColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const startIndex = result.source.index;
    const endIndex = result.destination.index;
    
    if (startIndex !== endIndex) {
      const newColumns = Array.from(visibleColumns);
      const [removed] = newColumns.splice(startIndex, 1);
      newColumns.splice(endIndex, 0, removed);
      setVisibleColumns(newColumns);
    }
  };

  // Process data with sorting and filtering
  const processedData = useMemo(() => {
    let filtered = [...items];

    // Apply text filters
    Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
      filtered = filtered.filter(item => {
        const itemValue = String(item[columnKey] || '').toLowerCase();
        return itemValue.includes(filterValue.toLowerCase());
      });
    });

    // Apply date range filters
    Object.entries(dateRangeFilters).forEach(([columnKey, dateRange]) => {
      filtered = filtered.filter(item => {
        const itemDate = item[columnKey];
        if (!itemDate) return false;
        
        const date = new Date(itemDate);
        const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
        
        let matches = true;
        if (startDate) {
          matches = matches && date >= startDate;
        }
        if (endDate) {
          matches = matches && date <= endDate;
        }
        
        return matches;
      });
    });

    // Apply sorting
    if (sortConfig.key && sortConfig.key !== 'duplicate_indicator') {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        
        if (sortConfig.direction === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
    }

    return filtered;
  }, [items, columnFilters, dateRangeFilters, sortConfig]);

  const visibleColumnDefs = visibleColumns.map(key => ALL_COLUMNS.find(col => col.key === key)).filter(Boolean);

  const getUniqueValues = (columnKey) => {
    const values = items.map(item => item[columnKey]).filter(Boolean);
    return [...new Set(values)].sort();
  };

  const handleView = (item) => {
    setSelectedItem(item);
    setShowViewDialog(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setShowEditDialog(true);
  };

  const handleEditFromView = (item) => {
    setSelectedItem(item);
    setShowViewDialog(false);
    setShowEditDialog(true);
  };

  const handleItemSaved = () => {
    setShowEditDialog(false);
    setSelectedItem(null);
    onOrderSaved();
  };

  const renderCellContent = (item, columnKey) => {
    const value = item[columnKey];
    
    switch (columnKey) {
      case 'duplicate_indicator':
        const duplicateInfo = getDuplicateInfo(item);
        if (!duplicateInfo) return null;
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">Διπλότυπος Κωδικός Στάσης</p>
                  <p className="text-sm">Βρέθηκαν {duplicateInfo.count} στάσεις με κωδικό "{item.stop_code}"</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      
      case 'stop_code':
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-slate-900">{value}</span>
            {item.photos && item.photos.length > 0 && (
              <ImageIcon className="w-4 h-4 text-slate-400" />
            )}
            {item.latitude && item.longitude && (
              <MapPin className="w-4 h-4 text-green-500" />
            )}
          </div>
        );
        
      case 'stop_name':
        return <span className="font-medium text-slate-900">{value}</span>;
        
      case 'is_active':
        return (
          <Badge variant={value ? "default" : "secondary"}>
            {value ? 'Ενεργή' : 'Ανενεργή'}
          </Badge>
        );
        
      case 'is_urgent':
        return value ? (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Επείγον
          </Badge>
        ) : (
          <Badge variant="outline" className="text-slate-600">Κανονικό</Badge>
        );
        
      case 'latitude':
      case 'longitude':
        return value ? (
          <span className="text-sm text-slate-600 font-mono">
            {parseFloat(value).toFixed(4)}
          </span>
        ) : '-';
        
      case 'order_date':
      case 'implementation_schedule':
      case 'updated_date':
        return value ? (
          <span className="text-sm text-slate-600">
            {format(new Date(value), "dd/MM/yyyy")}
          </span>
        ) : '-';
        
      case 'created_by':
        return (
          <span className="text-sm text-slate-600">
            {usersCache[value] || value}
          </span>
        );
        
      default:
        return <span className="text-sm text-slate-600">{value || '-'}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              {Array(7).fill(0).map((_, j) => (
                <Skeleton key={j} className="h-4 w-24" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Column Selection and Controls */}
      <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
        <div className="text-sm text-slate-600 space-x-4">
          <span>Εμφάνιση {processedData.length} από {items.length} παραγγελίες</span>
          {duplicateStopCodes.length > 0 && (
            <span className="text-amber-600">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              {duplicateStopCodes.length} κωδικοί με διπλότυπα
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns className="w-4 h-4 mr-2" />
              Στήλες ({visibleColumns.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Επιλογή Στηλών</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_COLUMNS.map(column => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={visibleColumns.includes(column.key)}
                onCheckedChange={() => toggleColumnVisibility(column.key)}
                disabled={column.key === 'duplicate_indicator'} // Always show duplicate indicator
              >
                {column.label || 'Duplicates'}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {processedData.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            🚌
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Δεν βρέθηκαν παραγγελίες</h3>
          <p className="text-slate-600">Δοκιμάστε να προσαρμόσετε τα φίλτρα σας ή προσθέστε μια νέα παραγγελία.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="table-headers" direction="horizontal">
                {(provided) => (
                  <TableHeader 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      {visibleColumnDefs.map((column, index) => (
                        <Draggable 
                          key={column.key} 
                          draggableId={column.key} 
                          index={index}
                          isDragDisabled={column.key === 'duplicate_indicator'} // Don't allow dragging the duplicate indicator
                        >
                          {(provided, snapshot) => (
                            <TableHead 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`p-2 align-top transition-shadow ${
                                snapshot.isDragging ? 'bg-blue-50 shadow-lg' : ''
                              } ${column.width ? `w-[${column.width}]` : ''}`}
                              style={{
                                ...provided.draggableProps.style,
                                width: column.width || 'auto'
                              }}
                            >
                              <div className="space-y-2">
                                {/* Column Header with Sort */}
                                <div className="flex items-center gap-2">
                                  {column.key !== 'duplicate_indicator' && (
                                    <div
                                      {...provided.dragHandleProps}
                                      className="cursor-grab p-1 rounded-md hover:bg-slate-200 transition-colors"
                                      title="Drag to reorder"
                                    >
                                      <GripVertical className="w-4 h-4 text-slate-400" />
                                    </div>
                                  )}
                                  <span className="font-semibold text-slate-700 text-xs">{column.label}</span>
                                  {column.sortable && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleSort(column.key)}
                                    >
                                      {sortConfig.key === column.key ? (
                                        sortConfig.direction === 'desc' ? (
                                          <ArrowDown className="w-3 h-3" />
                                        ) : (
                                          <ArrowUp className="w-3 h-3" />
                                        )
                                      ) : (
                                        <ArrowDown className="w-3 h-3 opacity-30" />
                                      )}
                                    </Button>
                                  )}
                                  {column.dateFilter && (
                                    <DateRangeFilter
                                      columnKey={column.key}
                                      onFilterApply={handleDateRangeFilter}
                                      currentFilter={dateRangeFilters[column.key]}
                                    />
                                  )}
                                </div>

                                {/* Column Filter */}
                                {column.filterable && (
                                  <div className="w-full">
                                    {['order_type', 'is_urgent', 'is_active'].includes(column.key) ? (
                                      <select
                                        value={columnFilters[column.key] || 'all'}
                                        onChange={(e) => handleFilter(column.key, e.target.value)}
                                        className="w-full h-7 text-xs border rounded px-2"
                                      >
                                        <option value="all">Όλα</option>
                                        {getUniqueValues(column.key).map(value => (
                                          <option key={value} value={value}>
                                            {column.key === 'is_urgent' || column.key === 'is_active' 
                                              ? (value ? 'ΝΑΙ' : 'ΟΧΙ') 
                                              : value
                                            }
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <Input
                                        placeholder="Φίλτρο..."
                                        value={columnFilters[column.key] || ''}
                                        onChange={(e) => handleFilter(column.key, e.target.value)}
                                        className="h-7 text-xs"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableHead>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      <TableHead className="w-12 p-2 align-top">
                        <div className="h-6 w-6"></div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                )}
              </Droppable>
            </DragDropContext>
            <TableBody>
              {processedData.map((item) => (
                <TableRow 
                  key={item.id} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => handleView(item)}
                >
                  {visibleColumnDefs.map(column => (
                    <TableCell key={column.key} className="p-3" style={{ width: column.width || 'auto' }}>
                      {renderCellContent(item, column.key)}
                    </TableCell>
                  ))}
                  <TableCell className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleView(item); }}>
                          <Eye className="w-4 h-4 mr-2" />
                          Προβολή
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Επεξεργασία
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <ViewOrderDialog
        open={showViewDialog}
        onClose={() => setShowViewDialog(false)}
        item={selectedItem}
        onEdit={handleEditFromView}
      />

      <CreateEditOrderDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        item={selectedItem}
        onItemSaved={handleItemSaved}
      />
    </>
  );
}