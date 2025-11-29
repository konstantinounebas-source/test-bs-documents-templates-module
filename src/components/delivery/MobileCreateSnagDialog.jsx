import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Camera, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MobileCreateSnagDialog({ open, onClose, busStop, onSaved }) {
  const [formData, setFormData] = useState({
    snag_type: '',
    snag_category: 'internal',
    element_category: '',
    work_type: '',
    work_description: '',
    comments: ''
  });
  const [snagTypeOptions, setSnagTypeOptions] = useState([]);
  const [elementCategoryOptions, setElementCategoryOptions] = useState([]);
  const [workTypeOptions, setWorkTypeOptions] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      loadOptions();
      setFormData({
        snag_type: '',
        snag_category: 'internal',
        element_category: '',
        work_type: '',
        work_description: '',
        comments: ''
      });
      setPhotos([]);
      setError('');
    }
  }, [open]);

  const loadOptions = async () => {
    try {
      const [snagTypes, elementCategories, workTypes] = await Promise.all([
        base44.entities.SnagTypeOption.list(),
        base44.entities.ElementCategoryOption.list(),
        base44.entities.WorkTypeOption.list()
      ]);
      setSnagTypeOptions(snagTypes.filter(s => s.is_active));
      setElementCategoryOptions(elementCategories.filter(s => s.is_active));
      setWorkTypeOptions(workTypes.filter(s => s.is_active));
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.snag_type || !formData.element_category || !formData.work_type) {
      setError('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await base44.auth.me();
      const currentDateTime = new Date().toISOString();

      const photoData = [];
      for (const photo of photos) {
        try {
          const uploadResult = await base44.integrations.Core.UploadFile({ file: photo });
          photoData.push({
            url: uploadResult.file_url,
            filename: photo.name,
            uploaded_by: user.full_name || user.email,
            uploaded_date: currentDateTime
          });
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError);
        }
      }

      const dataToSubmit = {
        bus_stop_id: busStop.id,
        ...formData,
        photo_urls: photoData,
        photo_taken: photoData.length > 0,
        photo_taken_date: photoData.length > 0 ? currentDateTime.split('T')[0] : undefined
      };

      const newSnag = await base44.entities.SnaggingList.create(dataToSubmit);
      
      await base44.entities.SnagLog.create({
        snag_id: newSnag.id,
        bus_stop_id: busStop.id,
        action_type: 'created',
        user_email: user.email,
        comment: 'Εκκρεμότητα δημιουργήθηκε από κινητό'
      });

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving snag:', err);
      setError('Σφάλμα κατά την αποθήκευση. Παρακαλώ δοκιμάστε ξανά.');
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Νέα Εκκρεμότητα</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Τύπος Εκκρεμότητας *</Label>
              <Select
                value={formData.snag_type}
                onValueChange={(value) => setFormData({ ...formData, snag_type: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Επιλέξτε..." />
                </SelectTrigger>
                <SelectContent>
                  {snagTypeOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.name}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Κατηγορία *</Label>
              <Select
                value={formData.snag_category}
                onValueChange={(value) => setFormData({ ...formData, snag_category: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Εσωτερικό</SelectItem>
                  <SelectItem value="external">Εξωτερικό</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Κατηγορία Στοιχείου *</Label>
              <Select
                value={formData.element_category}
                onValueChange={(value) => setFormData({ ...formData, element_category: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Επιλέξτε..." />
                </SelectTrigger>
                <SelectContent>
                  {elementCategoryOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.name}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Είδος Εργασίας *</Label>
              <Select
                value={formData.work_type}
                onValueChange={(value) => setFormData({ ...formData, work_type: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Επιλέξτε..." />
                </SelectTrigger>
                <SelectContent>
                  {workTypeOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.name}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Περιγραφή Εργασίας</Label>
              <Textarea
                value={formData.work_description}
                onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
                rows={3}
                className="resize-none"
                placeholder="Αναλυτική περιγραφή..."
              />
            </div>

            <div className="space-y-2">
              <Label>Φωτογραφίες</Label>
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
                {photos.length > 0 ? photos.length + ' Φωτογραφίες' : 'Προσθήκη Φωτογραφιών'}
              </Button>
            </div>

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

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12">
              Ακύρωση
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                'Δημιουργία'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}