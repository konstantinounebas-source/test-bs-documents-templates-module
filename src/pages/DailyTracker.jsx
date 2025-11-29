
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Clock, Calendar, Save, Eye, EyeOff, Pencil, History, Loader2, User as UserIcon, Printer, PanelLeftClose, PanelRightOpen } from 'lucide-react';
import { format, addDays, subDays, isToday, isSaturday, isSunday } from 'date-fns';
import { User } from '@/entities/User';
import { AppUser } from '@/entities/AppUser';
import { UserTask } from '@/entities/UserTask';
import { ScheduledEvent } from '@/entities/ScheduledEvent';
import { UserTaskLog } from '@/entities/UserTaskLog';
import { Holiday } from '@/entities/Holiday';
import { UserVisibilitySetting } from '@/entities/UserVisibilitySetting';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ScheduledEventCard from '../components/weekly-schedule/ScheduledEventCard';
import CreateEditTaskDialog from '../components/myworkday/CreateEditTaskDialog';
import ViewHistoryDialog from '../components/myworkday/ViewHistoryDialog';
import TaskList from '../components/weekly-schedule/TaskList';
import ScheduleTaskDialog from '../components/weekly-schedule/ScheduleTaskDialog';
import ScheduleOptionsDialog from '../components/weekly-schedule/ScheduleOptionsDialog';
import TaskSelectionDialog from '../components/weekly-schedule/TaskSelectionDialog';

// Helper to get local YYYY-MM-DD string
const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to generate time slots dynamically
const generateTimeSlots = (startTimeStr, endTimeStr, isExpanded) => {
    const slots = [];
    let [startHour, startMinute] = startTimeStr.split(':').map(Number);
    let [endHour, endMinute] = endTimeStr.split(':').map(Number);

    let current = new Date();
    current.setHours(startHour, startMinute, 0, 0);

    let end = new Date();
    end.setHours(endHour, endMinute, 0, 0);

    // The request is to change intervals to 30 minutes.
    // 'isExpanded' parameter is passed as per outline but not used to change interval here,
    // ensuring fixed 30-minute intervals as per the title's primary objective.
    const intervalMinutes = 30; 

    while (current.getTime() <= end.getTime()) {
        slots.push(format(current, 'HH:mm'));
        current = new Date(current.getTime() + intervalMinutes * 60 * 1000);
    }
    return slots;
};

