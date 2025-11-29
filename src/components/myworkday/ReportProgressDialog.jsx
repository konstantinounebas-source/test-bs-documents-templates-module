
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from "@/components/ui/slider";
import { UserTaskLog } from '@/entities/UserTaskLog';
import { UserTask } from '@/entities/UserTask';
import { Loader2 } from 'lucide-react';

export default function ReportProgressDialog({ open, onClose, onReportSaved, task }) {
    const [notes, setNotes] = useState('');
    const [completionPercentage, setCompletionPercentage] = useState(task?.completion_percentage || 0);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (task) {
            setCompletionPercentage(task.completion_percentage || 0);
        }
    }, [task]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!notes.trim()) return;
        setIsSaving(true);
        try {
            await UserTaskLog.create({
                user_task_id: task.id,
                progress_notes: notes,
                status_at_log_time: task.status,
            });

            const updateData = {
                completion_percentage: completionPercentage,
                last_reported_date: new Date().toISOString().split('T')[0]
            };

            if (task.status === 'Pending') {
                updateData.status = 'In Progress';
            }

            await UserTask.update(task.id, updateData);

            onReportSaved();
            setNotes('');
        } catch (error) {
            console.error("Failed to save progress report:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Report Progress for: {task?.title}</DialogTitle>
                    <DialogDescription>
                        Provide an update on your progress and update the completion percentage.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="progress_notes">Progress Notes *</Label>
                        <Textarea 
                            id="progress_notes" 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)} 
                            required 
                            placeholder="What did you work on? Any blockers?"
                            rows={4}
                        />
                    </div>
                    <div>
                        <Label htmlFor="completion_percentage">Completion Percentage: {completionPercentage}%</Label>
                        <Slider
                            id="completion_percentage"
                            min={0}
                            max={100}
                            step={5}
                            value={[completionPercentage]}
                            onValueChange={value => setCompletionPercentage(value[0])}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isSaving || !notes.trim()}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save Report'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
