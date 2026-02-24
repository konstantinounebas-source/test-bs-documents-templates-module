import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Upload, Download, Trash2, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function AttachmentsPanel({ batchHeaderId, department }) {
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['BatchAttachments', batchHeaderId],
    queryFn: () => base44.entities.BatchAttachment.filter({ batch_header_id: batchHeaderId }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const fileType = file.type.startsWith('image') ? 'image' : 'pdf';
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      return base44.entities.BatchAttachment.create({
        batch_header_id: batchHeaderId,
        department: department,
        file_url: file_url,
        file_name: file.name,
        file_type: fileType,
        uploaded_by: (await base44.auth.me()).email,
        notes: ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['BatchAttachments', batchHeaderId]);
      toast.success('File uploaded successfully');
    },
    onError: () => toast.error('Failed to upload file')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BatchAttachment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['BatchAttachments', batchHeaderId]);
      toast.success('File deleted');
    }
  });

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.size <= 50 * 1024 * 1024) {
        uploadMutation.mutate(file);
      } else {
        toast.error('File size exceeds 50MB');
      }
    });
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.size <= 50 * 1024 * 1024) {
        uploadMutation.mutate(file);
      } else {
        toast.error('File size exceeds 50MB');
      }
    });
  };

  return (
    <div className="border-l-2 border-slate-200 pl-6 flex flex-col h-full">
      <h3 className="font-semibold text-slate-900 mb-4">Attachments</h3>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-4 flex-1 flex flex-col items-center justify-center ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        }`}
      >
        <Upload className="w-6 h-6 text-slate-400 mb-2" />
        <p className="text-sm font-medium text-slate-600 mb-1">
          Drag & drop files here
        </p>
        <p className="text-xs text-slate-500 mb-3">or click to browse</p>
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileInput}
            className="hidden"
            disabled={uploadMutation.isPending}
          />
          <span className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            {uploadMutation.isPending ? 'Uploading...' : 'Select files'}
          </span>
        </label>
      </div>

      {/* Files List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No attachments yet</p>
        ) : (
          attachments.map(att => (
            <div
              key={att.id}
              className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors"
            >
              {att.file_type === 'image' ? (
                <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
              <a
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline truncate flex-1"
              >
                {att.file_name}
              </a>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = att.file_url;
                    a.download = att.file_name;
                    a.click();
                  }}
                  className="h-6 w-6 text-slate-500 hover:text-slate-700"
                >
                  <Download className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(att.id)}
                  disabled={deleteMutation.isPending}
                  className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}