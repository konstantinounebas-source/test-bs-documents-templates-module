import React from 'react';
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Clock, User, FileText } from "lucide-react";

export default function ViewHistoryDialog({ open, onClose, template }) {
  if (!template) return null;

  const allVersions = [
    {
      version: template.current_version || "1.0.0",
      file_url: template.file_url,
      revision_date: template.updated_date,
      revised_by: template.created_by,
      revision_notes: "Current version",
      isCurrent: true
    },
    ...(template.revision_history || [])
  ];

  const handleDownload = (fileUrl) => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-blue-500" />
            Version History
            <span className="text-sm font-normal text-slate-600">
              {template.template_code}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {allVersions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No version history</h3>
              <p className="text-slate-600">This template has no previous versions.</p>
            </div>
          ) : (
            allVersions.map((version, index) => (
              <Card key={index} className={version.isCurrent ? "border-blue-200 bg-blue-50" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-900">
                          Version {version.version}
                        </h3>
                        {version.isCurrent && (
                          <Badge className="bg-blue-100 text-blue-800">Current</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(version.revision_date), "MMM d, yyyy 'at' HH:mm")}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {version.revised_by}
                        </div>
                      </div>
                      
                      {version.revision_notes && (
                        <p className="text-sm text-slate-700 mt-2">
                          {version.revision_notes}
                        </p>
                      )}
                    </div>
                    
                    {version.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(version.file_url)}
                        className="ml-4"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex justify-end pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}