import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Upload, Download, Trash2, Loader2, FileText, Image as ImageIcon, Eye, X, RotateCw, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const getFileType = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext) ? 'image' : 'pdf';
};

export default function AttachmentsPanel({ batchHeaderId, department }) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const queryClient = useQueryClient();

  const resetViewer = () => { setPreviewFile(null); setRotation(0); setZoom(1); };

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['BatchAttachments', batchHeaderId],
    queryFn: () => base44.entities.BatchAttachment.filter({ batch_header_id: batchHeaderId }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      // Ensure PDFs are uploaded as-is without conversion
      const uploadFile = file.type === 'application/pdf'
        ? new File([file], file.name, { type: 'application/pdf' })
        : file;
      const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadFile });
      
      return base44.entities.BatchAttachment.create({
        batch_header_id: batchHeaderId,
        department: department,
        file_url: file_url,
        file_name: file.name,
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
            accept="image/*,application/pdf,.pdf"
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
          attachments.map(att => {
            const fileType = getFileType(att.file_name);
            return (
              <div
                key={att.id}
                className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors"
              >
                {fileType === 'image' ? (
                  <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                <button
                  onClick={() => { setPreviewFile(att); setRotation(0); setZoom(1); }}
                  className="text-xs text-blue-600 hover:underline truncate flex-1 text-left"
                >
                  {att.file_name}
                </button>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setPreviewFile(att); setRotation(0); setZoom(1); }}
                    className="h-6 w-6 text-slate-500 hover:text-slate-700"
                    title="Preview"
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      const res = await fetch(att.file_url);
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = att.file_name;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="h-6 w-6 text-slate-500 hover:text-slate-700"
                    title="Download"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(att.id)}
                    disabled={deleteMutation.isPending}
                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
              </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => { if (!open) resetViewer(); }}>
        <DialogContent className="max-w-4xl w-[90vw]">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <DialogTitle className="text-sm truncate max-w-xs">{previewFile?.file_name}</DialogTitle>
            <div className="flex gap-1 items-center">
              {previewFile && getFileType(previewFile.file_name) === 'image' && (
                <>
                  <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="text-slate-500 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100" title="Zoom Out">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="text-slate-500 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100" title="Zoom In">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button onClick={() => setRotation(r => r - 90)} className="text-slate-500 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100" title="Rotate Left">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button onClick={() => setRotation(r => r + 90)} className="text-slate-500 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100" title="Rotate Right">
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                </>
              )}
              <button
                onClick={async () => {
                  const res = await fetch(previewFile.file_url);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = previewFile.file_name; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-blue-600 hover:text-blue-700 p-1.5 rounded hover:bg-slate-100" title="Download">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={resetViewer} className="text-slate-400 hover:text-slate-600 p-1.5 rounded hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </DialogHeader>

          {previewFile && getFileType(previewFile.file_name) === 'image' ? (
            <div className="flex items-center justify-center bg-slate-50 rounded-lg overflow-auto" style={{ maxHeight: '70vh' }}>
              <img
                src={previewFile.file_url}
                alt={previewFile.file_name}
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transition: 'transform 0.3s ease',
                  transformOrigin: 'center center',
                  maxWidth: zoom > 1 ? 'none' : '100%',
                }}
              />
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg overflow-hidden" style={{ height: '75vh' }}>
              <iframe
                src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(previewFile?.file_url)}`}
                className="w-full h-full border-0"
                title={previewFile?.file_name}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}