export default function DailyTrackerPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    
    // User selection states
    const [currentUser, setCurrentUser] = useState(null);
    const [allUsers, setAllUsers] = useState([]); // Kept for handleUserChange
    const [visibleUsers, setVisibleUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    
    const [userTasks, setUserTasks] = useState([]);
    const [scheduledEvents, setScheduledEvents] = useState([]);
    const [holidays, setHolidays] = useState([]);
    
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [eventProgressNotes, setEventProgressNotes] = useState('');
    const [eventTimeSpent, setEventTimeSpent] = useState('');
    const [eventCompletionPercentage, setEventCompletionPercentage] = useState('');
    const [showWeekends, setShowWeekends] = useState(true);
    const [isExpandedView, setIsExpandedView] = useState(false); // New state variable, initialized to false
    const [isActionsPanelOpen, setIsActionsPanelOpen] = useState(false);

    // Add scheduling states like Weekly Schedule
    const [isScheduling, setIsScheduling] = useState(false);
    const [schedulingData, setSchedulingData] = useState(null);
    const [showScheduleOptions, setShowScheduleOptions] = useState(false);
    const [showTaskSelection, setShowTaskSelection] = useState(false);
    const [taskSelectionType, setTaskSelectionType] = useState('ad-hoc');
    const [selectedSlot, setSelectedSlot] = useState({ date: null, time: null });

    const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [showHistoryDialog, setShowHistoryDialog] = useState(false);
    const [historyTask, setHistoryTask] = useState(null);

    // New state for sorting and filtering
    const [sortOption, setSortOption] = useState('priority_order');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('active');

    // Helper function to fetch user-specific data
    const _fetchUserData = useCallback(async (userEmail) => {
        try {
            const tasksPromise = UserTask.filter({ assigned_to_user_email: userEmail });
            const eventsPromise = ScheduledEvent.filter({ user_email: userEmail });
            const holidaysPromise = Holiday.list();

            const [tasks, events, fetchedHolidays] = await Promise.all([tasksPromise, eventsPromise, holidaysPromise]);
            
            setUserTasks(tasks);
            setScheduledEvents(events);
            setHolidays(fetchedHolidays);
        } catch (error) {
            console.error("Failed to fetch data for user:", error);
            throw error; // Re-throw to be caught by calling function
        }
    }, []);

    // Initial effect to load user information and set default selected user
    useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);
            try {
                const loggedInUser = await User.me();
                if (!loggedInUser) {
                    setIsLoading(false);
                    return; 
                }
                setCurrentUser(loggedInUser);

                // Get the emails of users this user is allowed to see
                const visibilitySettings = await UserVisibilitySetting.filter({ viewer_user_email: loggedInUser.email });
                const visibleUserEmails = (visibilitySettings && visibilitySettings[0] && visibilitySettings[0].visible_user_emails) ? visibilitySettings[0].visible_user_emails : [];
                const visibleEmails = new Set(Array.isArray(visibleUserEmails) ? visibleUserEmails : []);
                visibleEmails.add(loggedInUser.email); // Always ensure self is visible

                // Fetch all users from both AppUser and Platform User sources with proper null checks
                let appUsers = [];
                let platformUsers = [];
                
                try {
                    const fetchedAppUsers = await AppUser.list();
                    appUsers = Array.isArray(fetchedAppUsers) ? fetchedAppUsers : [];
                } catch (error) {
                    console.warn("Failed to load app users:", error);
                    appUsers = [];
                }

                try {
                    const fetchedPlatformUsers = await User.list();
                    platformUsers = Array.isArray(fetchedPlatformUsers) ? fetchedPlatformUsers : [];
                } catch (error) {
                    console.warn("Failed to load platform users:", error);
                    platformUsers = [loggedInUser];
                }

                // Create a combined map of all users for easy lookup
                const allUsersMap = new Map();
                
                if (Array.isArray(appUsers)) {
                    appUsers.forEach(u => {
                        if (u && u.email) {
                            allUsersMap.set(u.email, u);
                        }
                    });
                }

                if (Array.isArray(platformUsers)) {
                    platformUsers.forEach(u => {
                        if (u && u.email) {
                            allUsersMap.set(u.email, u);
                        }
                    });
                }
                
                // Populate the allUsers state which is used by handleUserChange
                setAllUsers(Array.from(allUsersMap.values()));

                // Construct the final list of users to display in the dropdown
                let usersToDisplayInDropdown = [];
                for (const email of visibleEmails) {
                    if (email && allUsersMap.has(email)) {
                        usersToDisplayInDropdown.push(allUsersMap.get(email));
                    }
                }
                
                // Ensure loggedInUser is always in the display list
                if (!usersToDisplayInDropdown.some(u => u && u.email === loggedInUser.email)) {
                    usersToDisplayInDropdown.push(loggedInUser);
                }

                // Sort for better UX
                usersToDisplayInDropdown.sort((a, b) => {
                    const nameA = (a && a.full_name) || '';
                    const nameB = (b && b.full_name) || '';
                    return nameA.localeCompare(nameB);
                });
                
                setVisibleUsers(usersToDisplayInDropdown);
                setSelectedUser(loggedInUser);

                // Load initial data for the logged-in user after setting selectedUser
                await _fetchUserData(loggedInUser.email);

            } catch (error) {
                console.error("Failed to initialize Daily Tracker:", error);
                // Ensure basic functionality even if initialization partially fails
                const loggedInUser = await User.me().catch(() => null);
                if (loggedInUser) {
                    setCurrentUser(loggedInUser);
                    setVisibleUsers([loggedInUser]);
                    setSelectedUser(loggedInUser);
                }
            }
            setIsLoading(false);
        };
        initialize();
    }, [_fetchUserData]);

    // Callback to fetch data for the currently selected user (triggered by user selection)
    const fetchData = useCallback(async () => {
        if (!selectedUser) return;
        setIsLoading(true); // Set loading true again for user selection changes
        try {
            await _fetchUserData(selectedUser.email);
        } catch (error) {
            // Error already logged by _fetchUserData
        } finally {
            setIsLoading(false);
        }
    }, [selectedUser, _fetchUserData]);

    // Effect to fetch data when selected user changes (after initial load)
    useEffect(() => {
        // This useEffect will trigger after `setSelectedUser` in `initialize` and on subsequent `handleUserChange`
        fetchData();
        setIsActionsPanelOpen(false); // Close panel on user change
        setSelectedEvent(null);
    }, [fetchData]);

    const timeSlots = useMemo(() => {
        if (!selectedUser) return generateTimeSlots('08:00', '18:00', isExpandedView); // Default if user not loaded
        const start = selectedUser.preferred_display_start_time || '08:00';
        const end = selectedUser.preferred_display_end_time || '18:00';
        return generateTimeSlots(start, end, isExpandedView);
    }, [selectedUser, isExpandedView]);

    const dayDisplay = useMemo(() => format(currentDate, 'EEEE, dd MMMM yyyy'), [currentDate]);
    const holidayForDay = useMemo(() => holidays.find(h => h.date === getLocalDateString(currentDate)), [holidays, currentDate]);

    const dailyEvents = useMemo(() => 
        scheduledEvents.filter(event => event.scheduled_date === getLocalDateString(currentDate)),
    [scheduledEvents, currentDate]);

    const handleUserChange = (userEmail) => {
        const userToSelect = allUsers.find(u => u.email === userEmail);
        if (userToSelect) {
            setSelectedUser(userToSelect);
        }
    };

    const handlePreviousDay = () => {
        let prevDay = subDays(currentDate, 1);
        if (!showWeekends) {
            while (isSaturday(prevDay) || isSunday(prevDay)) {
                prevDay = subDays(prevDay, 1);
            }
        }
        setCurrentDate(prevDay);
        setSelectedEvent(null);
        setIsActionsPanelOpen(false);
    };

    const handleNextDay = () => {
        let nextDay = addDays(currentDate, 1);
        if (!showWeekends) {
            while (isSaturday(nextDay) || isSunday(nextDay)) {
                nextDay = addDays(nextDay, 1);
            }
        }
        setCurrentDate(nextDay);
        setSelectedEvent(null);
        setIsActionsPanelOpen(false);
    };
    
    const handleToday = () => {
        setCurrentDate(new Date());
        setSelectedEvent(null);
        setIsActionsPanelOpen(false);
    };

    // Add scheduling handlers from Weekly Schedule
    const handleTimeSlotClick = (time) => {
        setSelectedSlot({ date: currentDate, time });
        setSchedulingData({ task: null, date: currentDate, time });
        setShowScheduleOptions(true);
    };

    const handleScheduleTaskFromList = (task) => {
        setSchedulingData({ task, date: currentDate, time: null });
        setIsScheduling(true);
    };

    const handleCreateMeeting = () => {
        setSchedulingData(prev => ({ ...prev, task: null }));
        setIsScheduling(true);
        setShowScheduleOptions(false);
    };

    const handleCreateNewTask = () => {
        setShowEditTaskDialog(true);
        setEditingTask(null);
        setShowScheduleOptions(false);
    };

    const handleScheduleAdHocTask = () => {
        setTaskSelectionType('ad-hoc');
        setShowTaskSelection(true);
        setShowScheduleOptions(false);
    };

    const handleScheduleRecurrenceTask = () => {
        setTaskSelectionType('recurrence');
        setShowTaskSelection(true);
        setShowScheduleOptions(false);
    };

    const handleTaskSelected = (selectedTask) => {
        setShowTaskSelection(false);
        setSchedulingData(prev => ({ ...prev, task: selectedTask }));
        setIsScheduling(true);
    };

    const handleEventEdit = (event) => {
        setSchedulingData({ 
            task: event.parent_user_task_id ? userTasks.find(t => t.id === event.parent_user_task_id) : null, 
            date: new Date(event.scheduled_date), 
            time: event.start_time,
            editingEvent: event
        });
        setIsScheduling(true);
    };

    const handleEventRemove = async (event) => {
        if (confirm(`Θέλετε να αφαιρέσετε το "${event.title}" από το πρόγραμμα;`)) {
            try {
                await ScheduledEvent.delete(event.id);
                await fetchData();
                if (selectedEvent?.id === event.id) {
                    setSelectedEvent(null);
                    setIsActionsPanelOpen(false);
                }
            } catch (error) {
                console.error("Failed to remove event:", error);
                alert("Σφάλμα κατά την αφαίκεση του συμβάντος.");
            }
        }
    };

    const handleEventSaved = () => {
        setIsScheduling(false);
        setSchedulingData(null);
        fetchData();
    };

    const handleCloseDialogs = () => {
        setIsScheduling(false);
        setShowScheduleOptions(false);
        setShowTaskSelection(false);
        setShowEditTaskDialog(false); // Use the right state setter
        setSchedulingData(null);
        setEditingTask(null);
    };

    const linkedTask = useMemo(() => {
        if (selectedEvent && selectedEvent.parent_user_task_id) {
            return userTasks.find(t => t.id === selectedEvent.parent_user_task_id);
        }
        return null;
    }, [selectedEvent, userTasks]);

    useEffect(() => {
        if (linkedTask) {
            setEventCompletionPercentage(linkedTask.completion_percentage || 0);
        } else {
            setEventCompletionPercentage('');
        }
    }, [linkedTask]);

    const handleSelectEvent = (event) => {
        setSelectedEvent(event);
        setIsActionsPanelOpen(true);
        setEventProgressNotes(event.progress_notes || '');
        setEventTimeSpent(event.time_spent_minutes || '');
        const task = userTasks.find(t => t.id === event.parent_user_task_id);
        if (task) {
            setEventCompletionPercentage(task.completion_percentage || 0);
        }
    };
    
    const refreshData = useCallback(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveProgress = async () => {
        if (!selectedEvent) return;

        const timeSpentNumber = parseFloat(eventTimeSpent) || 0;
        const completionPercentageNumber = parseFloat(eventCompletionPercentage);

        const dataToSave = {
            progress_notes: eventProgressNotes,
            time_spent_minutes: timeSpentNumber
        };

        if (selectedEvent.status === 'Planned') {
            dataToSave.status = 'Completed';
        }

        try {
            await ScheduledEvent.update(selectedEvent.id, dataToSave);

            if (linkedTask) {
                const taskUpdates = {};
                const originalTimeSpent = selectedEvent.time_spent_minutes || 0;
                const timeDifference = timeSpentNumber - originalTimeSpent;
                taskUpdates.total_time_spent_minutes = (linkedTask.total_time_spent_minutes || 0) + timeDifference;

                if (!isNaN(completionPercentageNumber) && completionPercentageNumber !== linkedTask.completion_percentage) {
                    taskUpdates.completion_percentage = completionPercentageNumber;
                }

                if (Object.keys(taskUpdates).length > 0) {
                    await UserTask.update(linkedTask.id, taskUpdates);
                }

                if (eventProgressNotes || timeDifference !== 0) {
                     await UserTaskLog.create({
                        user_task_id: linkedTask.id,
                        progress_notes: eventProgressNotes || `Logged time from daily tracker.`,
                        status_at_log_time: linkedTask.status,
                        time_spent_in_log_minutes: timeSpentNumber
                    });
                }
            }
            refreshData();
            setSelectedEvent(null);
            setIsActionsPanelOpen(false);
            setEventProgressNotes('');
            setEventTimeSpent('');
            setEventCompletionPercentage('');
        } catch (error) {
            console.error("Failed to save progress", error);
        }
    };

    const handleNoProgress = async () => {
        if (!selectedEvent) return;

        const dataToSave = {
            progress_notes: 'No progress reported for this session.',
            time_spent_minutes: 0,
            status: 'Completed'
        };
        try {
            await ScheduledEvent.update(selectedEvent.id, dataToSave);
            if (linkedTask) {
                 await UserTaskLog.create({
                    user_task_id: linkedTask.id,
                    progress_notes: 'No progress reported for this session (from daily tracker).',
                    status_at_log_time: linkedTask.status,
                    time_spent_in_log_minutes: 0
                });
            }
            refreshData();
            setSelectedEvent(null);
            setIsActionsPanelOpen(false);
        } catch (error) {
            console.error("Failed to mark as no progress:", error);
        }
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setShowEditTaskDialog(true);
    };

    const handleViewHistory = (task) => {
        setHistoryTask(task);
        setShowHistoryDialog(true);
    };

    const handleTaskSaved = () => {
        setShowEditTaskDialog(false);
        setEditingTask(null);
        refreshData();
    };

    const totalScheduledMinutes = useMemo(() => {
        return dailyEvents.reduce((total, event) => total + (event.duration_minutes || 0), 0);
    }, [dailyEvents]);

    const totalActualMinutesSpent = useMemo(() => {
        return dailyEvents.reduce((total, event) => total + (event.time_spent_minutes || 0), 0);
    }, [dailyEvents]);
    
    const formatTotalTime = (minutes) => {
        if (minutes === 0 || !minutes) return '0λ';
        if (minutes < 60) return `${minutes}λ`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}ώ ${remainingMinutes}λ` : `${hours}ώ`;
    };

    // Modified to filter by recurrence only; sorting and status filtering will be handled by TaskList
    const adHocTasks = useMemo(() => 
        userTasks.filter(t => !t.is_recurring), 
    [userTasks]);

    const recurrenceTasks = useMemo(() => 
        userTasks.filter(t => t.is_recurring), 
    [userTasks]);

    const handlePrint = () => {
        window.print();
    };
    
    if (isLoading && !selectedUser) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>;
    }

    return (
        <div className="flex h-screen flex-col bg-slate-50">
            {/* Print Styles */}
            <style jsx>{`
                @media print {
                    body { margin: 0; }
                    .print-hide { display: none !important; }
                    .print-show { display: block !important; }

                    /* Ensure background is white and text is dark */
                    .bg-slate-50 { background-color: white !important; }
                    .bg-white { background-color: white !important; }
                    .text-slate-900 { color: black !important; }
                    .text-slate-600 { color: #333 !important; }
                    .text-slate-700 { color: #333 !important; }
                    .text-slate-800 { color: #333 !important; }
                    .text-slate-500 { color: #666 !important; }
                    .border-b, .border-r { border-color: #ddd !important; }

                    /* Main layout adjustments for print */
                    .daily-tracker-grid {
                        display: grid;
                        grid-template-columns: 1fr; /* Only schedule visible */
                        gap: 0;
                        height: auto; /* Allow content to flow */
                        overflow: visible;
                    }
                    .schedule-column {
                        grid-column: span 12 / span 12 !important; /* Make schedule full width */
                        border-right: none !important;
                        overflow: visible;
                        height: auto;
                    }
                    .time-slot-row {
                        height: auto !important;
                        min-height: 48px; /* Maintain some height for legibility */
                        padding: 4px;
                        border-bottom: 1px solid #eee;
                        cursor: default; /* Remove pointer */
                        background-color: white; /* Ensure white background */
                    }
                    .time-slot-row:hover {
                        background-color: white !important; /* No hover effect on print */
                    }
                    .scheduled-event-card {
                        background-color: #e0f2f7 !important; /* Light blue for events */
                        border: 1px solid #b3e5fc !important;
                        color: #01579b !important;
                        box-shadow: none !important;
                    }
                    .scheduled-event-card button {
                        display: none !important; /* Hide action buttons on printed cards */
                    }
                    .scheduled-event-card .line-clamp-2 {
                        -webkit-line-clamp: unset !important; /* Ensure full text is visible */
                        line-clamp: unset !important;
                        white-space: normal !important;
                    }

                    /* Header adjustments */
                    .header-main-section {
                        flex-direction: row !important; /* Keep horizontal */
                        justify-content: space-between !important;
                        align-items: flex-end !important;
                        padding-bottom: 15px;
                        margin-bottom: 25px;
                        border-bottom: 2px solid #333;
                    }
                    .header-controls {
                        display: none !important; /* Hide user select, date nav, etc. */
                    }
                    .header-stats {
                        display: flex !important; /* Ensure stats are visible */
                        margin-top: 0 !important;
                        gap: 1.5rem !important;
                        flex-direction: row !important;
                        align-items: flex-end !important;
                    }
                    .header-title-section {
                        display: block !important;
                    }

                    /* Footer/Dialogs */
                    .dialogs-container {
                        display: none !important;
                    }

                    /* Ensure page breaks */
                    .page-break-before { page-break-before: always; }
                    .page-break-inside-avoid { page-break-inside: avoid; }
                }
            `}</style>

            {/* Header */}
            <header className="flex-none border-b bg-white p-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 header-main-section">
                    {/* Left side: New Title and Description */}
                    <div className="header-title-section">
                        <h1 className="text-3xl font-bold text-slate-900">My Daily Log</h1>
                        <p className="text-slate-600 mt-1">
                            {selectedUser && currentUser?.email === selectedUser.email 
                                ? "Track your daily progress and log time spent on tasks"
                                : `Tracking daily log for ${selectedUser?.full_name || 'selected user'}`
                            }
                        </p>
                        {/* New print-only info */}
                        <div className="print-show hidden text-sm text-slate-600 mt-2">
                            Generated on: {format(new Date(), 'PPP')} | 
                            Date: {format(currentDate, 'PPP')} | 
                            User: {selectedUser?.full_name}
                        </div>
                    </div>

                    {/* Right side: User Selector, Date Navigation and Stats */}
                    <div className="flex flex-col md:flex-row items-center gap-4 header-controls">
                        <div className="w-full md:w-56">
                            <Label htmlFor="user-select">Viewing For</Label>
                            <Select onValueChange={handleUserChange} value={selectedUser?.email || ''}>
                                <SelectTrigger id="user-select">
                                    <SelectValue placeholder="Select a user..." />
                                -</SelectTrigger>
                                <SelectContent>
                                    {visibleUsers.map(user => (
                                        <SelectItem key={user.email} value={user.email}>
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="w-4 h-4" />
                                                {user.full_name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={handlePreviousDay}><ChevronLeft className="w-5 h-5"/></Button>
                            <h2 className="text-lg font-semibold text-slate-700">{dayDisplay}</h2>
                            <Button variant="ghost" size="icon" onClick={handleNextDay}><ChevronRight className="w-5 h-5"/></Button>
                            {holidayForDay && <Badge variant="destructive" className="ml-4">{holidayForDay.name}</Badge>}
                        </div>
                        <div className="flex items-center gap-4 mt-2 md:mt-0 header-stats">
                            <p className="text-sm font-medium">Scheduled: <span className="font-bold">{formatTotalTime(totalScheduledMinutes)}</span></p>
                            <p className="text-sm font-medium">Actual: <span className="font-bold">{formatTotalTime(totalActualMinutesSpent)}</span></p>
                            <Button variant="outline" size="sm" onClick={handleToday}>Today</Button>
                            <Button variant="outline" size="sm" onClick={() => setShowWeekends(!showWeekends)}>
                                {showWeekends ? <EyeOff className="w-4 h-4 mr-2"/> : <Eye className="w-4 h-4 mr-2"/>}
                                {showWeekends ? 'Hide Weekends' : 'Show Weekends'}
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={handlePrint}
                                className="bg-white print-hide"
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                Print Daily Log
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                <div className="grid h-full grid-cols-12 gap-0 daily-tracker-grid">
                    {/* Time Gutter */}
                    <div className="col-span-1 border-r overflow-y-auto print-hide">
                        <div className="sticky top-0 z-10 h-[53px] border-b bg-slate-50 p-3"></div>
                        {timeSlots.map(time => (
                            <div key={time} className="flex h-12 items-center justify-center border-b text-xs text-slate-500">{time}</div>
                        ))}
                    </div>

                    {/* Schedule */}
                    <div className={`relative ${isActionsPanelOpen ? 'col-span-4' : 'col-span-6'} border-r overflow-y-auto schedule-column transition-all duration-300`}>
                        <div className="sticky top-0 z-10 border-b bg-white p-3 flex justify-between items-center h-[53px]">
                            <h3 className="text-sm font-semibold text-slate-900">Schedule</h3>
                            <Button variant="ghost" size="icon" onClick={() => setIsActionsPanelOpen(!isActionsPanelOpen)}>
                                {isActionsPanelOpen ? <PanelLeftClose className="w-5 h-5 text-slate-600" /> : <PanelRightOpen className="w-5 h-5 text-slate-600" />}
                            </Button>
                        </div>
                        {timeSlots.map(time => (
                            <div 
                                key={time} 
                                className="relative h-12 border-b p-1 hover:bg-blue-50 cursor-pointer transition-colors time-slot-row"
                                onClick={() => handleTimeSlotClick(time)}
                            >
                                {dailyEvents.filter(event => event.start_time === time).map(event => (
                                    <ScheduledEventCard 
                                        key={event.id} 
                                        event={event} 
                                        onClick={() => handleSelectEvent(event)} 
                                        onEdit={handleEventEdit}
                                        onRemove={handleEventRemove}
                                        isSelected={selectedEvent?.id === event.id} 
                                        className="scheduled-event-card"
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                    
                    {/* Daily Actions */}
                    {isActionsPanelOpen && (
                    <div className="col-span-4 border-r bg-slate-50 overflow-y-auto print-hide animate-in fade-in-50 duration-300">
                        <div className="sticky top-0 z-10 border-b bg-white p-3 h-[53px]">
                            <h3 className="text-sm font-semibold text-slate-900">Daily Actions</h3>
                        </div>
                        <div className="p-4">
                            {selectedEvent ? (
                                <div className="space-y-4">
                                    <div className="rounded-lg border bg-white p-4">
                                        {linkedTask ? (
                                            <>
                                                <h5 className="line-clamp-2 text-lg font-bold text-slate-800">{linkedTask.title}</h5>
                                                <div className="my-3 flex flex-wrap gap-2">
                                                    <Badge variant={linkedTask.status === 'Completed' ? 'default' : 'secondary'}>{linkedTask.status}</Badge>
                                                    <Badge variant="outline">{linkedTask.priority} Priority</Badge>
                                                    {linkedTask.due_date && <Badge variant="outline">Due: {format(new Date(linkedTask.due_date), 'dd/MM/yyyy')}</Badge>}
                                                </div>
                                                <div className="mb-4 flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => handleEditTask(linkedTask)}><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
                                                    <Button size="sm" variant="outline" onClick={() => handleViewHistory(linkedTask)}><History className="mr-1 h-3 w-3" /> History</Button>
                                                </div>
                                                <div className="border-t pt-4">
                                                    <h6 className="mb-3 font-medium text-slate-800">Log Progress for this Session</h6>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <Label className="text-sm">Set Progress: {eventCompletionPercentage}%</Label>
                                                            <input type="range" min="0" max="100" step="5" value={eventCompletionPercentage} onChange={(e) => setEventCompletionPercentage(e.target.value)} className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200" />
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="time_spent">Χρόνος που αφιερώθηκε (λεπτά)</Label>
                                                            <Input id="time_spent" value={eventTimeSpent} onChange={e => setEventTimeSpent(e.target.value)} placeholder="π.χ. 45" />
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="progress_notes">Σημειώσεις προόδου</Label>
                                                            <Textarea id="progress_notes" value={eventProgressNotes} onChange={e => setEventProgressNotes(e.target.value)} placeholder="Τι ολοκληρώθηκε σε αυτή τη συνεδρία;" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <h5 className="line-clamp-2 text-lg font-bold text-slate-800">{selectedEvent.title}</h5>
                                                <p className="text-slate-600">This is a meeting. Add notes below.</p>
                                                <div className="border-t pt-4 mt-4">
                                                    <h6 className="mb-3 font-medium text-slate-800">Meeting Notes</h6>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <Label htmlFor="time_spent">Χρόνος που αφιερώθηκε (λεπτά)</Label>
                                                            <Input id="time_spent" value={eventTimeSpent} onChange={e => setEventTimeSpent(e.target.value)} placeholder="π.χ. 45" />
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="progress_notes">Σημειώσεις συνάντησης</Label>
                                                            <Textarea id="progress_notes" value={eventProgressNotes} onChange={e => setEventProgressNotes(e.target.value)} placeholder="Τι συζητήθηκε στη συνάντηση;" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={handleSaveProgress} className="w-full"><Save className="mr-2 h-4 w-4"/>Αποθήκευση Προόδου</Button>
                                        <Button variant="destructive" onClick={handleNoProgress}>No Progress</Button>
                                        <Button variant="outline" onClick={() => { setSelectedEvent(null); setIsActionsPanelOpen(false); }}>Close</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-16 text-center">
                                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">Select an event</h3>
                                    <p className="mt-1 text-sm text-gray-500">Επιλέξτε ένα προγραμματισμένο γεγονός για να παρακολουθήσετε την πρόοδο ή κάντε κλικ σε ένα time slot για να προσθέσετε νέο γεγονός</p>
                                </div>
                            )}
                        </div>
                    </div>
                    )}

                    {/* Available Tasks - using the same TaskList component as Weekly Schedule */}
                    <div className={`max-h-full overflow-y-auto bg-white print-hide ${isActionsPanelOpen ? 'col-span-3' : 'col-span-5'} transition-all duration-300`}>
                        <div className="sticky top-0 z-10 border-b bg-slate-50 p-3 h-[53px]">
                            <h3 className="text-sm font-semibold text-slate-900">Available Tasks</h3>
                        </div>
                        <div className="p-3 space-y-4">
                            <TaskList 
                                title="Ad-hoc Tasks" 
                                tasks={adHocTasks} 
                                onScheduleClick={handleScheduleTaskFromList}
                                onTaskClick={handleEditTask}
                                isLoading={isLoading} 
                                hideResizeButton={true} // Set to true as per outline, removing panel resize state/props
                                sortOption={sortOption}
                                onSortChange={setSortOption}
                                priorityFilter={priorityFilter}
                                onPriorityFilterChange={setPriorityFilter}
                                statusFilter={statusFilter}
                                onStatusFilterChange={setStatusFilter}
                            />
                            <TaskList 
                                title="Recurrence Tasks" 
                                tasks={recurrenceTasks} 
                                onScheduleClick={handleScheduleTaskFromList}
                                onTaskClick={handleEditTask}
                                isLoading={isLoading} 
                                hideResizeButton={true} // Set to true as per outline, removing panel resize state/props
                                sortOption={sortOption}
                                onSortChange={setSortOption}
                                priorityFilter={priorityFilter}
                                onPriorityFilterChange={setPriorityFilter}
                                statusFilter={statusFilter}
                                onStatusFilterChange={setStatusFilter}
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* Dialogs - same as Weekly Schedule */}
            <div className="dialogs-container print-hide">
                <ScheduleOptionsDialog
                    open={showScheduleOptions}
                    onClose={() => setShowScheduleOptions(false)}
                    onCreateMeeting={handleCreateMeeting}
                    onCreateNewTask={handleCreateNewTask}
                    onScheduleAdHocTask={handleScheduleAdHocTask}
                    onScheduleRecurrenceTask={handleScheduleRecurrenceTask}
                    selectedDate={selectedSlot.date}
                    selectedTime={selectedSlot.time}
                />
                
                <TaskSelectionDialog
                    open={showTaskSelection}
                    onClose={() => setShowTaskSelection(false)}
                    onTaskSelected={handleTaskSelected}
                    tasks={taskSelectionType === 'ad-hoc' ? 
                        adHocTasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled') :
                        recurrenceTasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled')
                    }
                    title={taskSelectionType === 'ad-hoc' ? 'Select Ad-hoc Task' : 'Select Recurrence Task'}
                    selectedDate={selectedSlot.date}
                    selectedTime={selectedSlot.time}
                />
                
                <CreateEditTaskDialog
                    open={showEditTaskDialog}
                    onClose={() => {
                        setShowEditTaskDialog(false);
                        setEditingTask(null);
                    }}
                    onTaskSaved={handleTaskSaved}
                    task={editingTask}
                    user={selectedUser}
                />
                
                <ScheduleTaskDialog
                    open={isScheduling}
                    onClose={handleCloseDialogs}
                    onEventSaved={handleEventSaved}
                    user={selectedUser}
                    task={schedulingData?.task}
                    initialDate={schedulingData?.date}
                    initialTime={schedulingData?.time}
                    editingEvent={schedulingData?.editingEvent}
                    userTasks={userTasks}
                />

                {showHistoryDialog && <ViewHistoryDialog open={showHistoryDialog} onClose={() => setShowHistoryDialog(false)} task={historyTask} />}
            </div>
        </div>
    );
}
