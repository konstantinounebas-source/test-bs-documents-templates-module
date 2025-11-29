
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MapPin, CheckCircle, XCircle, Calendar, AlertCircle, FileText, User, Save } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import StatusToggleDialog from './StatusToggleDialog';

export default function ViewBusStopDialog({ open, onClose, busStop, onUpdated }) {
  const [formData, setFormData] = useState({
    shelter_type: '',
    field_1: '',
    field_2: '',
    latitude: '',
    longitude: '',
    comments: ''
  });
  const [deliveryState, setDeliveryState] = useState(null);
  const [snags, setSnags] = useState([]);
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [snagLogs, setSnagLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState('');
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedStatusField, setSelectedStatusField] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  
  const [shelterTypeOptions, setShelterTypeOptions] = useState([]);
  const [field1Options, setField1Options] = useState([]);
  const [field2Options, setField2Options] = useState([]);

  useEffect(() => {
    if (open) {
      loadOptionsAndData();
      setActiveTab('info');
    }
  }, [open, busStop?.id]);

  const loadOptionsAndData = async () => {
    setIsLoading(true);
    try {
      const [shelterTypes, field1Opts, field2Opts] = await Promise.all([
        base44.entities.ShelterTypeDeliveryOption.list(),
        base44.entities.BusStopField1Option.list(),
        base44.entities.BusStopField2Option.list()
      ]);
      
      setShelterTypeOptions(shelterTypes.filter(opt => opt.is_active));
      setField1Options(field1Opts.filter(opt => opt.is_active));
      setField2Options(field2Opts.filter(opt => opt.is_active));

      if (busStop) {
        setFormData({
          shelter_type: busStop.shelter_type || '',
          field_1: busStop.field_1 || '',
          field_2: busStop.field_2 || '',
          latitude: busStop.latitude != null ? busStop.latitude.toString() : '',
          longitude: busStop.longitude != null ? busStop.longitude.toString() : '',
          comments: busStop.comments || ''
        });
        
        await loadDetails();
      }
      
      setHasChanges(false);
      setError('');
    } catch (error) {
      console.error('Error loading options and data:', error);
    }
    setIsLoading(false);
  };

  const loadDetails = async () => {
    if (!busStop) return;
    
    try {
      const [stateData, snagsData, deliveryLogsData, snagLogsData] = await Promise.all([
        base44.entities.StateOfDelivery.filter({ bus_stop_id: busStop.id }),
        base44.entities.SnaggingList.filter({ bus_stop_id: busStop.id }),
        base44.entities.DeliveryLog.filter({ bus_stop_id: busStop.id }),
        base44.entities.SnagLog.filter({ bus_stop_id: busStop.id })
      ]);
      
      let state = stateData[0] || null;
      
      const openInternalSnags = snagsData.filter(s => !s.closed && s.snag_category === 'internal');
      const openExternalSnags = snagsData.filter(s => !s.closed && s.snag_category === 'external');
      
      if (state) {
        const internalCompleted = openInternalSnags.length === 0;
        const externalCompleted = openExternalSnags.length === 0;
        
        if (state.internal_snag_list_completed !== internalCompleted || 
            state.external_snag_list_completed !== externalCompleted) {
          await base44.entities.StateOfDelivery.update(state.id, {
            internal_snag_list_pending: !internalCompleted,
            internal_snag_list_completed: internalCompleted,
            internal_snag_list_completed_date: internalCompleted ? new Date().toISOString().split('T')[0] : null,
            external_snag_list_pending: !externalCompleted,
            external_snag_list_completed: externalCompleted,
            external_snag_list_completed_date: externalCompleted ? new Date().toISOString().split('T')[0] : null
          });
          
          const updatedState = await base44.entities.StateOfDelivery.filter({ bus_stop_id: busStop.id });
          state = updatedState[0];
        }
      }
      
      setDeliveryState(state);
      setSnags(snagsData);
      setDeliveryLogs(deliveryLogsData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setSnagLogs(snagLogsData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Error loading details:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSubmitBusStopChanges = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const dataToSubmit = {
        shelter_type: formData.shelter_type,
        field_1: formData.field_1 || undefined,
        field_2: formData.field_2 || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        comments: formData.comments
      };

      await base44.entities.BusStop.update(busStop.id, dataToSubmit);

      if (onUpdated) onUpdated();
      setHasChanges(false);
    } catch (err) {
      console.error('Error updating bus stop:', err);
      setError('Σφάλμα κατά την ενημέρωση. Παρακαλώ δοκιμάστε ξανά.');
    }

    setIsSubmitting(false);
  };

  const handleStatusToggle = (fieldName) => {
    setSelectedStatusField(fieldName);
    setShowStatusDialog(true);
  };

  const handleStatusUpdated = () => {
    loadDetails();
    if (onUpdated) onUpdated();
  };

  const openInternalSnags = snags.filter(s => !s.closed && s.snag_category === 'internal');
  const openExternalSnags = snags.filter(s => !s.closed && s.snag_category === 'external');
  const closedSnags = snags.filter(s => s.closed);

  const combinedLogs = [
    ...deliveryLogs.map(log => ({ ...log, type: 'delivery' })),
    ...snagLogs.map(log => ({ ...log, type: 'snag' }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const statusFields = [
    { key: 'installed', label: 'Εγκαταστάθηκε', dateKey: 'installed_date' },
    { key: 'inspected_by_foreman', label: 'Επιθεώρηση Επιστάτη', dateKey: 'inspected_by_foreman_date' },
    { key: 'inspected_by_engineer', label: 'Επιθεώρηση Μηχανικού', dateKey: 'inspected_by_engineer_date' },
    { 
      key: 'internal_snag_list_pending', 
      label: 'Εκκρεμεί Εσωτερικό Snag list για την Παράδοση', 
      dateKey: 'internal_snag_list_completed_date',
      isAutomatic: true,
      autoValue: openInternalSnags.length > 0
    },
    { key: 'ready_for_delivery', label: 'Έτοιμη για παράδοση', dateKey: 'ready_for_delivery_date' },
    { key: 'documents_sent_to_CA', label: 'Στάλθηκαν τα έντυπα στην Αναθέτουσα Αρχή', dateKey: 'documents_sent_to_CA_date' },
    { key: 'accepted_by_CA', label: 'Εγκρίθηκε από Αναθέτουσα Αρχή', dateKey: 'accepted_by_CA_date', mutuallyExclusive: ['declined_by_CA', 'approved_with_snag_list'], autoClosesDelivery: true },
    { key: 'declined_by_CA', label: 'Απορρίφθηκε από Αναθέτουσα Αρχή', dateKey: 'declined_by_CA_date', mutuallyExclusive: ['accepted_by_CA', 'approved_with_snag_list'] },
    { key: 'approved_with_snag_list', label: 'Εγκρίθηκε με snag list', dateKey: 'approved_with_snag_list_date', mutuallyExclusive: ['accepted_by_CA', 'declined_by_CA'] },
    { 
      key: 'external_snag_list_pending', 
      label: 'Snag list εξωτερικό εκκρεμεί', 
      dateKey: 'external_snag_list_completed_date',
      isAutomatic: true,
      autoValue: openExternalSnags.length > 0
    },
    { key: 'ready_for_final_delivery', label: 'Έτοιμη για τελική παράδοση', dateKey: 'ready_for_final_delivery_date' },
    { 
      key: 'closed', 
      label: 'Ολοκληρώθηκε', 
      dateKey: 'closed_date',
      isAutomatic: true,
      autoValue: deliveryState?.closed || false,
      autoDescription: 'Ενεργοποιείται αυτόματα όταν εγκριθεί από Αναθέτουσα Αρχή'
    }
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {busStop?.bus_stop_id} - {busStop?.city}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Πληροφορίες</TabsTrigger>
                <TabsTrigger value="status">Κατάσταση</TabsTrigger>
                <TabsTrigger value="history">Ιστορικό ({combinedLogs.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-6">
                <form onSubmit={handleSubmitBusStopChanges}>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Πληροφορίες Στάσης</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Τύπος Στεγάστρου *</Label>
                          <Select
                            key={busStop?.id}
                            value={formData.shelter_type}
                            onValueChange={(value) => handleInputChange('shelter_type', value)}
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
                          <Label>Πεδίο 1</Label>
                          <Select
                            key={busStop?.id + 'f1'}
                            value={formData.field_1}
                            onValueChange={(value) => handleInputChange('field_1', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Επιλέξτε..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>-</SelectItem>
                              {field1Options.map(opt => (
                                <SelectItem key={opt.id} value={opt.name}>
                                  {opt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Πεδίο 2</Label>
                          <Select
                            key={busStop?.id + 'f2'}
                            value={formData.field_2}
                            onValueChange={(value) => handleInputChange('field_2', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Επιλέξτε..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>-</SelectItem>
                              {field2Options.map(opt => (
                                <SelectItem key={opt.id} value={opt.name}>
                                  {opt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Γεωγραφικό Πλάτος (Latitude)</Label>
                          <Input
                            type="number"
                            step="any"
                            value={formData.latitude}
                            onChange={(e) => handleInputChange('latitude', e.target.value)}
                            placeholder="35.1264"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Γεωγραφικό Μήκος (Longitude)</Label>
                          <Input
                            type="number"
                            step="any"
                            value={formData.longitude}
                            onChange={(e) => handleInputChange('longitude', e.target.value)}
                            placeholder="33.4299"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Σχόλια</Label>
                        <Textarea
                          value={formData.comments}
                          onChange={(e) => handleInputChange('comments', e.target.value)}
                          rows={3}
                          placeholder="Γενικά σχόλια για τη στάση..."
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {hasChanges && (
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Αποθήκευση...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Αποθήκευση Αλλαγών
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </form>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Εκκρεμότητες</span>
                      <div className="flex gap-2">
                        <Badge className="bg-blue-100 text-blue-800">{openInternalSnags.length} Εσωτερικά</Badge>
                        <Badge className="bg-purple-100 text-purple-800">{openExternalSnags.length} Εξωτερικά</Badge>
                        <Badge className="bg-green-100 text-green-800">{closedSnags.length} Κλειστές</Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {snags.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        {snags.slice(0, 5).map(snag => (
                          <div key={snag.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{snag.snag_type}</p>
                                <Badge variant="outline" className={
                                  snag.snag_category === 'internal' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                                }>
                                  {snag.snag_category === 'internal' ? 'Εσωτερικό' : 'Εξωτερικό'}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600">{snag.work_description}</p>
                            </div>
                            <Badge className={snag.closed ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                              {snag.closed ? 'Κλειστή' : 'Ανοιχτή'}
                            </Badge>
                          </div>
                        ))}
                        {snags.length > 5 && (
                          <p className="text-sm text-slate-600 text-center">
                            και {snags.length - 5} ακόμα...
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="status" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Κατάσταση Παράδοσης</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {statusFields.map(field => {
                      const isChecked = field.isAutomatic ? field.autoValue : deliveryState?.[field.key];
                      const date = deliveryState?.[field.dateKey];
                      
                      return (
                        <div
                          key={field.key}
                          className={'flex items-center justify-between p-3 border rounded-lg ' + (field.isAutomatic ? 'bg-slate-50 cursor-default' : 'hover:bg-slate-50 cursor-pointer') + ' transition-colors'}
                          onClick={() => !field.isAutomatic && handleStatusToggle(field)}
                        >
                          <div className="flex items-center gap-3">
                            {field.isAutomatic ? (
                              <AlertCircle className={'w-5 h-5 ' + (isChecked && !field.key.includes('closed') ? 'text-orange-600' : 'text-green-600')} />
                            ) : isChecked ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-slate-300" />
                            )}
                            <div>
                              <p className="font-medium">{field.label}</p>
                              {field.isAutomatic && (
                                <p className="text-xs text-slate-500">{field.autoDescription || 'Αυτόματο πεδίο'}</p>
                              )}
                              {isChecked && date && !field.isAutomatic && (
                                <p className="text-sm text-slate-600 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(date), 'dd/MM/yyyy')}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={
                            field.isAutomatic ? 
                              (isChecked ? (field.key.includes('pending') ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800') : 'bg-green-100 text-green-800') :
                              (isChecked ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600')
                          }>
                            {field.isAutomatic ?
                              (isChecked ? (field.key.includes('pending') ? 'Εκκρεμούν ' + (field.key.includes('internal') ? openInternalSnags.length : openExternalSnags.length) : 'Ολοκληρώθηκε') : 'Ολοκληρώθηκε') :
                              (isChecked ? 'Ολοκληρώθηκε' : 'Εκκρεμεί')
                            }
                          </Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Ιστορικό Αλλαγών
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {combinedLogs.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        <p>Δεν υπάρχει ιστορικό ακόμα</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {combinedLogs.map((log, index) => (
                          <div key={index} className="border-l-4 border-blue-400 pl-4 py-2">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  log.type === 'delivery' ? 
                                    'bg-blue-100 text-blue-800' : 
                                    'bg-orange-100 text-orange-800'
                                }>
                                  {log.type === 'delivery' ? 'Παράδοση' : 'Εκκρεμότητα'}
                                </Badge>
                                <p className="font-medium text-sm">
                                  {log.status_field || log.action_type}
                                </p>
                              </div>
                              <p className="text-xs text-slate-500">
                                {format(new Date(log.created_date), 'dd/MM/yyyy HH:mm')}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                              <User className="w-3 h-3" />
                              <span>{log.user_email}</span>
                            </div>

                            {log.old_value && log.new_value && (
                              <div className="text-sm">
                                <span className="text-red-600">{log.old_value}</span>
                                {' → '}
                                <span className="text-green-600">{log.new_value}</span>
                              </div>
                            )}

                            {log.comment && (
                              <p className="text-sm text-slate-600 mt-1 italic">
                                "{log.comment}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {deliveryState && selectedStatusField && (
        <StatusToggleDialog
          open={showStatusDialog}
          onClose={() => setShowStatusDialog(false)}
          deliveryState={deliveryState}
          statusField={selectedStatusField}
          busStop={busStop}
          onUpdated={handleStatusUpdated}
          openExternalSnags={openExternalSnags}
        />
      )}
    </>
  );
}
