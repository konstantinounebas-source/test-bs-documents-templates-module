import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MobileEditBusStopDialog({ open, onClose, busStop, onSaved }) {
  const [formData, setFormData] = useState({
    shelter_type: '',
    latitude: '',
    longitude: ''
  });
  const [shelterTypeOptions, setShelterTypeOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      loadOptions();
      if (busStop) {
        setFormData({
          shelter_type: busStop.shelter_type || '',
          latitude: busStop.latitude || '',
          longitude: busStop.longitude || ''
        });
      }
      setError('');
    }
  }, [open, busStop]);

  const loadOptions = async () => {
    try {
      const shelterTypes = await base44.entities.ShelterTypeDeliveryOption.list();
      setShelterTypeOptions(shelterTypes.filter(opt => opt.is_active));
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.shelter_type) {
      setError('Ο τύπος στεγάστρου είναι υποχρεωτικός');
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToSubmit = {
        shelter_type: formData.shelter_type,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined
      };

      await base44.entities.BusStop.update(busStop.id, dataToSubmit);

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error updating bus stop:', err);
      setError('Σφάλμα κατά την ενημέρωση. Παρακαλώ δοκιμάστε ξανά.');
    }

    setIsSubmitting(false);
  };

  if (!busStop) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Επεξεργασία Στάσης</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 rounded-lg p-4 space-y-1">
            <p className="font-semibold text-blue-900">{busStop.bus_stop_id}</p>
            <p className="text-sm text-blue-700">{busStop.city}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shelter_type">Τύπος Στεγάστρου *</Label>
            <Select
              value={formData.shelter_type}
              onValueChange={(value) => setFormData({ ...formData, shelter_type: value })}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Επιλέξτε τύπο..." />
              </SelectTrigger>
              <SelectContent>
                {shelterTypeOptions.map(opt => (
                  <SelectItem key={opt.id} value={opt.name}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4" />
              <Label>Συντεταγμένες GPS</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="latitude">Γεωγραφικό Πλάτος (Latitude)</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="π.χ. 35.1264"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Γεωγραφικό Μήκος (Longitude)</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="π.χ. 33.4299"
                className="h-12"
              />
            </div>
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
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Αποθήκευση
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}