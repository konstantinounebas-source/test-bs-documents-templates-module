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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Department Document Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {departmentStatus.map((dept, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  {dept.hasAttachment ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{dept.batch.department}</p>
                    <p className="text-xs text-slate-500">
                      {dept.hasAttachment ? '✓ Document uploaded' : '⏳ Pending upload'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}