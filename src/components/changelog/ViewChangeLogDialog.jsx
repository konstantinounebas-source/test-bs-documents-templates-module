
import React, { useEffect } from 'react';
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Download, Paperclip } from "lucide-react";
import { logAction } from "@/components/lib/logger";

export default function ViewChangeLogDialog({ open, onClose, item, onEdit, statusColors, typeColors }) {
  useEffect(() => {
    if (open && item) {
      logAction({
        action_type: 'VIEW',
        target_entity: 'PlatformChangeLog',
        target_id: item.id,
        details: { title: item.title, type: item.type }
      });
    }
  }, [open, item]);

  if (!item) return null;

  const handleDownloadFile = (fileUrl) => {
    window.open(fileUrl, '_blank');
  };

  // Default colors if not provided
  const defaultStatusColors = {
    "Εκκρεμεί": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Υλοποιήθηκε": "bg-green-100 text-green-800 border-green-200",
    "Προγραμματισμένο": "bg-blue-100 text-blue-800 border-blue-200",
    "Απορρίφθηκε": "bg-red-100 text-red-800 border-red-200",
    "Μελλοντική Επέκταση": "bg-purple-100 text-purple-800 border-purple-200"
  };

  const defaultTypeColors = {
    "Αλλαγή": "bg-blue-100 text-blue-800",
    "Εισήγηση": "bg-green-100 text-green-800",
    "Σφάλμα": "bg-red-100 text-red-800",
    "Βελτιστοποίηση": "bg-orange-100 text-orange-800",
    "Άλλο": "bg-gray-100 text-gray-800"
  };

  const effectiveStatusColors = statusColors || defaultStatusColors;
  const effectiveTypeColors = typeColors || defaultTypeColors;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{item.title}</DialogTitle>
            {onEdit && (
              <Button onClick={() => {
                onClose();
                onEdit(item);
              }} variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Επεξεργασία
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Type Badges */}
          <div className="flex gap-3 flex-wrap">
            <Badge className={effectiveTypeColors[item.type] || "bg-gray-100 text-gray-800"}>
              {item.type}
            </Badge>
            <Badge className={effectiveStatusColors[item.status] || "bg-gray-100 text-gray-800"}>
              {item.status}
            </Badge>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {item.related_page && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-slate-600 mb-1">Σχετική Σελίδα</h4>
                  <p className="text-slate-900">{item.related_page}</p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-slate-600 mb-1">Δημιουργός</h4>
                <p className="text-slate-900">{item.created_by_full_name || 'Μη διαθέσιμο'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-slate-600 mb-1">Ημερομηνία Δημιουργίας</h4>
                <p className="text-slate-900">
                  {item.created_date ? format(new Date(item.created_date), "dd/MM/yyyy HH:mm") : 'Μη διαθέσιμη'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-slate-600 mb-1">Τελευταία Ενημέρωση</h4>
                <p className="text-slate-900">
                  {item.updated_date ? format(new Date(item.updated_date), "dd/MM/yyyy HH:mm") : 'Μη διαθέσιμη'}
                </p>
                {item.last_updated_by_full_name && (
                  <p className="text-sm text-slate-500 mt-1">από {item.last_updated_by_full_name}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          <Card>
            <CardContent className="p-6">
              <h4 className="text-lg font-medium text-slate-900 mb-3">Περιγραφή</h4>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{item.description}</p>
            </CardContent>
          </Card>

          {/* Implementation Details */}
          {(item.implemented_in_release || item.implemented_in_release_date || item.assigned_to || item.due_date) && (
            <Card>
              <CardContent className="p-6">
                <h4 className="text-lg font-medium text-slate-900 mb-4">Λεπτομέρειες Υλοποίησης</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {item.implemented_in_release && (
                    <div>
                      <h5 className="text-sm font-medium text-slate-600 mb-1">Έκδοση Υλοποίησης</h5>
                      <p className="text-slate-900">{item.implemented_in_release}</p>
                    </div>
                  )}
                  {item.implemented_in_release_date && (
                    <div>
                      <h5 className="text-sm font-medium text-slate-600 mb-1">Ημερομηνία Υλοποίησης</h5>
                      <p className="text-slate-900">
                        {format(new Date(item.implemented_in_release_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                  )}
                  {item.assigned_to && (
                    <div>
                      <h5 className="text-sm font-medium text-slate-600 mb-1">Ανατέθηκε σε</h5>
                      <p className="text-slate-900">{item.assigned_to}</p>
                    </div>
                  )}
                  {item.due_date && (
                    <div>
                      <h5 className="text-sm font-medium text-slate-600 mb-1">Προθεσμία</h5>
                      <p className="text-slate-900">
                        {format(new Date(item.due_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Files */}
          {item.file_urls && item.file_urls.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h4 className="text-lg font-medium text-slate-900 mb-4">Συνημμένα Αρχεία</h4>
                <div className="space-y-2">
                  {item.file_urls.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                      <div className="flex items-center gap-2 flex-1">
                        <Paperclip className="w-4 h-4 text-slate-500" />
                        <div className="flex-1">
                          <span className="text-sm text-slate-700 font-medium">{file.filename || 'Άγνωστο αρχείο'}</span>
                          {file.uploaded_by && file.uploaded_date && (
                            <p className="text-xs text-slate-500 mt-1">
                              Ανέβηκε από {file.uploaded_by} στις {format(new Date(file.uploaded_date), "dd/MM/yyyy HH:mm")}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleDownloadFile(file.url)}
                        variant="ghost" 
                        size="sm"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Λήψη
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {item.notes && (
            <Card>
              <CardContent className="p-6">
                <h4 className="text-lg font-medium text-slate-900 mb-3">Σημειώσεις</h4>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{item.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
