
import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Edit, History, CheckCircle, AlertOctagon, Eye, Repeat, CalendarX2, Ban, RotateCcw, ArrowUp, ArrowDown, Repeat1, Star } from 'lucide-react';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { UserTask } from '@/entities/UserTask';
import { UserTaskLog } from '@/entities/UserTaskLog';
import { UserTaskCategory } from '@/entities/UserTaskCategory';
import { WatchedTask } from '@/entities/WatchedTask';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AdvancedColumnFilter from "../templates/AdvancedColumnFilter";
import DateRangeFilter from "../bsorder/DateRangeFilter";
import StatusFilter from './StatusFilter';
import PriorityFilter from './PriorityFilter';
import TimeSpentDialog from './TimeSpentDialog';
import { calculateNextDueDate, shouldUpdateDueDate, calculateRecurrenceTaskActualNextDueDate } from '@/components/lib/recurrenceUtils';

// Helper to get local YYYY-MM-DD string to avoid timezone issues
const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to parse YYYY-MM-DD string into a Date object at local midnight
const parseDateStringAsLocalDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export default function UserTaskTable({
    tasks,
    onEdit,
    onUpdate,
    onHistory,
    isLoading,
    columnFilters = {},
    setColumnFilters,
    currentUser,
    dailyReportStatus,
    daysNotReportedStreakData,
    sortColumn,
    sortDirection,
    onSortChange,
    isRecurrenceTasksView = false,
    isWatchedTasksView = false,
    onViewDetails,
    watchedTaskIds, // Now a prop, set of all task IDs watched by anyone
    allWatchedTaskRecords, // Now a prop, array of all WatchedTask objects
    onWatchedTasksUpdate // Now a prop, callback to refresh watched tasks in parent
}) {
    const [editingProgressId, setEditingProgressId] = useState(null);
    const [progressValue, setProgressValue] = useState('');
    const [showTimeSpentDialog, setShowTimeSpentDialog] = useState(false);
    const [pendingProgressUpdate, setPendingProgressUpdate] = useState(null);
    const [taskCategories, setTaskCategories] = useState({});

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const cats = await UserTaskCategory.list();
                const catMap = cats.reduce((acc, cat) => {
                    acc[cat.name] = cat.color_code;
                    return acc;
                }, {});
                setTaskCategories(catMap);
            } catch (error) {
                console.error("Failed to load task categories", error);
            }
        };
        fetchCategories();
    }, []);

    const handleToggleWatchTask = async (taskId) => { // Renamed function
        if (!currentUser?.email) return;

        try {
            // Check if this specific user (currentUser) has watched this task
            const isWatchedByCurrentUser = allWatchedTaskRecords.some(
                record => record.watcher_user_email === currentUser.email && record.watched_task_id === taskId
            );

            if (isWatchedByCurrentUser) {
                // Unwatch: find and delete the WatchedTask record for current user
                const myWatchedTaskRecord = allWatchedTaskRecords.find(
                    record => record.watcher_user_email === currentUser.email && record.watched_task_id === taskId
                );

                if (myWatchedTaskRecord) {
                    await WatchedTask.delete(myWatchedTaskRecord.id);
                }
            } else {
                // Watch: create new WatchedTask record for current user
                await WatchedTask.create({
                    watcher_user_email: currentUser.email,
                    watched_task_id: taskId
                });
            }

            // Refresh all watched task records to update the UI via parent component
            if (onWatchedTasksUpdate) {
                onWatchedTasksUpdate();
            }
        } catch (error) {
            console.error("Failed to toggle watched task:", error);
            alert("Failed to update watched status. Please try again.");
        }
    };

    const priorityColors = {
        High: 'bg-red-100 text-red-800 border-red-200',
        Medium: 'bg-slate-100 text-slate-600 border-slate-200',
        Low: 'bg-slate-100 text-slate-600 border-slate-200',
    };

    const statusColors = {
      'Pending': 'bg-slate-100 text-slate-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'On Hold': 'bg-orange-100 text-orange-800',
      'Completed': 'bg-green-100 text-green-800',
    };

    const formatMinutes = (minutes) => {
        if (minutes === null || minutes === undefined || minutes === 0) return '0λ';
        if (minutes < 60) return `${minutes}λ`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) return `${hours}ώ`;
        return `${hours}ώ ${remainingMinutes}λ`;
    };

    const getTimeCompletionPercentage = (task) => {
        if (!task.estimated_time_minutes || task.estimated_time_minutes === 0) return null;
        return Math.round((task.total_time_spent_minutes || 0) / task.estimated_time_minutes * 100);
    };

    const updateTaskAndLog = async (task, updateData, logNotes) => {
        const currentStreakForTask = daysNotReportedStreakData[task.id] || 0;

        let newTotalDaysNotReported = task.total_days_not_reported || 0;

        if (['Pending', 'In Progress'].includes(task.status) && currentStreakForTask > 0) {
            newTotalDaysNotReported += currentStreakForTask;
        }

        // For recurrence tasks, update due_date to next occurrence when progress is reported
        let dueDateUpdate = {};
        if (task.is_recurring && logNotes && !logNotes.toLowerCase().includes('no progress') && task.status !== 'Completed') {
            const nextDue = calculateNextDueDate(task);
            if (nextDue && parseDateStringAsLocalDate(nextDue)?.getTime() !== parseDateStringAsLocalDate(task.due_date)?.getTime()) {
                dueDateUpdate.due_date = nextDue;
                // Reset days not reported since we're moving to next occurrence
                newTotalDaysNotReported = 0;
            }
        }

        const cumulativeUpdate = {
            ...updateData,
            ...dueDateUpdate,
            total_days_not_reported: newTotalDaysNotReported,
            last_reported_date: getLocalDateString(new Date())
        };

        await UserTask.update(task.id, cumulativeUpdate);

        if (logNotes) {
             await UserTaskLog.create({
                user_task_id: task.id,
                progress_notes: logNotes,
                status_at_log_time: cumulativeUpdate.status || task.status
            });
        }

        onUpdate(task.id, cumulativeUpdate);
    };

    const handleMarkComplete = async (task) => {
        const updateData = {
            status: 'Completed',
            completion_percentage: 100,
            completion_date: getLocalDateString(new Date()),
        };
        await updateTaskAndLog(task, updateData, "Task marked as complete.");
    };

    const handleReopenTask = async (task) => {
        const updateData = {
            status: 'In Progress',
            completion_date: null,
            reopen_count: (task.reopen_count || 0) + 1,
        };
        await updateTaskAndLog(task, updateData, "Task reopened.");
    };

    const handleNoProgress = async (task) => {
        // Check if "No progress" has already been logged today for this task
        const today = getLocalDateString(new Date());
        const existingLogs = await UserTaskLog.filter({ user_task_id: task.id });

        const hasNoProgressToday = existingLogs.some(log => {
            const logDate = log.created_date ? log.created_date.split('T')[0] : null;
            return logDate === today && log.progress_notes && log.progress_notes.toLowerCase().includes("no progress");
        });

        if (hasNoProgressToday) {
            alert("No progress has already been logged for this task today.");
            return;
        }

        await updateTaskAndLog(task, {}, "No progress reported for today.");
    };

    const handleProgressEdit = (task) => {
        if (task.status === 'Completed') return;
        setEditingProgressId(task.id);
        setProgressValue(task.completion_percentage || 0);
    };

    const handleProgressSave = async (task) => {
        let value = parseInt(progressValue, 10);
        if (isNaN(value) || value < 0) value = 0;
        if (value > 100) value = 100;

        // If progress changed, show time tracking dialog
        if (value !== (task.completion_percentage || 0)) {
            setPendingProgressUpdate({
                task: task,
                newPercentage: value
            });
            setShowTimeSpentDialog(true);
        }
        setEditingProgressId(null);
    };

    const handleTimeSpentSubmit = async (timeData) => {
        if (!pendingProgressUpdate) return;

        const { task, newPercentage } = pendingProgressUpdate;
        const currentStreakForTask = daysNotReportedStreakData[task.id] || 0;

        let newTotalDaysNotReported = task.total_days_not_reported || 0;
        if (['Pending', 'In Progress'].includes(task.status) && currentStreakForTask > 0) {
            newTotalDaysNotReported += currentStreakForTask;
        }

        const newTotalTimeSpent = (task.total_time_spent_minutes || 0) + timeData.timeSpentMinutes;

        // For recurrence tasks, check if we should update due_date when meaningful progress is reported
        let dueDateUpdate = {};
        if (task.is_recurring && timeData.timeSpentMinutes > 0 && task.status !== 'Completed') {
            const nextDue = calculateNextDueDate(task);
            if (nextDue && parseDateStringAsLocalDate(nextDue)?.getTime() !== parseDateStringAsLocalDate(task.due_date)?.getTime()) {
                dueDateUpdate.due_date = nextDue;
                // Reset days not reported since we're moving to next occurrence
                newTotalDaysNotReported = 0;
            }
        }

        const updateData = {
            completion_percentage: newPercentage,
            total_time_spent_minutes: newTotalTimeSpent,
            total_days_not_reported: newTotalDaysNotReported,
            last_reported_date: getLocalDateString(new Date()),
            ...dueDateUpdate
        };

        await UserTask.update(task.id, updateData);

        // Create log entry with time spent
        let logNotes = timeData.notes || `Completion updated to ${newPercentage}% directly from table.`;
        if (timeData.timeSpentMinutes > 0) {
            logNotes += ` (Time spent: ${timeData.timeSpentMinutes} minutes)`;
        }

        await UserTaskLog.create({
            user_task_id: task.id,
            progress_notes: logNotes,
            status_at_log_time: updateData.status || task.status,
            time_spent_in_log_minutes: timeData.timeSpentMinutes
        });

        onUpdate(task.id, updateData);
        setPendingProgressUpdate(null);
        setShowTimeSpentDialog(false);
    };

    const handleTimeSpentCancel = () => {
        setPendingProgressUpdate(null);
        setShowTimeSpentDialog(false);
    };

    const handleHistoryView = async (task) => {
        if (currentUser?.email === task.assigned_to_user_email && task.has_unseen_external_changes) {
            UserTask.update(task.id, { has_unseen_external_changes: false });
            onUpdate(task.id, { has_unseen_external_changes: false });
        }
        onHistory(task);
    };

    const handleFilterApply = (columnKey, filterValue) => {
        setColumnFilters(prev => {
            const newFilters = { ...prev };
            if (filterValue) {
                newFilters[columnKey] = filterValue;
            } else {
                delete newFilters[columnKey];
            }
            return newFilters;
        });
    };

    const handleDateRangeFilter = (columnKey, dateRange) => {
        setColumnFilters(prev => {
            const newFilters = { ...prev };
            if (dateRange && (dateRange.startDate || dateRange.endDate)) {
                newFilters[columnKey] = dateRange;
            } else {
                delete newFilters[columnKey];
            }
            return newFilters;
        });
    };

    const getDaysDue = (dueDate) => {
        if (!dueDate) return null;
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const due = parseDateStringAsLocalDate(dueDate);

        const diffDays = differenceInDays(due, startOfToday);

        if (diffDays > 0) {
            return `${diffDays} days left`;
        } else if (diffDays === 0) {
            return 'Due today';
        } else {
            return `${Math.abs(diffDays)} days overdue`;
        }
    };

    const getRecurrenceDisplay = (task) => {
        if (!task.is_recurring || task.recurrence_pattern === 'None') return 'N/A';

        const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();

        switch (task.recurrence_pattern) {
            case 'Daily':
                return 'Daily';
            case 'Weekly':
                const dayLabel = task.recurrence_day_of_week ? capitalizeFirstLetter(task.recurrence_day_of_week) : 'Monday';
                const interval = task.recurrence_interval || 1;
                return interval === 1 ? `Weekly (${dayLabel})` : `Every ${interval} weeks (${dayLabel})`;
            case 'Monthly':
                const monthInterval = task.recurrence_interval || 1;
                const monthText = monthInterval === 1 ? 'month' : `${monthInterval} months`;

                if (task.monthly_recurrence_type === 'DAY_OF_MONTH') {
                    return `Monthly (Day ${task.recurrence_day_of_month || 1} of every ${monthText})`;
                } else {
                    const ordinal = task.recurrence_ordinal ? capitalizeFirstLetter(task.recurrence_ordinal) : 'First';
                    const day = task.recurrence_day_of_week ? capitalizeFirstLetter(task.recurrence_day_of_week) : 'Monday';
                    return `Monthly (${ordinal} ${day} of every ${monthText})`;
                }
            default:
                return task.recurrence_pattern;
        }
    };

    if (isLoading) {
        return <div>Loading tasks...</div>;
    }

    if (tasks.length === 0) {
        return <p className="text-slate-500 text-center py-8">No tasks found.</p>;
    }

    return (
        <TooltipProvider>
        <div className="w-full">
            <div className="overflow-x-auto max-w-full border rounded-md">
                <div style={{ minWidth: '1800px' }}>
                    <Table className="table-fixed w-full">
                        <TableHeader>
                            <TableRow>
                                {/* Priority Order */}
                                <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '90px' }}>
                                    <div className="flex items-center gap-2">
                                        <span>Order</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => onSortChange('priority_order')}
                                        >
                                            {sortColumn === 'priority_order' ? (
                                                sortDirection === 'desc' ? (
                                                    <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUp className="w-3 h-3" />
                                                )
                                            ) : (
                                                <ArrowDown className="w-3 h-3 opacity-30" />
                                            )}
                                        </Button>
                                    </div>
                                </TableHead>

                                {/* Task */}
                                <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '250px' }}>
                                    <div className="flex items-center gap-2">
                                        <span>Task</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => onSortChange('title')}
                                        >
                                            {sortColumn === 'title' ? (
                                                sortDirection === 'desc' ? (
                                                    <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUp className="w-3 h-3" />
                                                )
                                            ) : (
                                                <ArrowDown className="w-3 h-3 opacity-30" />
                                            )}
                                        </Button>
                                        <AdvancedColumnFilter
                                            columnKey="title"
                                            columnLabel="Task"
                                            onApplyFilter={handleFilterApply}
                                            tasks={tasks}
                                        />
                                    </div>
                                </TableHead>

                                {/* Show Assigned To column in watched tasks view */}
                                {isWatchedTasksView && (
                                    <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '150px' }}>
                                        <div className="flex items-center gap-2">
                                            <span>Assigned To</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => onSortChange('assigned_to_user_email')}
                                            >
                                                {sortColumn === 'assigned_to_user_email' ? (
                                                    sortDirection === 'desc' ? (
                                                        <ArrowDown className="w-3 h-3" />
                                                    ) : (
                                                        <ArrowUp className="w-3 h-3" />
                                                    )
                                                ) : (
                                                    <ArrowDown className="w-3 h-3 opacity-30" />
                                                )}
                                            </Button>
                                        </div>
                                    </TableHead>
                                )}

                                {/* Status */}
                                <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '120px' }}>
                                    <div className="flex items-center gap-2">
                                        <span>Status</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => onSortChange('status')}
                                        >
                                            {sortColumn === 'status' ? (
                                                sortDirection === 'desc' ? (
                                                    <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUp className="w-3 h-3" />
                                                )
                                            ) : (
                                                <ArrowDown className="w-3 h-3 opacity-30" />
                                            )}
                                        </Button>
                                        <StatusFilter
                                            columnKey="status"
                                            columnLabel="Status"
                                            onApplyFilter={handleFilterApply}
                                            currentFilterValue={columnFilters.status}
                                        />
                                    </div>
                                </TableHead>
                                {/* Priority */}
                                <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '110px' }}>
                                    <div className="flex items-center gap-2">
                                        <span>Priority</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => onSortChange('priority')}
                                        >
                                            {sortColumn === 'priority' ? (
                                                sortDirection === 'desc' ? (
                                                    <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUp className="w-3 h-3" />
                                                )
                                            ) : (
                                                <ArrowDown className="w-3 h-3 opacity-30" />
                                            )}
                                        </Button>
                                        <PriorityFilter
                                            columnKey="priority"
                                            columnLabel="Priority"
                                            onApplyFilter={handleFilterApply}
                                            currentFilterValue={columnFilters.priority}
                                        />
                                    </div>
                                </TableHead>

                                {/* Category */}
                                <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '120px' }}>
                                    <div className="flex items-center gap-2">
                                        <span>Category</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => onSortChange('category')}
                                        >
                                            {sortColumn === 'category' ? (
                                                sortDirection === 'desc' ? (
                                                    <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUp className="w-3 h-3" />
                                                )
                                            ) : (
                                                <ArrowDown className="w-3 h-3 opacity-30" />
                                            )}
                                        </Button>
                                        <AdvancedColumnFilter
                                            columnKey="category"
                                            columnLabel="Category"
                                            onApplyFilter={handleFilterApply}
                                            tasks={tasks}
                                        />
                                    </div>
                                </TableHead>

                                {/* RECURRENCE TASKS - Specific Columns */}
                                {isRecurrenceTasksView && (
                                    <>
                                        <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '200px' }}>
                                            <div className="flex items-center gap-2">
                                                <span>Recurrence</span>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onSortChange('recurrence_pattern')}>
                                                    {sortColumn === 'recurrence_pattern' ? (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />) : (<ArrowDown className="w-3 h-3 opacity-30" />)}
                                                </Button>
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '110px' }}>
                                            <div className="flex items-center gap-2">
                                                <span>Last Reported</span>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onSortChange('last_reported_date')}>
                                                    {sortColumn === 'last_reported_date' ? (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />) : (<ArrowDown className="w-3 h-3 opacity-30" />)}
                                                </Button>
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '90px' }}>
                                            <div className="flex items-center gap-2">
                                                <span>Occurrence</span>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onSortChange('current_occurrence')}>
                                                    {sortColumn === 'current_occurrence' ? (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />) : (<ArrowDown className="w-3 h-3 opacity-30" />)}
                                                </Button>
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '110px' }}>
                                            <div className="flex items-center gap-2">
                                                <span>Next Due Date</span>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onSortChange('_next_calculated_due_date_')}>
                                                    {sortColumn === '_next_calculated_due_date_' ? (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />) : (<ArrowDown className="w-3 h-3 opacity-30" />)}
                                                </Button>
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '90px' }}>
                                            <div className="flex items-center gap-2">
                                                <span className="whitespace-pre-line">Days{'\n'}Due</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() => onSortChange('_days_due_')}
                                                >
                                                    {sortColumn === '_days_due_' ? (
                                                        sortDirection === 'desc' ? (
                                                            <ArrowDown className="w-3 h-3" />
                                                        ) : (
                                                            <ArrowUp className="w-3 h-3" />
                                                        )
                                                    ) : (
                                                        <ArrowDown className="w-3 h-3 opacity-30" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '90px' }}>
                                            <div className="flex items-center gap-2">
                                                <span className="whitespace-pre-line">Total Days{'\n'}Skipped</span>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onSortChange('total_days_not_reported')}>
                                                    {sortColumn === 'total_days_not_reported' ? (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />) : (<ArrowDown className="w-3 h-3 opacity-30" />)}
                                                </Button>
                                            </div>
                                        </TableHead>
                                    </>
                                )}

                                {/* Days Active - Common to both */}
                                <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '90px' }}>
                                   <div className="flex items-center gap-2">
                                        <span className="whitespace-pre-line">Days{'\n'}Active</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => onSortChange('_days_active_')}
                                        >
                                            {sortColumn === '_days_active_' ? (
                                                sortDirection === 'desc' ? (
                                                    <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUp className="w-3 h-3" />
                                                )
                                            ) : (
                                                <ArrowDown className="w-3 h-3 opacity-30" />
                                            )}
                                        </Button>
                                   </div>
                                </TableHead>

                                {/* AD-HOC TASKS - Specific Columns */}
                                {!isRecurrenceTasksView && (
                                    <>
                                        <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '110px' }}>
                                           <div className="flex items-center gap-2">
                                                <span>Due Date</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() => onSortChange('due_date')}
                                                >
                                                    {sortColumn === 'due_date' ? (
                                                        sortDirection === 'desc' ? (
                                                            <ArrowDown className="w-3 h-3" />
                                                        ) : (
                                                            <ArrowUp className="w-3 h-3" />
                                                        )
                                                    ) : (
                                                        <ArrowDown className="w-3 h-3 opacity-30" />
                                                    )}
                                                </Button>
                                                <DateRangeFilter
                                                    columnKey="due_date"
                                                    columnLabel="Due Date"
                                                    onApplyFilter={handleDateRangeFilter}
                                                />
                                           </div>
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '90px' }}>
                                            <div className="flex items-center gap-2">
                                                <span className="whitespace-pre-line">Days{'\n'}Due</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() => onSortChange('_days_due_')}
                                                >
                                                    {sortColumn === '_days_due_' ? (
                                                        sortDirection === 'desc' ? (
                                                            <ArrowDown className="w-3 h-3" />
                                                        ) : (
                                                            <ArrowUp className="w-3 h-3" />
                                                        )
                                                    ) : (
                                                        <ArrowDown className="w-3 h-3 opacity-30" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableHead>
                                    </>
                                )}

                                {/* Days Not Reported - Common to both */}
                                <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '90px' }}>
                                    <div className="flex items-center gap-2">
                                        <span className="whitespace-pre-line">{isRecurrenceTasksView ? 'Days Since{\n}Last Report' : 'Days Not{\n}Reported'}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => onSortChange('_days_not_reported_')}
                                        >
                                            {sortColumn === '_days_not_reported_' ? (
                                                sortDirection === 'desc' ? (
                                                    <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUp className="w-3 h-3" />
                                                )
                                            ) : (
                                                <ArrowDown className="w-3 h-3 opacity-30" />
                                            )}
                                        </Button>
                                    </div>
                                </TableHead>

                                {/* AD-HOC TASKS - Specific Columns */}
                                {!isRecurrenceTasksView && (
                                    <>
                                        <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '90px' }}>
                                            <div className="flex items-center gap-2">
                                                <span>Reopens</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() => onSortChange('reopen_count')}
                                                >
                                                    {sortColumn === 'reopen_count' ? (
                                                        sortDirection === 'desc' ? (
                                                            <ArrowDown className="w-3 h-3" />
                                                        ) : (
                                                            <ArrowUp className="w-3 h-3" />
                                                        )
                                                    ) : (
                                                        <ArrowDown className="w-3 h-3 opacity-30" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '90px' }}>
                                            <div className="flex items-center gap-2">
                                                <span className="whitespace-pre-line">Due Date{'\n'}Changes</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() => onSortChange('due_date_change_count')}
                                                >
                                                    {sortColumn === 'due_date_change_count' ? (
                                                        sortDirection === 'desc' ? (
                                                            <ArrowDown className="w-3 h-3" />
                                                        ) : (
                                                            <ArrowUp className="w-3 h-3" />
                                                        )
                                                    ) : (
                                                        <ArrowDown className="w-3 h-3 opacity-30" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableHead>
                                    </>
                                )}

                                {/* Time Tracking Columns */}
                                <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '100px' }}>
                                    <div className="flex items-center gap-2">
                                        <span className="whitespace-pre-line">Εκτιμώμενος{'\n'}Χρόνος</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => onSortChange('estimated_time_minutes')}
                                        >
                                            {sortColumn === 'estimated_time_minutes' ? (
                                                sortDirection === 'desc' ? (
                                                    <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUp className="w-3 h-3" />
                                                )
                                            ) : (
                                                <ArrowDown className="w-3 h-3 opacity-30" />
                                            )}
                                        </Button>
                                    </div>
                                </TableHead>
                                <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '100px' }}>
                                    <div className="flex items-center gap-2">
                                        <span className="whitespace-pre-line">Συνολικός{'\n'}Χρόνος</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => onSortChange('total_time_spent_minutes')}
                                        >
                                            {sortColumn === 'total_time_spent_minutes' ? (
                                                sortDirection === 'desc' ? (
                                                    <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUp className="w-3 h-3" />
                                                )
                                            ) : (
                                                <ArrowDown className="w-3 h-3 opacity-30" />
                                            )}
                                        </Button>
                                    </div>
                                </TableHead>
                                <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '100px' }}>
                                    <div className="flex items-center gap-2">
                                        <span className="whitespace-pre-line">% Χρόνου{'\n'}Ολοκλήρωσης</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => onSortChange('_time_completion_percentage_')}
                                        >
                                            {sortColumn === '_time_completion_percentage_' ? (
                                                sortDirection === 'desc' ? (
                                                    <ArrowDown className="w-3 h-3" />
                                                ) : (
                                                    <ArrowUp className="w-3 h-3" />
                                                )
                                            ) : (
                                                <ArrowDown className="w-3 h-3 opacity-30" />
                                            )}
                                        </Button>
                                    </div>
                                </TableHead>

                                {/* Common to both */}
                                <TableHead className="font-semibold text-slate-700 p-2 align-top" style={{ width: '150px' }}>
                                    <span>Πρόοδος</span>
                                </TableHead>
                                <TableHead className="p-2 align-top" style={{ width: '180px' }}>
                                    <div className="h-6 w-6">Actions</div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.map(task => {
                                const parsedDueDate = parseDateStringAsLocalDate(task.due_date);
                                const isOverdue = parsedDueDate && isPast(parsedDueDate) && !isToday(parsedDueDate);
                                const needsReportToday = dailyReportStatus && dailyReportStatus[task.id];

                                // NEW: Check if this task is watched by ANYONE (from prop)
                                const isWatchedByAnyone = watchedTaskIds.has(task.id);

                                // NEW: Check if current user is the owner (disable star interaction for owners)
                                const isCurrentUserOwner = currentUser?.email === task.assigned_to_user_email;

                                // NEW: Check if current user specifically has starred this task (from prop records)
                                const isWatchedByCurrentUser = allWatchedTaskRecords.some(
                                    record => record.watcher_user_email === currentUser?.email && record.watched_task_id === task.id
                                );

                                const daysActive = Math.floor((new Date() - new Date(task.created_date)) / (1000 * 60 * 60 * 24));
                                const daysDueText = getDaysDue(task.due_date);

                                return (
                                    <TableRow
                                        key={task.id}
                                        className={`transition-colors cursor-pointer ${needsReportToday ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50"}`}
                                        onClick={() => onEdit(task)}
                                    >
                                        {/* Priority Order */}
                                        <TableCell className="p-2 align-middle text-center">
                                            {task.priority_order || '-'}
                                        </TableCell>

                                        {/* Task */}
                                        <TableCell className="p-2 align-middle">
                                            <div className="flex items-start gap-2">
                                                {needsReportToday && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <AlertOctagon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>Daily report pending</p></TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {task.has_unseen_external_changes && currentUser?.email === task.assigned_to_user_email && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Eye className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>This task has changes made by another user.</p></TooltipContent>
                                                    </Tooltip>
                                                )}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            className="font-medium text-slate-800 break-words truncate cursor-pointer hover:underline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onViewDetails(task);
                                                            }}
                                                        >
                                                            {task.title}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="max-w-md whitespace-normal">{task.title}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TableCell>

                                        {/* Assigned To (only in watched tasks view) */}
                                        {isWatchedTasksView && (
                                            <TableCell className="p-2 align-middle">
                                                <span className="text-sm">{task.assigned_to_user_email}</span>
                                            </TableCell>
                                        )}

                                        {/* Status */}
                                        <TableCell className="p-2 align-middle">
                                            <Badge className={`${statusColors[task.status]} whitespace-nowrap`}>{task.status}</Badge>
                                        </TableCell>
                                        {/* Priority */}
                                        <TableCell className="p-2 align-middle">
                                            <Badge className={`${task.priority === 'High' ? priorityColors[task.priority] : 'bg-slate-100 text-slate-600 border-slate-200'} whitespace-nowrap`}>
                                                {task.priority}
                                            </Badge>
                                        </TableCell>

                                        {/* Category */}
                                        <TableCell className="p-2 align-middle">
                                            {(() => {
                                                if (!task.category) return <span className="text-slate-400">-</span>;
                                                const color = taskCategories[task.category] || '#A8A29E'; // Default grey if color not found
                                                return (
                                                    <Badge variant="outline" style={{ borderColor: color, color: color }}>
                                                        {task.category}
                                                    </Badge>
                                                );
                                            })()}
                                        </TableCell>

                                        {/* RECURRENCE TASKS - Specific Cells */}
                                        {isRecurrenceTasksView && (
                                            <>
                                                <TableCell className="p-2 align-middle">
                                                    <div className="flex items-center gap-1">
                                                        {task.is_recurring && <Repeat1 className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="text-sm truncate max-w-[180px]">{getRecurrenceDisplay(task)}</span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="max-w-md whitespace-normal">{getRecurrenceDisplay(task)}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-2 align-middle text-center">
                                                    {task.last_reported_date ? format(parseDateStringAsLocalDate(task.last_reported_date), 'dd/MM/yy') : 'Never'}
                                                </TableCell>
                                                <TableCell className="p-2 align-middle text-center">
                                                    <span className="text-sm font-medium">
                                                        {task.current_occurrence || 1}
                                                        {task.max_occurrences && ` / ${task.max_occurrences}`}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="p-2 align-middle text-center">
                                                    {(() => {
                                                        const nextDue = calculateRecurrenceTaskActualNextDueDate(task);

                                                        if (!nextDue) {
                                                            return <span className="text-slate-400 text-sm">Ended</span>;
                                                        }

                                                        const nextDueDate = parseDateStringAsLocalDate(nextDue);
                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);

                                                        const isPastDue = nextDueDate < today;
                                                        const isTodayLocal = nextDueDate.getTime() === today.getTime();

                                                        return (
                                                            <span className={`text-sm font-medium ${
                                                                isPastDue ? 'text-red-600' :
                                                                isTodayLocal ? 'text-orange-600' : 'text-slate-900'
                                                            }`}>
                                                                {format(nextDueDate, 'dd/MM/yy')}
                                                            </span>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell className="p-2 align-middle text-center">
                                                    {(() => {
                                                        const nextDue = calculateRecurrenceTaskActualNextDueDate(task);
                                                        if (!nextDue) return 'N/A';

                                                        const daysDueTextRecurrence = getDaysDue(nextDue);

                                                        return (
                                                            <span className={`text-sm ${daysDueTextRecurrence?.includes('overdue') ? 'text-red-600 font-semibold' : daysDueTextRecurrence?.includes('today') ? 'text-orange-600 font-semibold' : ''}`}>
                                                                {daysDueTextRecurrence || 'N/A'}
                                                            </span>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell className="p-2 align-middle text-center">
                                                    <span className={`${(task.total_days_not_reported || 0) > 3 ? 'text-red-600 font-semibold' : (task.total_days_not_reported || 0) > 1 ? 'text-orange-600 font-medium' : ''}`}>
                                                        {task.total_days_not_reported || 0}
                                                    </span>
                                                </TableCell>
                                            </>
                                        )}

                                        {/* Days Active */}
                                        <TableCell className="p-2 align-middle text-center">
                                            {daysActive}
                                        </TableCell>

                                        {/* AD-HOC TASKS - Specific Cells */}
                                        {!isRecurrenceTasksView && (
                                            <>
                                                <TableCell className={`p-2 align-middle whitespace-nowrap ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                                                    {parsedDueDate ? format(parsedDueDate, 'dd/MM/yy') : 'N/A'}
                                                </TableCell>
                                                <TableCell className={`p-2 align-middle whitespace-nowrap ${daysDueText?.includes('overdue') ? 'text-red-600 font-semibold' : daysDueText?.includes('today') ? 'text-orange-600 font-semibold' : ''}`}>
                                                    {daysDueText || 'N/A'}
                                                </TableCell>
                                            </>
                                        )}

                                        {/* Days Not Reported */}
                                        <TableCell className="p-2 align-middle text-center">
                                            <span className={`${isRecurrenceTasksView ?
                                                ((daysNotReportedStreakData[task.id] || 0) > 7 ? 'text-red-600 font-semibold' :
                                                 (daysNotReportedStreakData[task.id] || 0) > 3 ? 'text-orange-600 font-medium' : '') :
                                                ''}`}>
                                                {daysNotReportedStreakData[task.id] || 0}
                                            </span>
                                        </TableCell>

                                        {/* AD-HOC TASKS - Specific Cells */}
                                        {!isRecurrenceTasksView && (
                                            <>
                                                <TableCell className="p-2 align-middle text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                      {task.reopen_count > 0 && <Repeat className="w-4 h-4 text-slate-500" />}
                                                      <span>{task.reopen_count || 0}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-2 align-middle text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                      {task.due_date_change_count > 0 && <CalendarX2 className="w-4 h-4 text-slate-500" />}
                                                      <span>{task.due_date_change_count || 0}</span>
                                                    </div>
                                                </TableCell>
                                            </>
                                        )}

                                        {/* Time Tracking Cells */}
                                        <TableCell className="p-2 align-middle text-center">
                                            <span className="text-sm">{task.estimated_time_minutes ? formatMinutes(task.estimated_time_minutes) : 'N/A'}</span>
                                        </TableCell>
                                        <TableCell className="p-2 align-middle text-center">
                                            <span className="text-sm">{formatMinutes(task.total_time_spent_minutes || 0)}</span>
                                        </TableCell>
                                        <TableCell className="p-2 align-middle text-center">
                                            {(() => {
                                                const timePercentage = getTimeCompletionPercentage(task);
                                                if (timePercentage === null) return <span className="text-xs text-slate-400">N/A</span>;
                                                return (
                                                    <div className="flex items-center gap-1 justify-center">
                                                        <span className={`text-sm font-medium ${timePercentage > 100 ? 'text-red-600' : 'text-slate-700'}`}>
                                                            {timePercentage}%
                                                        </span>
                                                        {timePercentage > 100 && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="text-xs text-red-500">!</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Time spent exceeds estimated time.</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </TableCell>

                                        {/* Task Progress */}
                                        <TableCell
                                            className="p-2 align-middle"
                                            onClick={(e) => e.stopPropagation()} // Prevent row click when clicking progress
                                        >
                                            {editingProgressId === task.id ? (
                                                <Input
                                                    type="number"
                                                    value={progressValue}
                                                    onChange={(e) => setProgressValue(e.target.value)}
                                                    onBlur={() => handleProgressSave(task)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleProgressSave(task)}
                                                    className="w-20 h-8"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div
                                                    className="flex items-center gap-2 cursor-pointer"
                                                    onClick={() => handleProgressEdit(task)}
                                                >
                                                    <Progress value={task.completion_percentage} className="w-[70%]" />
                                                    <span className="text-xs font-medium">{task.completion_percentage || 0}%</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        {/* Actions */}
                                        <TableCell
                                            className="p-2 align-middle"
                                            onClick={(e) => e.stopPropagation()} // Prevent row click when clicking actions
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleToggleWatchTask(task.id)}
                                                            disabled={isCurrentUserOwner || !currentUser?.email}
                                                            className={`h-8 w-8 ${
                                                                isWatchedByAnyone
                                                                    ? 'text-yellow-500 hover:text-yellow-600'
                                                                    : 'text-slate-400 hover:text-yellow-500'
                                                            } ${isCurrentUserOwner || !currentUser?.email ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <Star className={`w-4 h-4 ${isWatchedByAnyone ? 'fill-current' : ''}`} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {!currentUser?.email ? (
                                                            'Log in to watch tasks'
                                                        ) : isCurrentUserOwner ? (
                                                            'Task owners cannot watch their own tasks'
                                                        ) : isWatchedByCurrentUser ? (
                                                            'Remove from your watched tasks'
                                                        ) : isWatchedByAnyone ? (
                                                            'Watched by others - click to add to your watched tasks'
                                                        ) : (
                                                            'Add to your watched tasks'
                                                        )}
                                                    </TooltipContent>
                                                </Tooltip>

                                                {task.status !== 'Completed' && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" onClick={() => handleNoProgress(task)}>
                                                                <Ban className="w-4 h-4 text-slate-600" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Log 'No Progress' for today</TooltipContent>
                                                    </Tooltip>
                                                )}

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => onViewDetails(task)}>
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>View Details</TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => handleHistoryView(task)}>
                                                            <History className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>View History</TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => onEdit(task)} disabled={task.status === 'Completed'}>
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit Task</TooltipContent>
                                                </Tooltip>

                                                {task.status === 'Completed' ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" onClick={() => handleReopenTask(task)}>
                                                                <RotateCcw className="w-4 h-4 text-blue-600" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Reopen Task</TooltipContent>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleMarkComplete(task)}
                                                                disabled={task.completion_percentage < 100}
                                                            >
                                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {task.completion_percentage < 100 ? 'Task must be 100% complete' : 'Mark as Complete'}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>

            <TimeSpentDialog
                open={showTimeSpentDialog}
                onClose={handleTimeSpentCancel}
                onSubmit={handleTimeSpentSubmit}
                task={pendingProgressUpdate?.task}
                newCompletionPercentage={pendingProgressUpdate?.newPercentage}
            />
        </TooltipProvider>
    );
}
