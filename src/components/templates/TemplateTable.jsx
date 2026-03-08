import React, { useState } from "react";
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUpDown, Eye, Edit, History, FileText, BookOpen } from "lucide-react";
import { format } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import ViewDetailsDialog from "./ViewDetailsDialog";
import ViewHistoryDialog from "./ViewHistoryDialog";
import EditTemplateDialog from "./EditTemplateDialog";
import AdvancedColumnFilter from "./AdvancedColumnFilter";

const statusColorMap = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-slate-100 text-slate-800',
};

const typeColorMap = {
  file_template: 'text-blue-600',
  interactive_form: 'text-purple-600',
};

export default function TemplateTable({ 
  templates, 
  isLoading,
  onTemplateUpdated,
  visibleColumns,
  onColumnReorder,
  sortConfig,
  setSortConfig,
  columnFilters,
  setColumnFilters,
  usersCache,
  accessLevel
}) {
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [historyTemplate, setHistoryTemplate] = useState(null);
  
  const handleEdit = (template) => {
    setEditingTemplate(template);
  };
  
  const handleView = (template) => {
    setViewingTemplate(template);
  };
  
  const handleHistory = (template) => {
    setHistoryTemplate(template);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const onDragEnd = (result) => {
    if (!result.destination) return;
    onColumnReorder(result.source.index, result.destination.index);
  };
  
  const renderCellContent = (template, columnKey) => {
    const value = template[columnKey];
    switch(columnKey) {
      case 'template_type':
        return (
          <div className={`flex items-center gap-2 font-medium ${typeColorMap[value] || ''}`}>
            {value === 'file_template' ? <FileText className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
            {value === 'file_template' ? 'File Template' : 'Interactive Form'}
          </div>
        );
      case 'status':
        return <Badge className={`${statusColorMap[value?.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>{value}</Badge>;
      case 'effective_date':
      case 'created_date':
      case 'updated_date':
        return value ? format(new Date(value), 'dd MMM yyyy') : 'N/A';
      case 'created_by':
        return usersCache[value] || value; // Display name if available, else email
      default:
        return value || <span className="text-slate-400">Not Set</span>;
    }
  };

  const ALL_COLUMNS = [
    // ... A slimmed down version for labels, actual definition is in TemplatesPage
    { key: 'template_type', label: 'Type' },
    { key: 'template_code', label: 'Code' },
    { key: 'title_english', label: 'Title (EN)' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'current_version', label: 'Version' },
    { key: 'updated_date', label: 'Updated' },
    // Add other keys needed for label lookup if necessary
  ];

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="columns" direction="horizontal">
              {(provided) => (
                <TableHeader ref={provided.innerRef} {...provided.droppableProps}>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    {visibleColumns.map((key, index) => {
                      const column = ALL_COLUMNS.find(c => c.key === key);
                      if (!column) return null;
                      return (
                        <Draggable key={key} draggableId={key} index={index}>
                          {(provided) => (
                            <TableHead
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="whitespace-nowrap"
                            >
                              <div className="flex items-center gap-2">
                                <span>{column.label}</span>
                                <Button variant="ghost" size="icon" onClick={() => handleSort(key)} className="w-6 h-6">
                                  <ArrowUpDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableHead>
                          )}
                        </Draggable>
                      );
                    })}
                    <TableHead className="text-right">Actions</TableHead>
                    {provided.placeholder}
                  </TableRow>
                </TableHeader>
              )}
            </Droppable>
          </DragDropContext>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} className="h-24 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                </TableCell>
              </TableRow>
            ) : templates.length > 0 ? (
              templates.map((template) => (
                <TableRow key={template.id} className="hover:bg-slate-50/50">
                  {visibleColumns.map(key => (
                    <TableCell key={key} className="py-2.5">
                      {renderCellContent(template, key)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right py-2.5">
                    <div className="flex justify-end items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleView(template)} title="View Details">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleHistory(template)} title="View History">
                        <History className="w-4 h-4" />
                      </Button>
                      {accessLevel === 'full_access' && (
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(template)} title="Edit Template">
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} className="h-24 text-center">
                  No templates found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {viewingTemplate && (
        <ViewDetailsDialog 
          open={!!viewingTemplate} 
          onClose={() => setViewingTemplate(null)} 
          template={viewingTemplate}
          onEdit={accessLevel === 'full_access' ? handleEdit : undefined}
          usersCache={usersCache}
        />
      )}
      
      {historyTemplate && (
        <ViewHistoryDialog 
          open={!!historyTemplate} 
          onClose={() => setHistoryTemplate(null)} 
          template={historyTemplate}
          usersCache={usersCache}
        />
      )}

      {editingTemplate && (
        <EditTemplateDialog 
          open={!!editingTemplate} 
          onClose={() => setEditingTemplate(null)} 
          template={editingTemplate} 
          onTemplateUpdated={() => {
            setEditingTemplate(null);
            onTemplateUpdated();
          }}
        />
      )}
    </>
  );
}