import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, AlertCircle, Download, Eye, X, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function DepartmentAttachmentsKPI({ batchHeaderId, date, department }) {
  const [previewFile, setPreviewFile] = useState(null);
  const [expandedDept, setExpandedDept] = useState(null);

  const { data: batchHeaders = [] } = useQuery({
    queryKey: ['BatchHeader', date],
    queryFn: () => date ? base44.entities.BatchHeader.filter({ date }) : [],
    enabled: !!date,
  });

  const { data: allAttachments = [] } = useQuery({
    queryKey: ['BatchAttachments-All', date],
    queryFn: async () => {
      if (!date || batchHeaders.length === 0) return [];
      const ids = batchHeaders.map(b => b.id);
      const results = await Promise.all(
        ids.map(id => base44.entities.BatchAttachment.filter({ batch_header_id: id }))
      );
      return results.flat();
    },
    enabled: !!date && batchHeaders.length > 0,
  });

  // Group by department and check if they have attachments
  const departmentStatus = React.useMemo(() => {
    const map = {};
    batchHeaders.forEach(batch => {
      if (!map[batch.department]) {
        map[batch.department] = { batch, hasAttachment: false, attachments: [] };
      }
    });
    
    allAttachments.forEach(att => {
      if (map[att.department]) {
        map[att.department].hasAttachment = true;
        map[att.department].attachments.push(att);
      }
    });
    
    return Object.values(map);
  }, [batchHeaders, allAttachments]);

  const completedCount = departmentStatus.filter(d => d.hasAttachment).length;
  const totalCount = departmentStatus.length;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Document Uploads Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-900">{percentComplete}%</div>
          <p className="text-sm text-slate-600">{completedCount} of {totalCount} departments</p>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentComplete}%` }}
          />
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Department Document Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {departmentStatus.map((dept, idx) => (
                <div key={idx} className="space-y-2">
                  <button
                    onClick={() => setExpandedDept(expandedDept === idx ? null : idx)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                  >
                    {dept.hasAttachment ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-slate-900">{dept.batch.department}</p>
                      <p className="text-xs text-slate-500">
                        {dept.hasAttachment ? `✓ ${dept.attachments.length} file(s) uploaded` : '⏳ Pending upload'}
                      </p>
                    </div>
                    {dept.hasAttachment && (
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedDept === idx ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {/* Files list */}
                  {expandedDept === idx && dept.hasAttachment && (
                    <div className="ml-8 space-y-1">
                      {dept.attachments.map(file => (
                        <div key={file.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-xs">
                          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-slate-600 truncate flex-1">{file.file_name}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="text-blue-600 hover:text-blue-700 p-1"
                              title="Preview"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <a
                              href={file.file_url}
                              download={file.file_name}
                              className="text-blue-600 hover:text-blue-700 p-1"
                              title="Download"
                            >
                              <Download className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle>{previewFile?.file_name}</DialogTitle>
              <div className="flex gap-2">
                <a
                  href={previewFile?.file_url}
                  download={previewFile?.file_name}
                  className="text-blue-600 hover:text-blue-700 p-1"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button onClick={() => setPreviewFile(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </DialogHeader>

            {previewFile?.file_type === 'image' ? (
              <div className="flex items-center justify-center max-h-[70vh] overflow-auto bg-slate-50 rounded-lg">
                <img src={previewFile.file_url} alt={previewFile.file_name} className="max-w-full max-h-full" />
              </div>
            ) : (
              <div className="flex items-center justify-center max-h-[70vh] overflow-auto bg-slate-50 rounded-lg">
                <iframe 
                  src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(previewFile?.file_url)}`}
                  className="w-full h-[600px] border-0"
                  title={previewFile?.file_name}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
        </CardContent>
        </Card>
        );
        }