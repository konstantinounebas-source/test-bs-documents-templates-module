import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock } from 'lucide-react';

export default function TimeSpentDialog({ 
    open, 
    onClose, 
    onSubmit, 
    task, 
    newCompletionPercentage 
}) {
    const [timeSpentMinutes, setTimeSpentMinutes] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = () => {
        const timeValue = parseFloat(timeSpentMinutes) || 0;
        onSubmit({
            timeSpentMinutes: timeValue,
            notes: notes.trim()
        });
        
        // Reset form
        setTimeSpentMinutes('');
        setNotes('');
    };

    const handleClose = () => {
        setTimeSpentMinutes('');
        setNotes('');
        onClose();
    };

    if (!task) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Καταγραφή Χρόνου
                    </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                        <strong>Εργασία:</strong> {task.title}
                        {newCompletionPercentage !== undefined && (
                            <div className="mt-1">
                                <strong>Νέο ποσοστό ολοκλήρωσης:</strong> {newCompletionPercentage}%
                            </div>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="time_spent">Χρόνος που δαπανήθηκε (λεπτά) *</Label>
                        <Input
                            id="time_spent"
                            type="number"
                            min="0"
                            step="5"
                            value={timeSpentMinutes}
                            onChange={e => setTimeSpentMinutes(e.target.value)}
                            placeholder="π.χ. 30"
                            required
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Εισάγετε τον χρόνο σε λεπτά (π.χ. 90 για 1.5 ώρα)
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="time_notes">Σημειώσεις (προαιρετικό)</Label>
                        <Textarea
                            id="time_notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Τι ακριβώς έγινε κατά τη διάρκεια αυτού του χρόνου..."
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        Ακύρωση
                    </Button>
                    <Button onClick={handleSubmit}>
                        Καταγραφή
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}