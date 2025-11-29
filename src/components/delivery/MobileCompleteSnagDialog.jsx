import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Camera, X, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import PhotoViewerDialog from './PhotoViewerDialog';

export default function MobileCompleteSnagDialog({ open, onClose, snag, busStop, onSaved }) {
  const [formData, setFormData] = useState({
    technician_completed: false,
    ready_for_submission: false,
    comments: ''
  });
  const [photos, setPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (open && snag) {
      setFormData({
        technician_completed: snag.technician_completed || false,
        ready_for_submission: snag.ready_for_submission || false,
        comments: snag.comments || ''
      });
      setExistingPhotos(snag.photo_urls || []);
      setPhotos([]);
      setError('');
    }
  }, [open, snag]);

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleViewPhoto = (photo) => {
    setSelectedPhoto(photo);
    setShowPhotoViewer(true);
  };

  const handleDeletePhotoClick = (photo, index) => {
    setPhotoToDelete({ photo, index, isExisting: true });
    setShowDeleteConfirm(true);
    setShowPhotoViewer(false);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;

    try {
      const user = await base44.auth.me();
      
      setExistingPhotos(prev => prev.filter((_, i) => i !== photoToDelete.index));

      await base44.entities.SnagLog.create({
        snag_id: snag.id,
        bus_stop_id: snag.bus_stop_id,
        action_type: 'photo_deleted',
        user_email: user.email,
        comment: `Διαγράφηκε φωτογραφία: ${photoToDelete.photo.filename}`
      });

      setShowDeleteConfirm(false);
      setPhotoToDelete(null);
    } catch (error) {
      console.error('Error logging photo deletion:', error);
      setError('Σφάλμα κατά τη διαγραφή φωτογραφίας');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await base44.auth.me();
      const currentDateTime = new Date().toISOString();
      const currentDate = currentDateTime.split('T')[0];

      const newPhotoData = [];
      for (const photo of photos) {
        try {
          const uploadResult = await base44.integrations.Core.UploadFile({ file: photo });
          newPhotoData.push({
            url: uploadResult.file_url,
            filename: photo.name,
            uploaded_by: user.full_name || user.email,
            uploaded_date: currentDateTime
          });
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError);
        }
      }

      const allPhotos = [...existingPhotos, ...newPhotoData];

      const dataToSubmit = {
        ...formData,
        photo_urls: allPhotos,
        photo_taken: allPhotos.length > 0,
        photo_taken_date: allPhotos.length > 0 && !snag.photo_taken ? currentDate : snag.photo_taken_date,
        technician_completed_date: formData.technician_completed && !snag.technician_completed ? currentDate : snag.technician_completed_date,
        ready_for_submission_date: formData.ready_for_submission && !snag.ready_for_submission ? currentDate : snag.ready_for_submission_date,
        inspected_by: formData.technician_completed && !snag.inspected_by ? user.full_name || user.email : snag.inspected_by,
        inspected_by_date: formData.technician_completed && !snag.inspected_by_date ? currentDate : snag.inspected_by_date
      };

      await base44.entities.SnaggingList.update(snag.id, dataToSubmit);
      
      await base44.entities.SnagLog.create({
        snag_id: snag.id,
        bus_stop_id: busStop.id,
        action_type: 'updated',
        user_email: user.email,
        comment: 'Εκκρεμότητα ενημερώθηκε από κινητό'
      });

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error updating snag:', err);
      setError('Σφάλμα κατά την ενημέρωση. Παρακαλώ δοκιμάστε ξανά.');
    }

    setIsSubmitting(false);
  };

  if (!snag) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ολοκλήρωση Εκκρεμότητας</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{snag.snag_type}</p>
                <Badge className={
                  snag.snag_category === 'internal' ? 
                    'bg-blue-100 text-blue-800' : 
                    'bg-purple-100 text-purple-800'
                }>
                  {snag.snag_category === 'internal' ? 'Εσωτερικό' : 'Εξωτερικό'}
                </Badge>
              </div>
              <p className="text-sm text-slate-600">{snag.element_category} • {snag.work_type}</p>
              {snag.work_description && (
                <p className="text-sm text-slate-600 pt-2 border-t">{snag.work_description}</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="technician_completed" className="text-base">Ολοκληρώθηκε από Τεχνικό</Label>
                  <p className="text-xs text-slate-500">Η εργασία ολοκληρώθηκε</p>
                </div>
                <Switch
                  id="technician_completed"
                  checked={formData.technician_completed}
                  onCheckedChange={(checked) => setFormData({ ...formData, technician_completed: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="ready_for_submission" className="text-base">Έτοιμη για Υποβολή</Label>
                  <p className="text-xs text-slate-500">Έτοιμη για αναφορά</p>
                </div>
                <Switch
                  id="ready_for_submission"
                  checked={formData.ready_for_submission}
                  onCheckedChange={(checked) => setFormData({ ...formData, ready_for_submission: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Φωτογραφίες</Label>
              
              {existingPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {existingPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <div 
                        className="relative cursor-pointer group"
                        onClick={() => handleViewPhoto(photo)}
                      >
                        <img
                          src={photo.url}
                          alt={photo.filename}
                          className="w-full h-20 object-cover rounded-lg group-hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg">
                          <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={photoInputRef}
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => photoInputRef.current?.click()}
                className="w-full h-12"
              >
                <Camera className="w-5 h-5 mr-2" />
                {photos.length > 0 ? '+ ' + photos.length + ' Νέες' : 'Προσθήκη Φωτογραφιών'}
              </Button>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={photo.name}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Σχόλια</Label>
              <Textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={3}
                className="resize-none"
                placeholder="Προσθήκη σχολίων..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12">
                Ακύρωση
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 bg-green-600 hover:bg-green-700">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Αποθήκευση...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Ενημέρωση
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PhotoViewerDialog
        open={showPhotoViewer}
        onClose={() => setShowPhotoViewer(false)}
        photo={selectedPhoto}
        onDelete={() => handleDeletePhotoClick(selectedPhoto, existingPhotos.findIndex(p => p.url === selectedPhoto?.url))}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Επιβεβαίωση Διαγραφής</AlertDialogTitle>
            <AlertDialogDescription>
              Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή τη φωτογραφία;
              <br />
              <span className="font-semibold">{photoToDelete?.photo?.filename}</span>
              <br />
              <br />
              Αυτή η ενέργεια θα καταγραφεί στο ιστορικό.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePhoto} className="bg-red-600 hover:bg-red-700">
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}