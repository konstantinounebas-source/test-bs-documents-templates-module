import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ImagePlus, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CreateEditSnagDialog({ open, onClose, snag, onSaved }) {
  const [formData, setFormData] = useState({
    bus_stop_id: '',
    snag_type: '',
    snag_category: 'internal',
    element_category: '',
    work_type: '',
    work_description: '',
    comments: ''
  });
  const [busStops, setBusStops] = useState([]);
  const [snagTypeOptions, setSnagTypeOptions] = useState([]);
  const [elementCategoryOptions, setElementCategoryOptions] = useState([]);
  const [workTypeOptions, setWorkTypeOptions] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      loadOptions();
      if (snag) {
        setFormData({
          bus_stop_id: snag.bus_stop_id || '',
          snag_type: snag.snag_type || '',
          snag_category: snag.snag_category || 'internal',
          element_category: snag.element_category || '',
          work_type: snag.work_type || '',
          work_description: snag.work_description || '',
          comments: snag.comments || ''
        });
        setExistingPhotos(snag.photo_urls || []);
      } else {
        setFormData({
          bus_stop_id: '',
          snag_type: '',
          snag_category: 'internal',
          element_category: '',
          work_type: '',
          work_description: '',
          comments: ''
        });
        setExistingPhotos([]);
      }
      setPhotos([]);
      setError('');
    }
  }, [open, snag]);

  const loadOptions = async () => {
    try {
      const [stops, snagTypes, elementCategories, workTypes] = await Promise.all([
        base44.entities.BusStop.list(),
        base44.entities.SnagTypeOption.list(),
        base44.entities.ElementCategoryOption.list(),
        base44.entities.WorkTypeOption.list()
      ]);
      setBusStops(stops.filter(s => s.is_active));
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

  const removeExistingPhoto = (index) => {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.bus_stop_id || !formData.snag_type || !formData.element_category || !formData.work_type) {
      setError('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await base44.auth.me();
      const currentDateTime = new Date().toISOString();

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
        photo_urls: allPhotos
      };

      if (snag) {
        await base44.entities.SnaggingList.update(snag.id, dataToSubmit);
        
        await base44.entities.SnagLog.create({
          snag_id: snag.id,
          bus_stop_id: formData.bus_stop_id,
          action_type: 'updated',
          user_email: user.email,
          comment: 'Εκκρεμότητα ενημερώθηκε'
        });
      } else {
        const newSnag = await base44.entities.SnaggingList.create(dataToSubmit);
        
        await base44.entities.SnagLog.create({
          snag_id: newSnag.id,
          bus_stop_id: formData.bus_stop_id,
          action_type: 'created',
          user_email: user.email,
          comment: 'Νέα εκκρεμότητα δημιουργήθηκε'
        });
      }

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {snag ? 'Επεξεργασία Εκκρεμότητας' : 'Νέα Εκκρεμότητα'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Στάση Λεωφορείου *</Label>
            <Select
              value={formData.bus_stop_id}
              onValueChange={(value) => setFormData({ ...formData, bus_stop_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε στάση..." />
              </SelectTrigger>
              <SelectContent>
                {busStops.map(stop => (
                  <SelectItem key={stop.id} value={stop.id}>
                    {stop.bus_stop_id} - {stop.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="snag_type">Τύπος Εκκρεμότητας *</Label>
              <Select
                value={formData.snag_type}
                onValueChange={(value) => setFormData({ ...formData, snag_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε τύπο..." />
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
              <Label htmlFor="snag_category">Κατηγορία *</Label>
              <Select
                value={formData.snag_category}
                onValueChange={(value) => setFormData({ ...formData, snag_category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Εσωτερικό</SelectItem>
                  <SelectItem value="external">Εξωτερικό</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="element_category">Κατηγορία Στοιχείου *</Label>
              <Select
                value={formData.element_category}
                onValueChange={(value) => setFormData({ ...formData, element_category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε κατηγορία..." />
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
              <Label htmlFor="work_type">Είδος Εργασίας *</Label>
              <Select
                value={formData.work_type}
                onValueChange={(value) => setFormData({ ...formData, work_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε είδος..." />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="work_description">Περιγραφή Εργασίας</Label>
            <Textarea
              id="work_description"
              value={formData.work_description}
              onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
              rows={3}
              placeholder="Αναλυτική περιγραφή της απαιτούμενης εργασίας..."
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Φωτογραφίες</h3>
            
            {existingPhotos.length > 0 && (
              <div className="space-y-2">
                <Label>Υπάρχουσες Φωτογραφίες</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {existingPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo.url}
                        alt={photo.filename}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removeExistingPhoto(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <input
                ref={photoInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => photoInputRef.current?.click()}
                className="w-full"
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                Προσθήκη Φωτογραφιών
              </Button>
            </div>

            {photos.length > 0 && (
              <div className="space-y-2">
                <Label>Νέες Φωτογραφίες</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={photo.name}
                        className="w-full h-24 object-cover rounded-lg"
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
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Σχόλια</Label>
            <Textarea
              id="comments"
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              rows={2}
              placeholder="Επιπλέον σχόλια..."
            />
          </div>

          <DialogFooter className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Ακύρωση
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Αποθήκευση...
                </>
              ) : snag ? (
                'Ενημέρωση'
              ) : (
                'Δημιουργία'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}