import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export default function BulkEditDeliveryStatusDialog({ open, onClose, busStops, statesOfDelivery, onSaved }) {
  const [editableStates, setEditableStates] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && busStops && statesOfDelivery) {
      // Initialize editable states from existing data
      const statesMap = {};
      busStops.forEach(bs => {
        const state = statesOfDelivery.find(s => s.bus_stop_id === bs.id);
        statesMap[bs.id] = state ? { ...state } : {
          bus_stop_id: bs.id,
          installed: false,
          inspected_by_foreman: false,
          inspected_by_engineer: false,
          ready_for_delivery: false,
          documents_sent_to_CA: false,
          accepted_by_CA: false,
          declined_by_CA: false,
          approved_with_snag_list: false,
          ready_for_final_delivery: false,
          closed: false
        };
      });
      setEditableStates(statesMap);
      setSearchTerm('');
      setError('');
    }
  }, [open, busStops, statesOfDelivery]);

  const handleCheckboxChange = (busStopId, field, value) => {
    setEditableStates(prev => {
      const newStates = { ...prev };
      const currentState = { ...newStates[busStopId] };
      
      // Apply the main change
      currentState[field] = value;
      
      // Apply automations based on the field
      if (field === 'accepted_by_CA' && value) {
        // When accepted_by_CA is checked, auto-close and uncheck mutually exclusive
        currentState.closed = true;
        currentState.closed_date = new Date().toISOString().split('T')[0];
        currentState.declined_by_CA = false;
        currentState.declined_by_CA_date = null;
        currentState.approved_with_snag_list = false;
        currentState.approved_with_snag_list_date = null;
      }
      
      if (field === 'declined_by_CA' && value) {
        // Uncheck mutually exclusive fields
        currentState.accepted_by_CA = false;
        currentState.accepted_by_CA_date = null;
        currentState.approved_with_snag_list = false;
        currentState.approved_with_snag_list_date = null;
      }
      
      if (field === 'approved_with_snag_list' && value) {
        // Uncheck mutually exclusive fields
        currentState.accepted_by_CA = false;
        currentState.accepted_by_CA_date = null;
        currentState.declined_by_CA = false;
        currentState.declined_by_CA_date = null;
      }
      
      newStates[busStopId] = currentState;
      return newStates;
    });
  };

  const handleSaveAll = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const user = await base44.auth.me();
      const updates = [];

      for (const busStopId in editableStates) {
        const state = editableStates[busStopId];
        const existingState = statesOfDelivery.find(s => s.bus_stop_id === busStopId);

        if (existingState) {
          // Update existing state
          updates.push(base44.entities.StateOfDelivery.update(existingState.id, state));
        } else {
          // Create new state
          updates.push(base44.entities.StateOfDelivery.create(state));
        }
      }

      await Promise.all(updates);
      
      toast.success('Οι καταστάσεις παράδοσης ενημερώθηκαν επιτυχώς!');
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving delivery states:', err);
      setError('Σφάλμα κατά την αποθήκευση. Παρακαλώ δοκιμάστε ξανά.');
      toast.error('Σφάλμα κατά την αποθήκευση');
    }

    setIsSubmitting(false);
  };

  const filteredBusStops = busStops.filter(bs =>
    bs.bus_stop_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bs.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Μαζική Επεξεργασία Καταστάσεων Παράδοσης</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-sm text-blue-800">
            <strong>Αυτοματισμοί:</strong> Όταν ενεργοποιείτε "Αποδοχή από Αρχή", η στάση κλείνει αυτόματα. Τα πεδία "Εγκρίθηκε/Απορρίφθηκε/Εγκρίθηκε με snags" είναι αλληλοαποκλειόμενα.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Αναζήτηση στάσης..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSaveAll} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Αποθήκευση...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Αποθήκευση Όλων
              </>
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-auto border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead className="sticky left-0 bg-white z-20 border-r font-semibold min-w-[120px]">Κωδικός</TableHead>
                <TableHead className="sticky left-[120px] bg-white z-20 border-r font-semibold min-w-[150px]">Πόλη</TableHead>
                <TableHead className="text-center min-w-[120px]">Εγκαταστάθηκε</TableHead>
                <TableHead className="text-center min-w-[150px]">Επιθ. Επιστάτη</TableHead>
                <TableHead className="text-center min-w-[150px]">Επιθ. Μηχανικού</TableHead>
                <TableHead className="text-center min-w-[140px]">Έτοιμη για Παράδοση</TableHead>
                <TableHead className="text-center min-w-[160px]">Έντυπα στην Αρχή</TableHead>
                <TableHead className="text-center min-w-[140px]">Αποδοχή από Αρχή</TableHead>
                <TableHead className="text-center min-w-[140px]">Απόρριψη από Αρχή</TableHead>
                <TableHead className="text-center min-w-[160px]">Εγκρίθηκε με Snags</TableHead>
                <TableHead className="text-center min-w-[160px]">Έτοιμη Τελικής</TableHead>
                <TableHead className="text-center min-w-[120px]">Ολοκληρώθηκε</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBusStops.map((busStop) => {
                const state = editableStates[busStop.id] || {};
                
                return (
                  <TableRow key={busStop.id} className="hover:bg-slate-50">
                    <TableCell className="sticky left-0 bg-white z-10 border-r font-medium">
                      {busStop.bus_stop_id}
                    </TableCell>
                    <TableCell className="sticky left-[120px] bg-white z-10 border-r">
                      {busStop.city}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={state.installed || false}
                          onCheckedChange={(checked) => handleCheckboxChange(busStop.id, 'installed', checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={state.inspected_by_foreman || false}
                          onCheckedChange={(checked) => handleCheckboxChange(busStop.id, 'inspected_by_foreman', checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={state.inspected_by_engineer || false}
                          onCheckedChange={(checked) => handleCheckboxChange(busStop.id, 'inspected_by_engineer', checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={state.ready_for_delivery || false}
                          onCheckedChange={(checked) => handleCheckboxChange(busStop.id, 'ready_for_delivery', checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={state.documents_sent_to_CA || false}
                          onCheckedChange={(checked) => handleCheckboxChange(busStop.id, 'documents_sent_to_CA', checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={state.accepted_by_CA || false}
                          onCheckedChange={(checked) => handleCheckboxChange(busStop.id, 'accepted_by_CA', checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={state.declined_by_CA || false}
                          onCheckedChange={(checked) => handleCheckboxChange(busStop.id, 'declined_by_CA', checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={state.approved_with_snag_list || false}
                          onCheckedChange={(checked) => handleCheckboxChange(busStop.id, 'approved_with_snag_list', checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={state.ready_for_final_delivery || false}
                          onCheckedChange={(checked) => handleCheckboxChange(busStop.id, 'ready_for_final_delivery', checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={state.closed || false}
                          onCheckedChange={(checked) => handleCheckboxChange(busStop.id, 'closed', checked)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-slate-600">
            Εμφάνιση {filteredBusStops.length} από {busStops.length} στάσεις
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Ακύρωση
            </Button>
            <Button onClick={handleSaveAll} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Αποθήκευση Όλων ({filteredBusStops.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}