
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Added Tabs imports
import { UserTask } from '@/entities/UserTask';
import { UserTaskLog } from '@/entities/UserTaskLog';
import { User } from '@/entities/User';
import { AppUser } from '@/entities/AppUser';
import { UserTaskCategory } from '@/entities/UserTaskCategory';
import TimeSelect from '@/components/common/TimeSelect';
import { Loader2, Info, Upload, File, X as XIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { logAction } from '@/components/lib/logger';
import { UploadFile } from '@/integrations/Core';
import { calculateNextDueDate, shouldUpdateDueDate } from '@/components/lib/recurrenceUtils';

// Helper to get local YYYY-MM-DD string to avoid timezone issues
const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DAYS_OF_WEEK = [
    { value: 'MONDAY', label: 'Monday' },
    { value: 'TUESDAY', label: 'Tuesday' },
    { value: 'WEDNESDAY', label: 'Wednesday' },
    { value: 'THURSDAY', label: 'Thursday' },
    { value: 'FRIDAY', label: 'Friday' },
    { value: 'SATURDAY', label: 'Saturday' },
    { value: 'SUNDAY', label: 'Sunday' }
];

const ORDINALS = [
    { value: 'FIRST', label: 'First' },
    { value: 'SECOND', label: 'Second' },
    { value: 'THIRD', label: 'Third' },
    { value: 'FOURTH', label: 'Fourth' },
    { value: 'LAST', label: 'Last' }
];

// TimeSpentDialog component - for prompting user to enter time when completion percentage changes
const TimeSpentDialog = ({ open, onClose, onSubmit, task, newCompletionPercentage }) => {
    const [timeSpentMinutes, setTimeSpentMinutes] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ timeSpentMinutes: parseFloat(timeSpentMinutes) || 0 });
    };

    const handleCancel = () => {
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Time Spent Update</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {task && (
                        <p>
                            You've changed the completion percentage for "<strong>{task.title}</strong>" from{' '}
                            {task.completion_percentage || 0}% to {newCompletionPercentage}%.
                        </p>
                    )}
                    <p>Please enter the time spent (in minutes) for this update.</p>
                    <div>
                        <Label htmlFor="time_spent_dialog_input">Time Spent (minutes)</Label>
                        <Input
                            id="time_spent_dialog_input"
                            type="number"
                            min="0"
                            step="5"
                            value={timeSpentMinutes}
                            onChange={e => setTimeSpentMinutes(e.target.value)}
                            placeholder="e.g. 30"
                            required
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
                        <Button type="submit">Submit Time</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

// Add the delay helper function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function CreateEditTaskDialog({ open, onClose, onTaskSaved, task, user, loggedInUser }) {
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [activeTab, setActiveTab] = useState('basic'); // State for managing active tab

    // State variables for time tracking and completion updates
    const [timeSpentForUpdate, setTimeSpentForUpdate] = useState('');
    const [showTimeSpentDialog, setShowTimeSpentDialog] = useState(false);
    const [pendingCompletionUpdate, setPendingCompletionUpdate] = useState(null);
    const [originalCompletionPercentage, setOriginalCompletionPercentage] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const getInitialFormData = useCallback(() => ({
        title: task?.title || '',
        description: task?.description || '',
        start_date: task?.start_date ? format(new Date(task.start_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        due_date: task?.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        priority: task?.priority || 'Medium',
        priority_order: task?.priority_order || '',
        status: task?.status || 'Pending',
        completion_percentage: task?.completion_percentage || 0,
        estimated_time_minutes: task?.estimated_time_minutes || 60,
        is_recurring: task?.is_recurring || false,
        recurrence_pattern: task?.recurrence_pattern || 'Daily', // Default to Daily for new tasks
        recurrence_interval: task?.recurrence_interval || 1,
        recurrence_day_of_week: task?.recurrence_day_of_week || 'MONDAY',
        recurrence_day_of_month: task?.recurrence_day_of_month || 1,
        recurrence_ordinal: task?.recurrence_ordinal || 'FIRST',
        monthly_recurrence_type: task?.monthly_recurrence_type || 'DAY_OF_MONTH', // Default for new tasks
        recurrence_start_date: task?.recurrence_start_date ? format(new Date(task.recurrence_start_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        recurrence_end_date: task?.recurrence_end_date ? format(new Date(task.recurrence_end_date), 'yyyy-MM-dd') : '',
        max_occurrences: task?.max_occurrences || '',
        current_occurrence: task?.current_occurrence || 1,
        assigned_to_user_email: task?.assigned_to_user_email || user?.email,
        attachments: task?.attachments || [],
        category: task?.category || '',
    }), [task, user]);

    const [formData, setFormData] = useState(getInitialFormData());

    const [progressNotes, setProgressNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Reset form data and state when task or user changes, or dialog opens
        setFormData(getInitialFormData());
        setProgressNotes('');
        setValidationErrors({});
        setTimeSpentForUpdate(''); // Clear any time spent input for a new task/edit session
        setOriginalCompletionPercentage(task?.completion_percentage || 0); // Capture original percentage for comparison
        setActiveTab('basic'); // Reset to basic tab on dialog open/task change
    }, [task, user, getInitialFormData, open]);

    // New useEffect for data loading with delays and proper user de-duplication
    useEffect(() => {
        const fetchData = async () => {
            if (!open) return; // Only fetch if dialog is open

            setIsLoading(true);
            setError('');

            try {
                // Fetch categories with delay
                await delay(300);
                const fetchedCategories = await UserTaskCategory.list();
                setCategories(fetchedCategories);

                // Fetch users with delay and combine/de-duplicate
                await delay(300);
                const [appUsers, systemUsers] = await Promise.all([
                    AppUser.list().catch(() => []),
                    User.list().catch(() => [])
                ]);

                const allUsersMap = new Map();

                // Add system users first (prioritized if emails conflict)
                systemUsers.forEach(sUser => {
                    if (sUser.email) {
                        allUsersMap.set(sUser.email, { email: sUser.email, name: sUser.full_name, source: 'platform' });
                    }
                });

                // Add app users, ensuring no duplicates by email and handling internal app users
                appUsers.forEach(aUser => {
                    if (aUser.email && !allUsersMap.has(aUser.email)) {
                        allUsersMap.set(aUser.email, { email: aUser.email, name: aUser.full_name, source: 'app' });
                    } else if (!aUser.email) {
                        // For app users without an email, use a unique internal identifier
                        // Ensure this internal ID also doesn't conflict
                        const internalEmail = `appuser_${aUser.id}@internal`;
                        if (!allUsersMap.has(internalEmail)) {
                            allUsersMap.set(internalEmail, { email: internalEmail, name: aUser.full_name, source: 'app-internal' });
                        }
                    }
                });

                // Convert map values to array and sort by name
                setUsers(Array.from(allUsersMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '')));

            } catch (err) {
                console.error("Failed to load users or categories:", err);
                setError("Failed to load users or categories. Please try again.");
                setUsers([]); // Clear users on error
                setCategories([]); // Clear categories on error
            } finally {
                setIsLoading(false);
            }
        };

        fetchData(); // Call the async function
    }, [open]); // Dependency on 'open' prop

    const handleInputChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (validationErrors[field]) {
            setValidationErrors(prev => ({ ...prev, [field]: null }));
        }
    }, [validationErrors]);

    const validateForm = useCallback(() => {
        const errors = {};

        if (!formData.title?.trim()) {
            errors.title = 'Title is required';
        }

        if (!formData.due_date) {
            errors.due_date = 'Due date is required';
        }

        if (formData.estimated_time_minutes === '' || formData.estimated_time_minutes === null || isNaN(parseFloat(formData.estimated_time_minutes))) {
            errors.estimated_time_minutes = 'Estimated time is required';
        }

        if (formData.start_date && formData.due_date) {
            const startDate = new Date(formData.start_date);
            const dueDate = new Date(formData.due_date);
            if (startDate > dueDate) {
                errors.due_date = 'Due date must be after or equal to start date';
            }
        }

        if (formData.is_recurring) {
            if (!formData.recurrence_start_date) {
                errors.recurrence_start_date = 'Recurrence start date is required for recurring tasks.';
            }
            if (formData.recurrence_end_date && formData.recurrence_start_date) {
                const recurrenceStartDate = new Date(formData.recurrence_start_date);
                const recurrenceEndDate = new Date(formData.recurrence_end_date);
                if (recurrenceStartDate > recurrenceEndDate) {
                    errors.recurrence_end_date = 'Recurrence end date must be after or equal to recurrence start date.';
                }
            }
            if (formData.recurrence_end_date && formData.max_occurrences) {
                errors.recurrence_end_date = 'Please specify either an end date or a maximum number of occurrences, not both.';
                errors.max_occurrences = 'Please specify either an end date or a maximum number of occurrences, not both.';
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData]);

    // New handler for completion percentage slider changes
    const handleCompletionPercentageChange = useCallback((value) => {
        const newPercentage = value[0];
        handleInputChange('completion_percentage', newPercentage);
    }, [handleInputChange]);

    const getChangedFields = (original, current) => {
        const changes = {};
        for (const key in current) {
            // Check for direct equality or if both are empty strings/null for date/estimated_time_minutes
            const originalValue = original[key];
            const currentValue = current[key];

            let changed = false;
            if (key === 'estimated_time_minutes' || key === 'priority_order') {
                const origNum = parseFloat(originalValue);
                const currNum = parseFloat(currentValue);
                // Compare as numbers if both are valid, otherwise as strings
                changed = (!isNaN(origNum) && !isNaN(currNum) && origNum !== currNum) ||
                          (isNaN(origNum) !== isNaN(currNum)) || // One is number, other is not
                          (isNaN(origNum) && isNaN(currNum) && originalValue !== currentValue); // Both NaN, compare as strings
            } else if (key === 'start_date' || key === 'due_date' || key === 'recurrence_start_date' || key === 'recurrence_end_date') {
                // Treat empty string and null/undefined as equivalent for dates
                changed = (originalValue || '') !== (currentValue || '');
            } else if (key === 'recurrence_interval' || key === 'recurrence_day_of_month' || key === 'completion_percentage' || key === 'max_occurrences' || key === 'current_occurrence') {
                 // Compare as numbers
                 changed = parseFloat(originalValue) !== parseFloat(currentValue);
            } else if (key === 'attachments') {
                // Deep compare arrays of objects (simple comparison for now based on length and URLs)
                // A more robust comparison would involve sorting and comparing object by object
                changed = (originalValue?.length !== currentValue?.length) ||
                          (originalValue?.some((orig, idx) => orig.url !== currentValue[idx]?.url));
            }
            else {
                changed = originalValue !== currentValue;
            }

            if (changed) {
                changes[key] = { from: originalValue, to: currentValue };
            }
        }
        return changes;
    };

    const handleFileUpload = async (file) => {
        if (!file) return;
        setIsUploading(true);
        try {
            const { file_url } = await UploadFile({ file });
            const newAttachment = {
                url: file_url,
                filename: file.name,
                uploaded_by_email: loggedInUser.email, // FIX: Use loggedInUser
                uploaded_at: new Date().toISOString(),
            };
            handleInputChange('attachments', [...formData.attachments, newAttachment]);
        } catch (error) {
            console.error("File upload failed:", error);
            alert("File upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveAttachment = (indexToRemove) => {
        handleInputChange('attachments', formData.attachments.filter((_, index) => index !== indexToRemove));
    };

    // Callback for the main form submission
    const handleSubmit = useCallback(async (e) => {
        if (e) { // Only prevent default if it's a DOM event
            e.preventDefault();
        }

        // Step 1: If completion percentage was changed for an existing task AND we haven't collected time for it yet
        // Trigger the TimeSpentDialog and return, waiting for its input.
        // Added: `formData.completion_percentage !== (task.completion_percentage || 0)` to ensure actual change from task's current percentage
        if (task && formData.completion_percentage !== originalCompletionPercentage && !timeSpentForUpdate && formData.completion_percentage !== (task.completion_percentage || 0)) {
            setPendingCompletionUpdate({
                task: task,
                newPercentage: formData.completion_percentage,
                oldPercentage: originalCompletionPercentage
            });
            setShowTimeSpentDialog(true);
            return; // Stop here, wait for time input from the dialog
        }

        // Step 2: Validate the form data
        if (!validateForm()) {
            // If validation fails, stay on the current tab or switch to the first tab with an error
            const firstErrorField = Object.keys(validationErrors)[0];
            if (firstErrorField) {
                if (['title', 'due_date', 'estimated_time_minutes', 'priority', 'status', 'category', 'assigned_to_user_email', 'start_date'].includes(firstErrorField)) {
                    setActiveTab('basic');
                } else if (['recurrence_start_date', 'recurrence_end_date', 'max_occurrences'].includes(firstErrorField)) {
                    setActiveTab('recurrence');
                }
            }
            return;
        }

        setIsSaving(true);
        try {
            const dataToSave = { ...formData };

            // Clean up empty date fields
            if (!dataToSave.start_date) delete dataToSave.start_date;
            // Removed: if (!dataToSave.due_date) delete dataToSave.due_date; - due_date is now required

            // Clean up empty numeric fields or convert to number
            // Removed: if (dataToSave.estimated_time_minutes === '' || dataToSave.estimated_time_minutes === null || isNaN(parseFloat(dataToSave.estimated_time_minutes))) {
            // Removed:    delete dataToSave.estimated_time_minutes;
            // Removed: } else {
                dataToSave.estimated_time_minutes = parseFloat(dataToSave.estimated_time_minutes); // Ensure it's a number, now it's required so it will always be a number
            // Removed: }

            if (dataToSave.priority_order === '' || dataToSave.priority_order === null || isNaN(parseInt(dataToSave.priority_order, 10))) {
                delete dataToSave.priority_order;
            } else {
                dataToSave.priority_order = parseInt(dataToSave.priority_order, 10);
            }

            // Clean up empty category field to null
            if (dataToSave.category === '') {
                dataToSave.category = null;
            }

            // Handle recurrence logic
            if (dataToSave.is_recurring === false) {
                dataToSave.recurrence_pattern = 'None';
                // Clear all recurrence-related fields
                delete dataToSave.recurrence_interval;
                delete dataToSave.recurrence_day_of_week;
                delete dataToSave.recurrence_day_of_month;
                delete dataToSave.recurrence_ordinal;
                delete dataToSave.monthly_recurrence_type;
                delete dataToSave.recurrence_start_date;
                delete dataToSave.recurrence_end_date;
                delete dataToSave.max_occurrences;
                delete dataToSave.current_occurrence;
            } else {
                // Ensure recurrence_start_date is set if recurring
                if (!dataToSave.recurrence_start_date) {
                    dataToSave.recurrence_start_date = format(new Date(), 'yyyy-MM-dd'); // Default to today
                }

                // Clean up max_occurrences
                if (dataToSave.max_occurrences === '' || dataToSave.max_occurrences === null || isNaN(parseInt(dataToSave.max_occurrences, 10))) {
                    delete dataToSave.max_occurrences;
                } else {
                    dataToSave.max_occurrences = parseInt(dataToSave.max_occurrences, 10);
                }

                // Clean up current_occurrence
                if (dataToSave.current_occurrence === '' || dataToSave.current_occurrence === null || isNaN(parseInt(dataToSave.current_occurrence, 10))) {
                    dataToSave.current_occurrence = 1; // Default to 1
                } else {
                    dataToSave.current_occurrence = parseInt(dataToSave.current_occurrence, 10);
                }

                // Clean up recurrence_end_date if empty
                if (!dataToSave.recurrence_end_date) {
                    delete dataToSave.recurrence_end_date;
                }

                // Enforce only one end condition: if both are present, prioritize recurrence_end_date
                if (dataToSave.recurrence_end_date && dataToSave.max_occurrences) {
                    delete dataToSave.max_occurrences;
                }

                // Clean up unused recurrence fields based on pattern
                if (dataToSave.recurrence_pattern !== 'Weekly') {
                    // Only delete if it's not monthly DAY_OF_WEEK (which also uses day_of_week)
                    if (dataToSave.recurrence_pattern !== 'Monthly' || dataToSave.monthly_recurrence_type !== 'DAY_OF_WEEK') {
                        delete dataToSave.recurrence_day_of_week;
                    }
                }
                if (dataToSave.recurrence_pattern !== 'Monthly') {
                    delete dataToSave.recurrence_day_of_month;
                    delete dataToSave.recurrence_ordinal;
                    delete dataToSave.monthly_recurrence_type;
                }
                if (dataToSave.recurrence_pattern === 'Daily') {
                    delete dataToSave.recurrence_interval; // Daily doesn't use interval
                }
                if (dataToSave.recurrence_pattern === 'Monthly') {
                    if (dataToSave.monthly_recurrence_type === 'DAY_OF_MONTH') {
                        delete dataToSave.recurrence_day_of_week;
                        delete dataToSave.recurrence_ordinal;
                    } else if (dataToSave.monthly_recurrence_type === 'DAY_OF_WEEK') {
                        delete dataToSave.recurrence_day_of_month;
                    }
                }
            }

            // For recurrence tasks, auto-update due_date if needed (for existing tasks)
            if (dataToSave.is_recurring && task) {
                // Only auto-update if the user didn't manually change the due date (formData.due_date still matches original task.due_date)
                // and if there's a meaningful update and it meets the criteria for due date advancement.
                const originalDueDate = task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '';
                const hasMeaningfulUpdate = progressNotes.trim() ||
                    (timeSpentForUpdate !== '' && !isNaN(parseFloat(timeSpentForUpdate)) && parseFloat(timeSpentForUpdate) > 0);

                if (originalDueDate === formData.due_date && hasMeaningfulUpdate && shouldUpdateDueDate(task)) {
                    const nextDue = calculateNextDueDate(task);
                    if (nextDue && nextDue !== originalDueDate) { // Ensure it's a new, valid due date
                        dataToSave.due_date = nextDue;
                        // Don't increment due_date_change_count for automatic recurrence updates
                    }
                }
            }

            if (dataToSave.status === 'Completed' && !task?.completion_date) {
                dataToSave.completion_date = getLocalDateString(new Date());
                dataToSave.completion_percentage = 100;
            } else if (dataToSave.status !== 'Completed' && task?.completion_date) {
                dataToSave.completion_date = null;
            }

            if (dataToSave.status === 'Canceled') {
                dataToSave.completion_percentage = 0;
            }

            if (task) {
                const originalData = getInitialFormData(); // Re-fetch initial data for accurate comparison
                const changes = getChangedFields(originalData, formData);

                // Only count due_date changes that are manual (not automatic recurrence updates)
                // 'changes.due_date' checks if formData.due_date is different from originalData.due_date
                if (changes.due_date && !dataToSave.is_recurring) {
                    dataToSave.due_date_change_count = (task.due_date_change_count || 0) + 1;
                }

                // Add time spent if provided and is a valid number
                if (timeSpentForUpdate !== '' && !isNaN(parseFloat(timeSpentForUpdate))) {
                    const timeSpentMinutes = parseFloat(timeSpentForUpdate);
                    dataToSave.total_time_spent_minutes = (task.total_time_spent_minutes || 0) + timeSpentMinutes;
                }

                const isRelevantChange = progressNotes.trim() ||
                                         (changes.completion_percentage && changes.completion_percentage.to !== changes.completion_percentage.from) ||
                                         (timeSpentForUpdate !== '' && !isNaN(parseFloat(timeSpentForUpdate)) && parseFloat(timeSpentForUpdate) > 0) ||
                                         Object.keys(changes).length > 0;

                if (isRelevantChange) {
                    const loggedInEmail = String(loggedInUser?.email || '');
                    const assignedEmail = String(task.assigned_to_user_email || '');
                    if (loggedInEmail && assignedEmail && loggedInEmail !== assignedEmail) {
                        dataToSave.has_unseen_external_changes = true;
                    }

                    logAction({
                        action_type: 'UPDATE',
                        target_entity: 'UserTask',
                        target_id: task.id,
                        details: { changes, progressNotes: progressNotes.trim(), timeSpent: timeSpentForUpdate }
                    });
                }

                // *** FIX: CONSOLIDATE UPDATE LOGIC HERE ***
                const shouldLogActivity = progressNotes.trim() || (changes.completion_percentage && changes.completion_percentage.to !== changes.completion_percentage.from) || (timeSpentForUpdate !== '' && !isNaN(parseFloat(timeSpentForUpdate)));

                if (shouldLogActivity) {
                    dataToSave.last_reported_date = getLocalDateString(new Date());
                    // If task was Pending and status is still Pending after logging, mark as In Progress
                    if (task.status === 'Pending' && dataToSave.status === 'Pending') {
                         dataToSave.status = 'In Progress';
                    }
                }

                await UserTask.update(task.id, dataToSave);
                const updatedTask = { ...task, ...dataToSave };

                // Create a log entry if any relevant change occurred
                if (shouldLogActivity || (changes.due_date && !dataToSave.is_recurring)) { // Log due date changes only if manual
                    let logMessage = progressNotes.trim();
                    if (changes.completion_percentage && !progressNotes.trim()) {
                        logMessage = `Completion updated to ${dataToSave.completion_percentage}% via edit dialog.`;
                    } else if (changes.completion_percentage && progressNotes.trim()) {
                        logMessage += ` (Completion updated to ${dataToSave.completion_percentage}%)`;
                    }

                    if (timeSpentForUpdate !== '' && !isNaN(parseFloat(timeSpentForUpdate))) {
                        logMessage += ` (Time spent: ${timeSpentForUpdate} minutes)`;
                    }

                    if (dataToSave.is_recurring && changes.due_date && dataToSave.due_date === calculateNextDueDate(task)) {
                        logMessage += (logMessage ? ' | ' : '') + `Due date automatically advanced to ${dataToSave.due_date} for recurring task.`;
                    } else if (changes.due_date) {
                        logMessage += (logMessage ? ' | ' : '') + `Due date changed from ${originalData.due_date || 'N/A'} to ${dataToSave.due_date || 'N/A'}.`;
                    }

                    if (logMessage) { // Only log if there's something to say
                      await UserTaskLog.create({
                          user_task_id: task.id,
                          progress_notes: logMessage,
                          status_at_log_time: dataToSave.status || task.status,
                          time_spent_in_log_minutes: timeSpentForUpdate !== '' && !isNaN(parseFloat(timeSpentForUpdate)) ? parseFloat(timeSpentForUpdate) : undefined
                      });
                    }
                }
                onTaskSaved(updatedTask);
            } else {
                // For new recurrence tasks, set initial due_date based on pattern
                if (dataToSave.is_recurring && dataToSave.recurrence_pattern !== 'None') {
                    const initialDueDate = calculateNextDueDate(dataToSave, new Date());
                    if (initialDueDate) {
                        dataToSave.due_date = initialDueDate;
                    }
                }

                const createdTask = await UserTask.create(dataToSave);
                logAction({
                    action_type: 'CREATE',
                    target_entity: 'UserTask',
                    target_id: createdTask.id,
                    details: { title: createdTask.title }
                });
                onTaskSaved(createdTask); // Pass the newly created task object
            }
        } catch (error) {
            console.error("Failed to save task:", error);
            setError(`Failed to save task: ${error.message}`);
        } finally {
            setIsSaving(false);
            setTimeSpentForUpdate(''); // Clear captured time spent after save is attempted
            setPendingCompletionUpdate(null); // Clear pending update after save
        }
    }, [formData, progressNotes, task, loggedInUser, validateForm, getInitialFormData, timeSpentForUpdate, originalCompletionPercentage, onTaskSaved, validationErrors]);

    // Handler for time spent dialog submission
    const handleTimeSpentSubmit = useCallback(async (timeData) => {
        setTimeSpentForUpdate(timeData.timeSpentMinutes || ''); // Set the captured time spent
        setShowTimeSpentDialog(false); // Close the time spent dialog
        setPendingCompletionUpdate(null); // Clear pending completion update as time has been captured
        await handleSubmit(null); // Re-trigger the main form submission now that time is available
    }, [handleSubmit]);

    // Handler for time spent dialog cancellation
    const handleTimeSpentCancel = useCallback(() => {
        if (pendingCompletionUpdate) {
            // Revert completion percentage to its state before the dialog was triggered
            handleInputChange('completion_percentage', originalCompletionPercentage);
            setPendingCompletionUpdate(null);
        }
        setShowTimeSpentDialog(false);
        setTimeSpentForUpdate(''); // Clear any time input if user cancels
    }, [pendingCompletionUpdate, originalCompletionPercentage, handleInputChange]);


    const isTaskCompletedOrCanceled = task?.status === 'Completed' || task?.status === 'Canceled';

    const getRecurrenceDescription = () => {
        if (!formData.is_recurring || formData.recurrence_pattern === 'None') return '';

        let description = '';
        switch (formData.recurrence_pattern) {
            case 'Daily':
                description = 'Καθημερινά';
                break;
            case 'Weekly':
                const dayLabel = DAYS_OF_WEEK.find(d => d.value === formData.recurrence_day_of_week)?.label || 'Δευτέρα';
                const weekInterval = formData.recurrence_interval || 1;
                description = weekInterval === 1 ?
                    `Κάθε ${dayLabel}` :
                    `Κάθε ${weekInterval} εβδομάδες την ${dayLabel}`;
                break;
            case 'Monthly':
                const monthInterval = formData.recurrence_interval || 1;
                const monthText = monthInterval === 1 ? 'μήνα' : `${monthInterval} μήνες`;

                if (formData.monthly_recurrence_type === 'DAY_OF_MONTH') {
                    description = `Την ${formData.recurrence_day_of_month}η ημέρα κάθε ${monthText}`;
                } else {
                    const ordinalLabel = ORDINALS.find(o => o.value === formData.recurrence_ordinal)?.label || 'Πρώτη';
                    const dayLabel = DAYS_OF_WEEK.find(d => d.value === formData.recurrence_day_of_week)?.label || 'Δευτέρα';
                    description = `Την ${ordinalLabel} ${dayLabel} κάθε ${monthText}`;
                }
                break;
            default:
                description = '';
        }

        // Add start date
        if (formData.recurrence_start_date) {
            description += ` από ${format(new Date(formData.recurrence_start_date), 'dd/MM/yyyy')}`;
        }

        // Add end condition
        if (formData.recurrence_end_date) {
            description += ` μέχρι ${format(new Date(formData.recurrence_end_date), 'dd/MM/yyyy')}`;
        } else if (formData.max_occurrences) {
            description += ` για ${formData.max_occurrences} φορές`;
        } else {
            description += ` επ' αόριστον`;
        }

        return description;
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"> {/* Changed max-w-2xl to max-w-4xl */}
                <DialogHeader>
                    <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="basic">Basic Details</TabsTrigger>
                            <TabsTrigger value="recurrence">Recurrence</TabsTrigger>
                            <TabsTrigger value="progress_attachments">Progress & Attachments</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4 mt-4">
                            <div className="col-span-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={e => handleInputChange('title', e.target.value)}
                                    required
                                    className={validationErrors.title ? 'border-red-500' : ''}
                                    disabled={isTaskCompletedOrCanceled}
                                />
                                {validationErrors.title && (
                                    <p className="text-red-500 text-sm mt-1">{validationErrors.title}</p>
                                )}
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={e => handleInputChange('description', e.target.value)}
                                    disabled={isTaskCompletedOrCanceled}
                                />
                            </div>

                            <div>
                                <Label htmlFor="assigned_to">Assigned To *</Label>
                                <Select
                                    value={formData.assigned_to_user_email}
                                    onValueChange={value => handleInputChange('assigned_to_user_email', value)}
                                    disabled={isTaskCompletedOrCanceled}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select user..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {isLoading ? (
                                            <div className="flex items-center justify-center p-4">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="ml-2 text-sm">Loading users...</span>
                                            </div>
                                        ) : error ? (
                                            <div className="p-4 text-red-500 text-sm">{error}</div>
                                        ) : (
                                            users.map(user => (
                                                <SelectItem key={user.email} value={user.email}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{user.name}</span>
                                                        <span className="text-xs text-slate-500">({user.email})</span>
                                                    </div>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select
                                        value={formData.category || 'no_category'} // Fix: ensure a default value
                                        onValueChange={(value) => handleInputChange('category', value === 'no_category' ? '' : value)}
                                        disabled={isTaskCompletedOrCanceled}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="no_category">-- No Category --</SelectItem> {/* Sentinel value */}
                                            {isLoading ? ( // Show loading for categories too
                                                <div className="flex items-center justify-center p-4">
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    <span className="ml-2 text-sm">Loading categories...</span>
                                                </div>
                                            ) : error ? ( // Show error for categories too
                                                <div className="p-4 text-red-500 text-sm">{error}</div>
                                            ) : (
                                                categories.filter(c => c.is_active).map(cat => ( // Filter for active categories
                                                    <SelectItem key={cat.id} value={cat.name}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color_code || '#A8A29E' }} />
                                                            {cat.name}
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select
                                        value={formData.priority || 'Medium'} // Fix: ensure a default value
                                        onValueChange={value => handleInputChange('priority', value)}
                                        disabled={isTaskCompletedOrCanceled}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Low">Low</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="High">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="start_date">Start Date</Label>
                                    <Input
                                        id="start_date"
                                        type="date"
                                        value={formData.start_date}
                                        onChange={e => handleInputChange('start_date', e.target.value)}
                                        disabled={isTaskCompletedOrCanceled}
                                    />
                                    {!task && (
                                        <Alert className="mt-2">
                                            <Info className="h-4 w-4" />
                                            <AlertDescription>
                                                Default is today's date. You can change this if the task started earlier.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="due_date">Due Date *</Label>
                                    <Input
                                        id="due_date"
                                        type="date"
                                        value={formData.due_date}
                                        onChange={e => handleInputChange('due_date', e.target.value)}
                                        className={validationErrors.due_date ? 'border-red-500' : ''}
                                        disabled={isTaskCompletedOrCanceled}
                                        required
                                    />
                                    {validationErrors.due_date && (
                                        <p className="text-red-500 text-sm mt-1">{validationErrors.due_date}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="priority_order">Priority Order</Label>
                                    <Input
                                        id="priority_order"
                                        type="number"
                                        min="1"
                                        value={formData.priority_order}
                                        onChange={e => handleInputChange('priority_order', e.target.value ? parseInt(e.target.value, 10) : '')}
                                        placeholder="e.g. 1"
                                        disabled={isTaskCompletedOrCanceled}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="estimated_time_minutes">Εκτιμώμενος Χρόνος (λεπτά) *</Label>
                                    <Input
                                        id="estimated_time_minutes"
                                        type="number"
                                        min="0"
                                        step="5"
                                        value={formData.estimated_time_minutes}
                                        onChange={e => handleInputChange('estimated_time_minutes', parseFloat(e.target.value))}
                                        placeholder="π.χ. 120 (για 2 ώρες)"
                                        disabled={isTaskCompletedOrCanceled}
                                        required
                                        className={validationErrors.estimated_time_minutes ? 'border-red-500' : ''}
                                    />
                                     {validationErrors.estimated_time_minutes && (
                                        <p className="text-red-500 text-sm mt-1">{validationErrors.estimated_time_minutes}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={formData.status || 'Pending'} // Fix: ensure a default value
                                        onValueChange={value => handleInputChange('status', value)}
                                        disabled={isTaskCompletedOrCanceled}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="In Progress">In Progress</SelectItem>
                                            <SelectItem value="On Hold">On Hold</SelectItem>
                                            <SelectItem value="Completed">Completed</SelectItem>
                                            <SelectItem value="Canceled">Canceled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {task && task.total_time_spent_minutes > 0 && (
                                    <div>
                                        <Label htmlFor="total_time_spent">Συνολικός Χρόνος (λεπτά)</Label>
                                        <Input
                                            id="total_time_spent"
                                            value={task.total_time_spent_minutes || 0}
                                            disabled
                                            className="bg-gray-100"
                                        />
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="recurrence" className="space-y-4 mt-4">
                            <div className="flex items-center space-x-2 mb-4">
                                <Switch
                                    id="is_recurring"
                                    checked={formData.is_recurring}
                                    onCheckedChange={value => handleInputChange('is_recurring', value)}
                                    disabled={isTaskCompletedOrCanceled}
                                />
                                <Label htmlFor="is_recurring">Is this a regular/recurring task?</Label>
                            </div>

                            {formData.is_recurring && (
                                <div className="space-y-4 pl-6 border-l-2 border-blue-100">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="recurrence_start_date">Recurrence Start Date</Label>
                                            <Input
                                                id="recurrence_start_date"
                                                type="date"
                                                value={formData.recurrence_start_date}
                                                onChange={e => handleInputChange('recurrence_start_date', e.target.value)}
                                                className={validationErrors.recurrence_start_date ? 'border-red-500' : ''}
                                                disabled={isTaskCompletedOrCanceled}
                                            />
                                            {validationErrors.recurrence_start_date && (
                                                <p className="text-red-500 text-sm mt-1">{validationErrors.recurrence_start_date}</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label htmlFor="current_occurrence">Current Occurrence</Label>
                                            <Input
                                                id="current_occurrence"
                                                type="number"
                                                min="1"
                                                value={formData.current_occurrence}
                                                onChange={e => handleInputChange('current_occurrence', parseInt(e.target.value) || 1)}
                                                disabled={isTaskCompletedOrCanceled}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="recurrence_pattern">Recurrence Pattern</Label>
                                        <Select
                                            value={formData.recurrence_pattern || 'Daily'} // Fix: ensure a default value
                                            onValueChange={value => handleInputChange('recurrence_pattern', value)}
                                            disabled={isTaskCompletedOrCanceled}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Daily">Daily</SelectItem>
                                                <SelectItem value="Weekly">Weekly</SelectItem>
                                                <SelectItem value="Monthly">Monthly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Weekly Configuration */}
                                    {formData.recurrence_pattern === 'Weekly' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="recurrence_day_of_week">Day of Week</Label>
                                                <Select
                                                    value={formData.recurrence_day_of_week || 'MONDAY'} // Fix: ensure a default value
                                                    onValueChange={value => handleInputChange('recurrence_day_of_week', value)}
                                                    disabled={isTaskCompletedOrCanceled}
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {DAYS_OF_WEEK.map(day => (
                                                            <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="recurrence_interval_weekly">Every X week(s)</Label>
                                                <Input
                                                    id="recurrence_interval_weekly"
                                                    type="number"
                                                    min="1"
                                                    max="52"
                                                    value={formData.recurrence_interval || 1}
                                                    onChange={e => handleInputChange('recurrence_interval', parseInt(e.target.value) || 1)}
                                                    disabled={isTaskCompletedOrCanceled}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Monthly Configuration */}
                                    {formData.recurrence_pattern === 'Monthly' && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="monthly_recurrence_type">Monthly Recurrence Type *</Label>
                                                <Select
                                                    value={formData.monthly_recurrence_type || 'DAY_OF_MONTH'} // Fix: ensure a default value
                                                    onValueChange={value => handleInputChange('monthly_recurrence_type', value)}
                                                    disabled={isTaskCompletedOrCanceled}
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="DAY_OF_MONTH">Specific Day of Month</SelectItem>
                                                        <SelectItem value="DAY_OF_WEEK">Specific Day of Week</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {formData.monthly_recurrence_type === 'DAY_OF_MONTH' ? (
                                                <div className="flex items-center space-x-2">
                                                    <Label className="flex items-center gap-2">
                                                        Day
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max="31"
                                                            value={formData.recurrence_day_of_month || 1}
                                                            onChange={e => handleInputChange('recurrence_day_of_month', parseInt(e.target.value) || 1)}
                                                            className="w-16 h-8"
                                                            disabled={isTaskCompletedOrCanceled}
                                                        />
                                                        of every
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max="12"
                                                            value={formData.recurrence_interval || 1}
                                                            onChange={e => handleInputChange('recurrence_interval', parseInt(e.target.value) || 1)}
                                                            className="w-16 h-8"
                                                            disabled={isTaskCompletedOrCanceled}
                                                        />
                                                        month(s)
                                                    </Label>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        The
                                                        <Select
                                                            value={formData.recurrence_ordinal || 'FIRST'} // Fix: ensure a default value
                                                            onValueChange={value => handleInputChange('recurrence_ordinal', value)}
                                                            disabled={isTaskCompletedOrCanceled}
                                                        >
                                                            <SelectTrigger className="w-20 h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {ORDINALS.map(ordinal => (
                                                                    <SelectItem key={ordinal.value} value={ordinal.value}>{ordinal.label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Select
                                                            value={formData.recurrence_day_of_week || 'MONDAY'} // Fix: ensure a default value
                                                            onValueChange={value => handleInputChange('recurrence_day_of_week', value)}
                                                            disabled={isTaskCompletedOrCanceled}
                                                        >
                                                            <SelectTrigger className="w-24 h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {DAYS_OF_WEEK.map(day => (
                                                                    <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        of every
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max="12"
                                                            value={formData.recurrence_interval || 1}
                                                            onChange={e => handleInputChange('recurrence_interval', parseInt(e.target.value) || 1)}
                                                            className="w-16 h-8"
                                                            disabled={isTaskCompletedOrCanceled}
                                                        />
                                                        month(s)
                                                    </Label>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* End Condition */}
                                    <div className="space-y-4 border-t pt-4">
                                        <h4 className="font-medium text-slate-700">End Condition (optional):</h4>

                                        <div>
                                            <Label htmlFor="recurrence_end_date">End Date</Label>
                                            <Input
                                                id="recurrence_end_date"
                                                type="date"
                                                value={formData.recurrence_end_date}
                                                onChange={e => handleInputChange('recurrence_end_date', e.target.value)}
                                                className={validationErrors.recurrence_end_date ? 'border-red-500' : ''}
                                                disabled={isTaskCompletedOrCanceled}
                                            />
                                            {validationErrors.recurrence_end_date && (
                                                <p className="text-red-500 text-sm mt-1">{validationErrors.recurrence_end_date}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="max_occurrences">OR Maximum Occurrences</Label>
                                            <Input
                                                id="max_occurrences"
                                                type="number"
                                                min="1"
                                                value={formData.max_occurrences}
                                                onChange={e => handleInputChange('max_occurrences', e.target.value ? parseInt(e.target.value, 10) : '')}
                                                placeholder="e.g. 10"
                                                className={validationErrors.max_occurrences ? 'border-red-500' : ''}
                                                disabled={isTaskCompletedOrCanceled}
                                            />
                                            {validationErrors.max_occurrences && (
                                                <p className="text-red-500 text-sm mt-1">{validationErrors.max_occurrences}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Recurrence Description */}
                                    {getRecurrenceDescription() && (
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertDescription>
                                                <strong>Recurrence:</strong> {getRecurrenceDescription()}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="progress_attachments" className="space-y-4 mt-4">
                            <div className="pt-4 pb-6">
                                <Label htmlFor="completion_percentage" className="block mb-4">
                                    Completion Percentage: {formData.completion_percentage}%
                                </Label>
                                <div className="px-2 py-4">
                                    <Slider
                                        id="completion_percentage"
                                        min={0}
                                        max={100}
                                        step={5}
                                        value={[formData.completion_percentage]}
                                        onValueChange={handleCompletionPercentageChange}
                                        className="w-full"
                                        disabled={isTaskCompletedOrCanceled}
                                    />
                                </div>
                            </div>

                            {/* Show time spent input when editing an existing task and a change that merits time tracking occurred */}
                            {task && (progressNotes.trim() || formData.completion_percentage !== originalCompletionPercentage || timeSpentForUpdate !== '') && (
                                <div>
                                    <Label htmlFor="time_spent_for_update">Time Spent for this update (minutes)</Label>
                                    <Input
                                        id="time_spent_for_update"
                                        type="number"
                                        min="0"
                                        step="5"
                                        value={timeSpentForUpdate}
                                        onChange={e => setTimeSpentForUpdate(e.target.value)}
                                        placeholder="e.g. 30"
                                        disabled={isTaskCompletedOrCanceled}
                                    />
                                </div>
                            )}

                            {task && ( // Only show progress notes for existing tasks
                                <div>
                                    <Label htmlFor="progress_notes">Progress Notes (Optional)</Label>
                                    <Textarea
                                        id="progress_notes"
                                        value={progressNotes}
                                        onChange={e => setProgressNotes(e.target.value)}
                                        placeholder="What progress was made? Any blockers?"
                                        rows={3}
                                        disabled={isTaskCompletedOrCanceled}
                                    />
                                </div>
                            )}

                            {/* Attachments Section */}
                            <div className="border-t pt-4">
                                <Label>Attachments</Label>
                                <div className="mt-2 space-y-2">
                                    {formData.attachments?.map((attachment, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-slate-50">
                                            <div className="flex items-center gap-2">
                                                <File className="w-4 h-4 text-slate-500" />
                                                <a
                                                    href={attachment.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-blue-600 hover:underline"
                                                    download={attachment.filename}
                                                >
                                                    {attachment.filename}
                                                </a>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveAttachment(index)}
                                                className="h-6 w-6"
                                                disabled={isTaskCompletedOrCanceled}
                                            >
                                                <XIcon className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2">
                                    <Label
                                        htmlFor="file-upload"
                                        className={`flex items-center justify-center w-full px-4 py-2 border-2 border-dashed rounded-md cursor-pointer hover:bg-slate-50 ${isTaskCompletedOrCanceled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                <span>Uploading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4 mr-2" />
                                                <span>Add Attachment</span>
                                            </>
                                        )}
                                    </Label>
                                    <Input
                                        id="file-upload"
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => handleFileUpload(e.target.files[0])}
                                        disabled={isUploading || isTaskCompletedOrCanceled}
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isSaving || isTaskCompletedOrCanceled}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save Task'}
                        </Button>
                    </DialogFooter>
                </form>

                {/* TimeSpentDialog for completion percentage changes */}
                {showTimeSpentDialog && pendingCompletionUpdate && (
                    <TimeSpentDialog
                        open={showTimeSpentDialog}
                        onClose={handleTimeSpentCancel}
                        onSubmit={handleTimeSpentSubmit}
                        task={pendingCompletionUpdate.task}
                        newCompletionPercentage={pendingCompletionUpdate.newPercentage}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
