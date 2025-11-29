import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { ScheduledEvent } from '@/entities/ScheduledEvent';
import { UserTask } from '@/entities/UserTask';
import { UserTaskLog } from '@/entities/UserTaskLog';
import TimeSelect from '../common/TimeSelect';

// Helper to get local YYYY-MM-DD string to avoid timezone issues
const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function ScheduleTaskDialog({ 
    open, 
    onClose, 
    onEventSaved, 
    user, 
    task, 
    initialDate, 
    initialTime, 
    editingEvent,
    userTasks = []
}) {
    // Simple individual state for each field
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [durationMinutes, setDurationMinutes] = useState('60');
    const [isMeeting, setIsMeeting] = useState(false);
    const [parentUserTaskId, setParentUserTaskId] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);
    const [progressNotes, setProgressNotes] = useState('');
    const [timeSpent, setTimeSpent] = useState('');

    // Use ref to track if we've initialized for this dialog session
    const initializedRef = useRef(false);

    // Initialize form when dialog opens - only once per open
    useEffect(() => {
        if (!open) {
            initializedRef.current = false;
            return;
        }

        if (initializedRef.current) return; // Already initialized for this session
        initializedRef.current = true;

        // Find associated task
        const associatedTask = editingEvent 
            ? userTasks.find(t => t.id === editingEvent.parent_user_task_id) 
            : task;

        // Set date
        let startDate;
        if (editingEvent?.scheduled_date) {
            startDate = new Date(editingEvent.scheduled_date);
        } else if (initialDate) {
            startDate = new Date(initialDate);
        } else {
            startDate = new Date();
        }

        // Set start time
        const defaultStartTime = editingEvent?.start_time || initialTime || '09:00';
        
        // Set duration
        const defaultDuration = editingEvent?.duration_minutes || associatedTask?.estimated_time_minutes || 60;
        
        // Calculate end time
        let defaultEndTime = '10:00';
        try {
            const startDateTime = new Date(`${format(startDate, 'yyyy-MM-dd')}T${defaultStartTime}`);
            const endDateTime = addMinutes(startDateTime, defaultDuration);
            defaultEndTime = format(endDateTime, 'HH:mm');
        } catch (error) {
            console.error("Error calculating end time:", error);
        }

        // Set all values
        setTitle(editingEvent?.title || associatedTask?.title || '');
        setDescription(editingEvent?.description || associatedTask?.description || '');
        setScheduledDate(format(startDate, 'yyyy-MM-dd'));
        setStartTime(defaultStartTime);
        setEndTime(defaultEndTime);
        setDurationMinutes(String(defaultDuration));
        setIsMeeting(editingEvent ? editingEvent.is_meeting : !associatedTask);
        setParentUserTaskId(editingEvent?.parent_user_task_id || associatedTask?.id || '');
        
        // Reset progress tracking fields
        setProgressNotes('');
        setTimeSpent('');

    }, [open, editingEvent, initialDate, initialTime, task, userTasks]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            const dataToSave = {
                title: title.trim(),
                description: description.trim(),
                user_email: user?.email || '',
                scheduled_date: scheduledDate,
                start_time: startTime,
                end_time: endTime,
                duration_minutes: parseInt(durationMinutes) || 60,
                is_meeting: isMeeting,
                parent_user_task_id: parentUserTaskId || null,
            };

            let savedEvent;
            if (editingEvent) {
                await ScheduledEvent.update(editingEvent.id, dataToSave);
                savedEvent = { ...editingEvent, ...dataToSave };
            } else {
                savedEvent = await ScheduledEvent.create(dataToSave);
            }

            // Handle progress logging for existing events linked to tasks
            const hasProgressUpdate = dataToSave.parent_user_task_id && 
                ((timeSpent && parseFloat(timeSpent) > 0) || (progressNotes && progressNotes.trim() !== ''));

            if (hasProgressUpdate) {
                const timeSpentMinutes = parseFloat(timeSpent) || 0;
                const taskToUpdate = userTasks.find(t => t.id === dataToSave.parent_user_task_id);

                if (taskToUpdate) {
                    await UserTask.update(taskToUpdate.id, {
                        total_time_spent_minutes: (taskToUpdate.total_time_spent_minutes || 0) + timeSpentMinutes,
                        last_reported_date: getLocalDateString(new Date()),
                    });

                    await UserTaskLog.create({
                        user_task_id: taskToUpdate.id,
                        progress_notes: progressNotes || `Logged ${timeSpentMinutes} minutes of work.`,
                        status_at_log_time: taskToUpdate.status,
                        time_spent_in_log_minutes: timeSpentMinutes,
                    });
                }
            }

            onEventSaved();
        } catch (error) {
            console.error("Failed to save scheduled event:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {editingEvent ? 'Edit Event' : (task ? 'Schedule Task' : 'Create New Event')}
                    </DialogTitle>
                    <DialogDescription>
                        {editingEvent ? 'Update the details of this scheduled event.' : 'Add a new event or task block to your calendar.'}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    {!task && !editingEvent?.parent_user_task_id && (
                        <div>
                            <Label htmlFor="title">Event Title</Label>
                            <Input 
                                id="title" 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)} 
                                placeholder="Enter event title"
                            />
                        </div>
                    )}
                    
                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add event details..."
                            rows={2}
                        />
                    </div>
                    
                    <div>
                        <Label htmlFor="scheduled_date">Date</Label>
                        <Input 
                            id="scheduled_date" 
                            type="date" 
                            value={scheduledDate} 
                            onChange={(e) => setScheduledDate(e.target.value)} 
                        />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="start_time">Start Time</Label>
                            <TimeSelect
                                value={startTime}
                                onChange={setStartTime}
                                placeholder="Select start time"
                            />
                        </div>
                        <div>
                            <Label htmlFor="duration_minutes">Duration (min)</Label>
                            <Input 
                                id="duration_minutes" 
                                type="number" 
                                min="5" 
                                step="5"
                                value={durationMinutes} 
                                onChange={(e) => setDurationMinutes(e.target.value)} 
                                placeholder="60"
                            />
                        </div>
                        <div>
                            <Label htmlFor="end_time">End Time</Label>
                            <TimeSelect
                                value={endTime}
                                onChange={setEndTime}
                                placeholder="Select end time"
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <Switch 
                            id="is_meeting" 
                            checked={isMeeting} 
                            onCheckedChange={setIsMeeting} 
                            disabled={!!task || !!editingEvent?.parent_user_task_id}
                        />
                        <Label htmlFor="is_meeting">Is this a meeting?</Label>
                    </div>

                    {/* Progress Logging for existing events linked to tasks */}
                    {editingEvent && editingEvent.parent_user_task_id && (
                        <div className="border-t pt-4 space-y-4">
                            <h3 className="text-sm font-medium text-slate-700">Log Progress for this Session</h3>
                            <div>
                                <Label htmlFor="time_spent">Time Spent (minutes)</Label>
                                <Input 
                                    id="time_spent" 
                                    type="number" 
                                    min="0"
                                    step="5"
                                    value={timeSpent} 
                                    onChange={(e) => setTimeSpent(e.target.value)}
                                    placeholder="e.g. 45"
                                />
                            </div>
                            <div>
                                <Label htmlFor="progress_notes">Progress Notes (optional)</Label>
                                <Textarea
                                    id="progress_notes"
                                    value={progressNotes}
                                    onChange={(e) => setProgressNotes(e.target.value)}
                                    placeholder="What did you accomplish in this session?"
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
                        {editingEvent ? 'Update Event' : (task ? 'Schedule Task' : 'Create Event')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}