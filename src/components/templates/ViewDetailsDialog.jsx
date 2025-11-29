
import React, { useEffect } from 'react';
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, BookOpen, Calendar, User, Tag, Edit } from "lucide-react";
import { logAction } from "@/components/lib/logger";

export default function ViewDetailsDialog({ open, onClose, template, onEdit }) {
  useEffect(() => {
    if (open && template) {
      logAction({
        action_type: 'VIEW',
        target_entity: 'FormTemplate',
        target_id: template.id,
        details: { code: template.template_code, title: template.title_english }
      });
    }
  }, [open, template]);

  if (!template) return null;

  const handleDownload = () => {
    if (template.file_url) {
      window.open(template.file_url, '_blank');
    }
  };

  const handleEdit = () => {
    // Close the details dialog and trigger edit
    onClose();
    // We need to pass the edit action to the parent component
    if (onEdit) {
      onEdit(template);
    }
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    draft: "bg-yellow-100 text-yellow-800",
    archived: "bg-gray-100 text-gray-800",
    superseded: "bg-blue-100 text-blue-800"
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {template.template_type === "file_template" ? (
              <FileText className="w-6 h-6 text-blue-500" />
            ) : (
              <BookOpen className="w-6 h-6 text-purple-500" />
            )}
            <div>
              <span>{template.title_english}</span>
              <p className="text-sm font-normal text-slate-600 mt-1">
                Template Code: {template.template_code}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex flex-wrap items-center gap-4">
            <Badge className={statusColors[template.status] || "bg-gray-100 text-gray-800"}>
              {template.status}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Tag className="w-4 h-4" />
              {template.category?.replace(/_/g, ' ')}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4" />
              Version {template.current_version || "1.0.0"}
            </div>
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Title (English)</label>
                  <p className="text-slate-900">{template.title_english}</p>
                </div>
                {template.title_greek && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Title (Greek)</label>
                    <p className="text-slate-900">{template.title_greek}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-slate-600">Activity</label>
                  <p className="text-slate-900">{template.activity || "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Sequence Number</label>
                  <p className="text-slate-900">{template.sequence_number}</p>
                </div>
              </div>
              {template.description && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Description</label>
                  <p className="text-slate-900 mt-1">{template.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SOP Information */}
          {template.sop_reference_title && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SOP Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">SOP Reference Title</label>
                    <p className="text-slate-900">{template.sop_reference_title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">SOP Availability</label>
                    <p className="text-slate-900">{template.sop_availability}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {template.responsibility_completion && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Completion</label>
                    <p className="text-slate-900">{template.responsibility_completion}</p>
                  </div>
                )}
                {template.responsibility_processing && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Processing</label>
                    <p className="text-slate-900">{template.responsibility_processing}</p>
                  </div>
                )}
                {template.responsibility_internal && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Internal</label>
                    <p className="text-slate-900">{template.responsibility_internal}</p>
                  </div>
                )}
                {template.responsibility_external && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">External</label>
                    <p className="text-slate-900">{template.responsibility_external}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {template.completion_frequency && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Completion Frequency</label>
                    <p className="text-slate-900">{template.completion_frequency}</p>
                  </div>
                )}
                {template.control_mechanism && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Control Mechanism</label>
                    <p className="text-slate-900">{template.control_mechanism}</p>
                  </div>
                )}
                {template.effective_date && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Effective Date</label>
                    <p className="text-slate-900">
                      {format(new Date(template.effective_date), "MMM d, yyyy")}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-slate-600">Last Updated</label>
                  <p className="text-slate-900">
                    {format(new Date(template.updated_date), "MMM d, yyyy 'at' HH:mm")}
                  </p>
                </div>
              </div>
              {template.memo && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-slate-600">Memo</label>
                  <p className="text-slate-900 mt-1">{template.memo}</p>
                </div>
              )}
              {template.remarks && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-slate-600">Remarks</label>
                  <p className="text-slate-900 mt-1">{template.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline" onClick={handleEdit} className="bg-slate-50 hover:bg-slate-100">
              <Edit className="w-4 h-4 mr-2" />
              Edit Template
            </Button>
            {template.file_url && (
              <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" />
                Download File
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
