import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, ListChecks, RotateCcw } from 'lucide-react';

export default function ScheduleOptionsDialog({ 
    open, 
    onClose, 
    onCreateMeeting, 
    onCreateNewTask, 
    onScheduleAdHocTask, 
    onScheduleRecurrenceTask,
    selectedDate,
    selectedTime 
}) {
    const handleOption = (optionHandler) => {
        if (typeof optionHandler !== 'function') {
            console.error("Invalid handler passed to ScheduleOptionsDialog:", optionHandler);
            return; 
        }
        optionHandler();
        onClose();
    };

    const formatDateTime = () => {
        if (!selectedDate || !selectedTime) return '';
        const dateStr = selectedDate.toLocaleDateString('el-GR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        return `${dateStr} στις ${selectedTime}`;
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Τι θα θέλατε να προγραμματίσετε;
                    </DialogTitle>
                    {selectedDate && selectedTime && (
                        <p className="text-sm text-slate-600 mt-2">
                            {formatDateTime()}
                        </p>
                    )}
                </DialogHeader>
                
                <div className="space-y-3 py-4">
                    <Button 
                        variant="outline" 
                        className="w-full justify-start gap-3 h-12 text-left"
                        onClick={() => handleOption(onCreateMeeting)}
                    >
                        <Calendar className="w-5 h-5 text-purple-600" />
                        <div>
                            <div className="font-medium">Δημιουργία Meeting</div>
                            <div className="text-xs text-slate-500">Νέο meeting ή συνάντηση</div>
                        </div>
                    </Button>

                    <Button 
                        variant="outline" 
                        className="w-full justify-start gap-3 h-12 text-left"
                        onClick={() => handleOption(onCreateNewTask)}
                    >
                        <Plus className="w-5 h-5 text-blue-600" />
                        <div>
                            <div className="font-medium">Δημιουργία Νέας Εργασίας</div>
                            <div className="text-xs text-slate-500">Νέα ad-hoc εργασία</div>
                        </div>
                    </Button>

                    <Button 
                        variant="outline" 
                        className="w-full justify-start gap-3 h-12 text-left"
                        onClick={() => handleOption(onScheduleAdHocTask)}
                    >
                        <ListChecks className="w-5 h-5 text-green-600" />
                        <div>
                            <div className="font-medium">Προγραμματισμός Ad-hoc Εργασίας</div>
                            <div className="text-xs text-slate-500">Από υπάρχουσες εργασίες</div>
                        </div>
                    </Button>

                    <Button 
                        variant="outline" 
                        className="w-full justify-start gap-3 h-12 text-left"
                        onClick={() => handleOption(onScheduleRecurrenceTask)}
                    >
                        <RotateCcw className="w-5 h-5 text-orange-600" />
                        <div>
                            <div className="font-medium">Προγραμματισμός Recurrence Εργασίας</div>
                            <div className="text-xs text-slate-500">Από recurring εργασίες</div>
                        </div>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}