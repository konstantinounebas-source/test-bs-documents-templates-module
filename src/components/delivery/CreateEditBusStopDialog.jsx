import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CreateEditBusStopDialog({ open, onClose, busStop, onSaved }) {
  const [formData, setFormData] = useState({
    bus_stop_id: '',
    city: '',
    shelter_type: '',
    field_1: '',
    field_2: '',
    latitude: '',
    longitude: '',
    comments: '',
    is_active: true
  });
  const [cityOptions, setCityOptions] = useState([]);
  const [shelterTypeOptions, setShelterTypeOptions] = useState([]);
  const [field1Options, setField1Options] = useState([]);
  const [field2Options, setField2Options] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      loadOptions();
      if (busStop) {
        setFormData({
          bus_stop_id: busStop.bus_stop_id || '',
          city: busStop.city || '',
          shelter_type: busStop.shelter_type || '',
          field_1: busStop.field_1 || '',
          field_2: busStop.field_2 || '',
          latitude: busStop.latitude || '',
          longitude: busStop.longitude || '',
          comments: busStop.comments || '',
          is_active: busStop.is_active !== undefined ? busStop.is_active : true
        });
      } else {
        setFormData({
          bus_stop_id: '',
          city: '',
          shelter_type: '',
          field_1: '',
          field_2: '',
          latitude: '',
          longitude: '',
          comments: '',
          is_active: true
        });
      }
      setError('');
    }
  }, [open, busStop]);

  const loadOptions = async () => {
    try {
      const [cities, shelterTypes, field1Opts, field2Opts] = await Promise.all([
        base44.entities.CityMunicipalityOption.list(),
        base44.entities.ShelterTypeDeliveryOption.list(),
        base44.entities.BusStopField1Option.list(),
        base44.entities.BusStopField2Option.list()
      ]);
      setCityOptions(cities.filter(opt => opt.is_active));
      setShelterTypeOptions(shelterTypes.filter(opt => opt.is_active));
      setField1Options(field1Opts.filter(opt => opt.is_active));
      setField2Options(field2Opts.filter(opt => opt.is_active));
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.bus_stop_id || !formData.city || !formData.shelter_type) {
      setError('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!busStop) {
        const existingStops = await base44.entities.BusStop.filter({
          bus_stop_id: formData.bus_stop_id
        });
        
        if (existingStops.length > 0) {
          setError('Η στάση με κωδικό "' + formData.bus_stop_id + '" υπάρχει ήδη. Παρακαλώ χρησιμοποιήστε διαφορετικό κωδικό.');
          setIsSubmitting(false);
          return;
        }
      }

      const dataToSubmit = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined
      };

      if (busStop) {
        await base44.entities.BusStop.update(busStop.id, dataToSubmit);
      } else {
        const newBusStop = await base44.entities.BusStop.create(dataToSubmit);
        await base44.entities.StateOfDelivery.create({
          bus_stop_id: newBusStop.id
        });
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving bus stop:', err);
      setError('Σφάλμα κατά την αποθήκευση. Παρακαλώ δοκιμάστε ξανά.');
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {busStop ? 'Επεξεργασία Στάσης' : 'Νέα Στάση'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Βασικές Πληροφορίες</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bus_stop_id">Κωδικός Στάσης *</Label>
                <Input
                  id="bus_stop_id"
                  value={formData.bus_stop_id}
                  onChange={(e) => setFormData({ ...formData, bus_stop_id: e.target.value })}
                  placeholder="π.χ. BS-001"
                  required
                  disabled={!!busStop}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Πόλη/Δήμος *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => setFormData({ ...formData, city: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε πόλη/δήμο..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cityOptions.map(opt => (
                      <SelectItem key={opt.id} value={opt.name}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shelter_type">Τύπος Στεγάστρου *</Label>
                <Select
                  value={formData.shelter_type}
                  onValueChange={(value) => setFormData({ ...formData, shelter_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε τύπο στεγάστρου..." />
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

              <div className="space-y-2">
                <Label htmlFor="field_1">Πρόσθετο Πεδίο 1</Label>
                <Select
                  value={formData.field_1}
                  onValueChange={(value) => setFormData({ ...formData, field_1: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Καμία επιλογή</SelectItem>
                    {field1Options.map(opt => (
                      <SelectItem key={opt.id} value={opt.name}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="field_2">Πρόσθετο Πεδίο 2</Label>
                <Select
                  value={formData.field_2}
                  onValueChange={(value) => setFormData({ ...formData, field_2: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Καμία επιλογή</SelectItem>
                    {field2Options.map(opt => (
                      <SelectItem key={opt.id} value={opt.name}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Γεωγραφική Θέση
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Γεωγραφικό Πλάτος</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="π.χ. 35.1264"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Γεωγραφικό Μήκος</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="π.χ. 33.4299"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Σχόλια</Label>
            <Textarea
              id="comments"
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              rows={3}
              placeholder="Γενικά σχόλια για τη στάση..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Ενεργή Στάση</Label>
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
              ) : busStop ? (
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