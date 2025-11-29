import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

export default function StatusToggleDialog({ open, onClose, deliveryState, statusField, busStop, onUpdated, openExternalSnags }) {
  const [date, setDate] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && statusField) {
      const currentDate = deliveryState?.[statusField.dateKey];
      setDate(currentDate ? format(new Date(currentDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setComment('');
      setError('');
    }
  }, [open, statusField, deliveryState]);

  const handleSubmit = async () => {
    setError('');

    // Validation: Cannot close delivery if there are open external snags
    if (statusField.autoClosesDelivery && !deliveryState[statusField.key]) {
      if (openExternalSnags && openExternalSnags.length > 0) {
        setError(`Δεν μπορεί να ολοκληρωθεί η στάση. Υπάρχουν ${openExternalSnags.length} ανοιχτά εξωτερικά snagging.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const user = await base44.auth.me();
      const newValue = !deliveryState[statusField.key];
      const oldValue = deliveryState[statusField.key];

      const updateData = {
        [statusField.key]: newValue,
        [statusField.dateKey]: newValue ? date : null
      };

      // Handle mutually exclusive fields (can be array)
      if (statusField.mutuallyExclusive && newValue) {
        const exclusiveFields = Array.isArray(statusField.mutuallyExclusive) ? 
          statusField.mutuallyExclusive : [statusField.mutuallyExclusive];
        
        exclusiveFields.forEach(field => {
          updateData[field] = false;
          updateData[field + '_date'] = null;
        });
      }

      // Auto-close delivery when accepted_by_CA is set to true
      if (statusField.autoClosesDelivery && newValue) {
        updateData.closed = true;
        updateData.closed_date = date;
      }

      // Update StateOfDelivery
      await base44.entities.StateOfDelivery.update(deliveryState.id, updateData);

      // Log the change
      await base44.entities.DeliveryLog.create({
        bus_stop_id: busStop.id,
        status_field: statusField.key,
        old_value: oldValue ? 'true' : 'false',
        new_value: newValue ? 'true' : 'false',
        user_email: user.email,
        comment: comment || `Αλλαγή κατάστασης: ${statusField.label}`
      });

      onUpdated();
      onClose();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Σφάλμα κατά την ενημέρωση. Παρακαλώ δοκιμάστε ξανά.');
    }

    setIsSubmitting(false);
  };

  if (!statusField) return null;

  const currentValue = deliveryState?.[statusField.key];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {currentValue ? 'Αναίρεση' : 'Επιβεβαίωση'}: {statusField.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!currentValue && (
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Ημερομηνία
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comment">Σχόλιο (προαιρετικό)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Προσθέστε σχόλια για αυτή την ενέργεια..."
            />
          </div>

          {statusField.mutuallyExclusive && !currentValue && (
            <Alert>
              <AlertDescription className="text-sm">
                Σημείωση: Αυτή η ενέργεια θα απενεργοποιήσει αυτόματα: {
                  Array.isArray(statusField.mutuallyExclusive) ?
                    statusField.mutuallyExclusive.map(f => {
                      const labels = {
                        'accepted_by_CA': 'Εγκρίθηκε από Αρχή',
                        'declined_by_CA': 'Απορρίφθηκε από Αρχή',
                        'approved_with_snag_list': 'Εγκρίθηκε με snag list'
                      };
                      return labels[f] || f;
                    }).join(', ') :
                    statusField.mutuallyExclusive
                }
              </AlertDescription>
            </Alert>
          )}

          {statusField.autoClosesDelivery && !currentValue && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                Η στάση θα μαρκαριστεί αυτόματα ως ολοκληρωμένη (100%)
              </AlertDescription>
            </Alert>
          )}

          {currentValue && (
            <Alert variant="destructive">
              <AlertDescription>
                Είστε σίγουροι ότι θέλετε να αναιρέσετε αυτή την κατάσταση;
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Ακύρωση
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Αποθήκευση...
              </>
            ) : currentValue ? (
              'Αναίρεση'
            ) : (
              'Επιβεβαίωση'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}