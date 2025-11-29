import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function PhotoViewerDialog({ open, onClose, photo, onDelete }) {
  if (!photo) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = photo.filename || 'photo.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{photo.filename}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative bg-slate-100 rounded-lg overflow-hidden">
            <img
              src={photo.url}
              alt={photo.filename}
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          </div>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{photo.uploaded_by}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(photo.uploaded_date), 'dd/MM/yyyy HH:mm')}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            onClick={onDelete}
          >
            <X className="w-4 h-4 mr-2" />
            Διαγραφή
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Λήψη
            </Button>
            <Button onClick={onClose}>
              Κλείσιμο
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}