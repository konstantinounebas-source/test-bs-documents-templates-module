import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin, Calendar, User, FileText, Image as ImageIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function ViewSnagDialog({ open, onClose, snag, busStops }) {
  const [snagLogs, setSnagLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (open && snag) {
      loadSnagLogs();
      setActiveTab('info');
    }
  }, [open, snag]);

  const loadSnagLogs = async () => {
    if (!snag) return;
    
    setIsLoadingLogs(true);
    try {
      const logs = await base44.entities.SnagLog.filter({ snag_id: snag.id });
      setSnagLogs(logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Error loading snag logs:', error);
    }
    setIsLoadingLogs(false);
  };

  const getBusStopInfo = (busStopId) => {
    return busStops?.find(bs => bs.id === busStopId);
  };

  const translateActionType = (actionType) => {
    const translations = {
      'created': 'Δημιουργήθηκε',
      'updated': 'Ενημερώθηκε',
      'photo_taken': 'Λήψη Φωτογραφίας',
      'photo_taken_true': 'Λήφθηκε Φωτογραφία',
      'technician_completed': 'Ολοκληρώθηκε από Τεχνικό',
      'technician_completed_true': 'Ολοκληρώθηκε από Τεχνικό',
      'inspected_by': 'Επιθεωρήθηκε',
      'ready_for_submission': 'Έτοιμο για Υποβολή',
      'ready_for_submission_true': 'Έτοιμο για Υποβολή',
      'reopened': 'Επανενεργοποιήθηκε',
      'reopened_true': 'Επανενεργοποιήθηκε',
      'closed': 'Έκλεισε',
      'closed_true': 'Έκλεισε'
    };
    return translations[actionType] || actionType;
  };

  const getLogDescription = (log) => {
    const actionGreek = translateActionType(log.action_type);
    
    if (log.action_type === 'created') {
      return `Δημιουργήθηκε εκκρεμότητα: ${snag.snag_type} - ${snag.element_category}`;
    }
    
    if (log.action_type === 'updated') {
      return `Ενημερώθηκε εκκρεμότητα: ${snag.snag_type} - ${snag.element_category}`;
    }
    
    if (log.action_type.includes('_true')) {
      const baseAction = log.action_type.replace('_true', '');
      return `${translateActionType(baseAction)}: Ολοκληρώθηκε`;
    }
    
    return actionGreek;
  };

  if (!snag) return null;

  const busStop = getBusStopInfo(snag.bus_stop_id);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Εκκρεμότητα: {snag.snag_type}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Πληροφορίες</TabsTrigger>
              <TabsTrigger value="history">Ιστορικό ({snagLogs.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Βασικές Πληροφορίες</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {busStop && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="font-semibold text-blue-900">{busStop.bus_stop_id}</p>
                        <p className="text-sm text-blue-700">{busStop.city}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Τύπος Εκκρεμότητας</p>
                      <p className="font-medium">{snag.snag_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Κατηγορία</p>
                      <Badge className={
                        snag.snag_category === 'internal' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }>
                        {snag.snag_category === 'internal' ? 'Εσωτερικό' : 'Εξωτερικό'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Κατηγορία Στοιχείου</p>
                      <p className="font-medium">{snag.element_category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Είδος Εργασίας</p>
                      <p className="font-medium">{snag.work_type}</p>
                    </div>
                  </div>

                  {snag.work_description && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Περιγραφή Εργασίας</p>
                      <p className="text-sm">{snag.work_description}</p>
                    </div>
                  )}

                  {snag.comments && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Σχόλια</p>
                      <p className="text-sm">{snag.comments}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-sm text-slate-600 mb-2">Κατάσταση</p>
                    <Badge className={snag.closed ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                      {snag.closed ? 'Κλειστή' : 'Ανοιχτή'}
                    </Badge>
                  </div>

                  {snag.closed_date && (
                    <div>
                      <p className="text-sm text-slate-600">Ημερομηνία Κλεισίματος</p>
                      <p className="text-sm">{format(new Date(snag.closed_date), 'dd/MM/yyyy')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {snag.photo_urls && snag.photo_urls.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Φωτογραφίες ({snag.photo_urls.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {snag.photo_urls.map((photo, index) => (
                        <div 
                          key={index} 
                          className="relative group cursor-pointer"
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <img
                            src={photo.url}
                            alt={photo.filename}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="mt-1">
                            <p className="text-xs text-slate-600 truncate">{photo.filename}</p>
                            <p className="text-xs text-slate-500">{photo.uploaded_by}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
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
                  {isLoadingLogs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : snagLogs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <p>Δεν υπάρχει ιστορικό ακόμα</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {snagLogs.map((log, index) => {
                        const description = getLogDescription(log);
                        return (
                          <div key={index} className="border-l-4 border-orange-400 pl-4 py-2">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-orange-100 text-orange-800">
                                  Εκκρεμότητα
                                </Badge>
                                <p className="font-medium text-sm">
                                  {translateActionType(log.action_type)}
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

                            <p className="text-sm text-slate-700 font-medium">{description}</p>

                            {log.comment && (
                              <p className="text-sm text-slate-600 mt-1 italic">
                                "{log.comment}"
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedPhoto.filename}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedPhoto(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.filename}
                className="w-full h-auto rounded-lg"
              />
              <div className="flex items-center justify-between text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{selectedPhoto.uploaded_by}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(selectedPhoto.uploaded_date), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}