
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, User as UserIcon, Loader2, Printer, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, eachDayOfInterval, isSameDay, isToday, getDay } from 'date-fns';
import { User } from '@/entities/User';
import { AppUser } from '@/entities/AppUser';
import { UserTask } from '@/entities/UserTask';
import { ScheduledEvent } from '@/entities/ScheduledEvent';
import { Holiday } from '@/entities/Holiday';
import { UserVisibilitySetting } from '@/entities/UserVisibilitySetting';
import { WorkSchedule } from '@/entities/WorkSchedule';
import { DragDropContext } from '@hello-pangea/dnd';

import CalendarGrid from '../components/weekly-schedule/CalendarGrid';
import TaskList from '../components/weekly-schedule/TaskList';
import ScheduleTaskDialog from '../components/weekly-schedule/ScheduleTaskDialog';
import ScheduleOptionsDialog from '../components/weekly-schedule/ScheduleOptionsDialog';
import TaskSelectionDialog from '../components/weekly-schedule/TaskSelectionDialog';
import CreateEditTaskDialog from '../components/myworkday/CreateEditTaskDialog';
import { usePageAccess } from "@/components/lib/usePageAccess";

export default function WeeklySchedulePage() {
    const { hasAccess, isLoading: accessLoading } = usePageAccess('WeeklySchedule');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    
    // User selection states
    const [currentUser, setCurrentUser] = useState(null);
    // allUsers is kept to fetch and store all possible users for selection logic, even if not all are 'visible'
    const [allUsers, setAllUsers] = useState([]); 
    const [visibleUsers, setVisibleUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    
    const [tasks, setTasks] = useState([]); // Renamed from userTasks
    const [scheduledEvents, setScheduledEvents] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [workSchedules, setWorkSchedules] = useState([]);
    const [showWeekends, setShowWeekends] = useState(false); // Changed to false by default
    
    // Scheduling Dialog States
    const [isScheduling, setIsScheduling] = useState(false);
    const [schedulingTask, setSchedulingTask] = useState(null); // The task being scheduled (can be null for new events)
    const [schedulingDate, setSchedulingDate] = useState(null); // The date/time for scheduling

    // Options Dialog (the new one for time slot clicks)
    const [isOptionsDialogOpen, setIsOptionsDialogOpen] = useState(false); // Renamed from isOptionsOpen
    const [optionsDialogDate, setOptionsDialogDate] = useState(null); // Replaced optionsEvent
    const [optionsDialogTime, setOptionsDialogTime] = useState(null); // New state for options dialog time

    // Task Selection Dialog (e.g., for D&D scenarios needing task choice)
    const [isTaskSelectorOpen, setIsTaskSelectorOpen] = useState(false);
    // Removed taskSelectorDate, taskSelectorTime - using optionsDialogDate/Time now for this context
    const [taskSelectorType, setTaskSelectorType] = useState('ad-hoc'); // New state for task selector type

    // Create New Task Dialog
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false); // New state for create task dialog
    
    const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
    const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
    
    const weekDates = useMemo(() => {
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        if (showWeekends) {
            return days;
        }
        // Filter out Saturday (6) and Sunday (0)
        return days.filter(day => {
            const dayOfWeek = getDay(day);
            return dayOfWeek !== 0 && dayOfWeek !== 6;
        });
    }, [weekStart, weekEnd, showWeekends]); // Added showWeekends dependency
    
    const weekDisplay = `${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM, yyyy')}`;

    // Function to generate time slots (e.g., 00:00, 00:30, ..., 23:30)
    const generateTimeSlots = useCallback((startTime = '00:00', endTime = '23:30') => {
        const slots = [];
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        let currentHour = startHour;
        let currentMinute = startMinute;

        while (true) {
            // Check if current time exceeds end time
            if (currentHour > endHour || (currentHour === endHour && currentMinute > endMinute)) {
                break;
            }

            slots.push(`${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`);

            currentMinute += 30;
            if (currentMinute >= 60) {
                currentMinute -= 60;
                currentHour++;
            }
        }
        return slots;
    }, []);

    const timeSlots = useMemo(() => {
        if (!selectedUser) return generateTimeSlots('08:00', '18:00'); // Default range
        const startTime = selectedUser.preferred_display_start_time || '08:00';
        const endTime = selectedUser.preferred_display_end_time || '18:00';
        return generateTimeSlots(startTime, endTime);
    }, [generateTimeSlots, selectedUser]); // Added selectedUser dependency

    // Renamed initializeAndLoadAllData to fetchData as per outline
    const fetchData = useCallback(async (userEmail) => {
        if (!userEmail) {
            setIsLoading(false); // Ensure loading state is false if no user email
            return;
        }
        setIsLoading(true);
        try {
            const tasksPromise = UserTask.filter({ assigned_to_user_email: userEmail });
            
            const eventsPromise = ScheduledEvent.filter({ 
                user_email: userEmail,
            });

            const holidaysPromise = Holiday.list(); // Fetch all holidays
            const workSchedulesPromise = WorkSchedule.filter({ user_email: userEmail });

            const [fetchedTasks, events, fetchedHolidays, fetchedSchedules] = await Promise.all([
                tasksPromise, 
                eventsPromise, 
                holidaysPromise, 
                workSchedulesPromise
            ]);

            setTasks(fetchedTasks);
            setScheduledEvents(events);
            setHolidays(fetchedHolidays);
            setWorkSchedules(fetchedSchedules);

        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Effect to load user information and set default selected user
    useEffect(() => {
        const initialize = async () => {
            if (accessLoading) return; // Wait for access check to complete
            if (!hasAccess) {
                setIsLoading(false);
                return; // No access, stop initialization
            }

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

                // Fetch all users from both AppUser and Platform User sources
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
                    platformUsers = Array.isArray(fetchedPlatformUsers) ? fetchedPlatformUsers : [loggedInUser]; // Fallback for non-admins
                } catch (error) {
                    console.warn("Failed to load platform users:", error);
                    platformUsers = [loggedInUser];
                }

                // Create a combined map of all users for easy lookup and de-duplication
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
                
                setAllUsers(Array.from(allUsersMap.values())); // Keep allUsers state for lookup by email

                // Construct the final list of users to display in the dropdown
                let usersToDisplayInDropdown = [];
                for (const email of visibleEmails) {
                    if (email && allUsersMap.has(email)) {
                        usersToDisplayInDropdown.push(allUsersMap.get(email));
                    }
                }
                
                // Ensure the logged-in user is always in the dropdown
                if (!usersToDisplayInDropdown.some(u => u && u.email === loggedInUser.email)) {
                    usersToDisplayInDropdown.push(loggedInUser);
                }

                // Sort and set states
                usersToDisplayInDropdown.sort((a, b) => {
                    const nameA = (a && a.full_name) || '';
                    const nameB = (b && b.full_name) || '';
                    return nameA.localeCompare(nameB);
                });
                
                setVisibleUsers(usersToDisplayInDropdown);
                setSelectedUser(loggedInUser);
                
                // Fetch data for the logged-in user immediately as part of initialization
                await fetchData(loggedInUser.email);

            } catch (error) {
                console.error("Failed to initialize Weekly Schedule:", error);
                // Attempt to at least set current user if main fetch fails
                try {
                    const loggedInUser = await User.me();
                    if (loggedInUser) {
                        setCurrentUser(loggedInUser);
                        setVisibleUsers([loggedInUser]);
                        setSelectedUser(loggedInUser);
                        await fetchData(loggedInUser.email); // Try to fetch for self
                    }
                } catch (innerError) {
                    console.error("Failed to re-fetch logged-in user in error handler:", innerError);
                }
            } finally {
                setIsLoading(false);
            }
        };
        initialize();
    }, [accessLoading, hasAccess, fetchData]); // fetchData is a useCallback, so it's stable and safe to include

    // Effect to fetch data when selected user changes (e.g., from dropdown selection)
    useEffect(() => {
        if (selectedUser) {
            fetchData(selectedUser.email);
        }
    }, [selectedUser, fetchData]); // fetchData is a useCallback, so it's stable and safe to include

    const handleUserChange = (userEmail) => {
        const userToSelect = allUsers.find(u => u.email === userEmail); // Use allUsers for full lookup
        if (userToSelect) {
            setSelectedUser(userToSelect);
        }
    };

    // Client-side filtering for events to only show relevant week's events
    const weeklyEvents = useMemo(() => {
        return scheduledEvents.filter(event => {
            const eventDate = new Date(event.scheduled_date);
            return eventDate >= weekStart && eventDate <= weekEnd;
        });
    }, [scheduledEvents, weekStart, weekEnd]);

    const goToPreviousWeek = () => setCurrentDate(addDays(currentDate, -7));
    const goToNextWeek = () => setCurrentDate(addDays(currentDate, 7));
    const goToCurrentWeek = () => setCurrentDate(new Date());
    
    // Updated handleTimeSlotClick to open the new options dialog
    const handleTimeSlotClick = useCallback((date, time) => {
        setOptionsDialogDate(date);
        setOptionsDialogTime(time);
        setIsOptionsDialogOpen(true);
    }, []);

    // Updated handleEventClick to open ScheduleTaskDialog for editing/viewing existing event
    const handleEventClick = useCallback((event) => {
        // Find the original task if it exists to pre-fill the dialog
        setSchedulingTask(tasks.find(t => t.id === event.parent_user_task_id) || null);
        setSchedulingDate(new Date(event.scheduled_date)); // Pre-fill with event's scheduled date
        setIsScheduling(true); // Open the ScheduleTaskDialog
    }, [tasks]);

    // handleScheduleTask is for scheduling from the TaskList
    const handleScheduleTask = useCallback((task) => {
        setSchedulingTask(task);
        setSchedulingDate(new Date()); // Default to today, user can change in dialog
        setIsScheduling(true);
    }, []);
    
    // Callback for ScheduleTaskDialog after an event is saved/created
    // Renamed from confirmScheduling to handleTaskScheduled
    const handleTaskScheduled = useCallback(async () => {
        setIsScheduling(false);
        setSchedulingTask(null);
        setSchedulingDate(null);
        if (selectedUser) {
            await fetchData(selectedUser.email); // Refresh data
        }
    }, [selectedUser, fetchData]);

    // Handlers for the NEW ScheduleOptionsDialog (when a time slot is clicked)
    const handleCreateMeeting = useCallback(() => {
        setIsOptionsDialogOpen(false); // Close options dialog
        const combinedDate = new Date(optionsDialogDate);
        if (optionsDialogTime) {
            const [hours, minutes] = optionsDialogTime.split(':');
            combinedDate.setHours(parseInt(hours), parseInt(minutes));
        }
        setSchedulingTask(null); // No specific task for a new meeting
        setSchedulingDate(combinedDate);
        setIsScheduling(true); // Open ScheduleTaskDialog for new meeting
    }, [optionsDialogDate, optionsDialogTime]);

    const handleCreateNewTask = useCallback(() => {
        setIsOptionsDialogOpen(false); // Close options dialog
        setIsCreateTaskOpen(true); // Open CreateEditTaskDialog
    }, []);

    const handleScheduleAdHocTask = useCallback(() => {
        setIsOptionsDialogOpen(false); // Close options dialog
        setTaskSelectorType('ad-hoc');
        setIsTaskSelectorOpen(true); // Open TaskSelectionDialog for ad-hoc tasks
    }, []);

    const handleScheduleRecurrenceTask = useCallback(() => {
        setIsOptionsDialogOpen(false); // Close options dialog
        setTaskSelectorType('recurrence');
        setIsTaskSelectorOpen(true); // Open TaskSelectionDialog for recurrence tasks
    }, []);

    // Callback for TaskSelectionDialog when a task is selected
    const handleTaskSelectedForScheduling = useCallback((task) => {
        setIsTaskSelectorOpen(false); // Close task selector
        const combinedDate = new Date(optionsDialogDate);
        if (optionsDialogTime) {
            const [hours, minutes] = optionsDialogTime.split(':');
            combinedDate.setHours(parseInt(hours), parseInt(minutes));
        }
        setSchedulingTask(task);
        setSchedulingDate(combinedDate);
        setIsScheduling(true); // Open ScheduleTaskDialog with the selected task and time
    }, [optionsDialogDate, optionsDialogTime]);
    
    // Callback for CreateEditTaskDialog after a task is created/edited
    const handleTaskCreated = useCallback(async () => {
        setIsCreateTaskOpen(false); // Close create task dialog
        if (selectedUser) {
            await fetchData(selectedUser.email); // Refresh data
        }
    }, [selectedUser, fetchData]);

    // D&D handler for dropping tasks onto the calendar
    // This handler is now the global onDragEnd for DragDropContext
    const handleDropOnCalendar = useCallback(async (result) => {
        if (!result.destination) {
            return; // Item dropped outside of any droppable
        }

        const { draggableId, destination } = result;
        const droppableId = destination.droppableId;

        // Assuming calendar cell droppable IDs are formatted as "calendar-cell-YYYY-MM-DD-HH-MM"
        if (!droppableId.startsWith('calendar-cell-')) {
            console.warn('Dropped on a non-calendar droppable or malformed ID:', droppableId);
            return;
        }

        // Example droppableId: "calendar-cell-2023-10-27-09-00"
        const idParts = droppableId.split('-');
        if (idParts.length < 7) { 
            console.error('Malformed calendar droppableId:', droppableId);
            return;
        }

        const year = parseInt(idParts[2], 10);
        const month = parseInt(idParts[3], 10) - 1; // Month is 0-indexed
        const day = parseInt(idParts[4], 10);
        const hour = parseInt(idParts[5], 10);
        const minute = parseInt(idParts[6], 10);

        const targetDate = new Date(year, month, day, hour, minute);

        const droppedTaskId = draggableId;
        const taskToSchedule = tasks.find(t => t.id === droppedTaskId);

        if (taskToSchedule) {
            // Directly schedule the task
            setSchedulingTask(taskToSchedule);
            setSchedulingDate(targetDate); // Use the extracted date/time
            setIsScheduling(true);
        } else {
            console.warn("Dropped item is not a recognized task:", droppedTaskId);
            // If it's not a direct task, maybe open TaskSelectionDialog
            setOptionsDialogDate(targetDate); // Pass the target date to the options dialog context
            setOptionsDialogTime(format(targetDate, 'HH:mm')); // Pass the time
            setTaskSelectorType('ad-hoc'); // Default to ad-hoc if task not found directly
            setIsTaskSelectorOpen(true); // Open the Task Selection Dialog
        }
    }, [tasks]); // Dependency on tasks for finding taskToSchedule

    const handlePrint = () => {
        window.print();
    };

    if (accessLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
            </div>
        );
    }
    
    if (!hasAccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
                You do not have access to view this page.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col">
            {/* Print Styles */}
            <style jsx>{`
                @media print {
                    body { margin: 0; }
                    .print-hide { display: none !important; }
                    .print-show { display: block !important; }
                    .print-page {
                        background: white !important;
                        padding: 20px !important;
                        margin: 0 !important;
                        min-height: auto !important;
                    }
                    .print-header {
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    }
                    .print-calendar {
                        font-size: 12px;
                        page-break-inside: avoid;
                    }
                    .print-task-panel {
                        page-break-before: always;
                        margin-top: 30px;
                    }
                    .print-task-list {
                        break-inside: avoid;
                        margin-bottom: 20px;
                    }
                    .sidebar { display: none !important; }
                    nav { display: none !important; }
                    .bg-slate-50 { background: white !important; }
                    .text-slate-600 { color: #333 !important; }
                    .text-slate-500 { color: #666 !important; }
                    .shadow-sm { box-shadow: none !important; }
                    .rounded-lg { border-radius: 4px !important; }
                }
            `}</style>

            <div className="max-w-full mx-auto space-y-6 w-full print-page">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print-header">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">My Week Planner</h1>
                        <p className="text-slate-600 mt-1">
                            {selectedUser && currentUser?.email === selectedUser.email 
                                ? "Plan and schedule your tasks throughout the week"
                                : `Planning weekly schedule for ${selectedUser?.full_name || 'selected user'}`
                            }
                        </p>
                        <div className="print-show hidden text-sm text-slate-600 mt-2">
                            Generated on: {format(new Date(), 'PPP')} | 
                            Week: {weekDisplay} | 
                            User: {selectedUser?.full_name}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap print-hide">
                        <Button 
                            variant="outline" 
                            onClick={handlePrint}
                            className="bg-white"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Print Week
                        </Button>
                        <div className="w-full md:w-56 flex-shrink-0">
                            <Label htmlFor="user-select">Viewing For</Label>
                            <Select onValueChange={handleUserChange} value={selectedUser?.email || ''}>
                                <SelectTrigger id="user-select">
                                    <SelectValue placeholder="Select a user..." />
                                
                                </SelectTrigger>
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
                        {/* New Switch for showing/hiding weekends */}
                        <div className="flex items-center space-x-2">
                            <Switch id="show-weekends" checked={showWeekends} onCheckedChange={setShowWeekends} />
                            <Label htmlFor="show-weekends">Show Weekends</Label>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 print-hide">
                    <Button variant="outline" onClick={goToPreviousWeek}>
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Previous Week
                    </Button>
                    <div className="text-center">
                        <h2 className="text-lg font-semibold text-slate-900">{weekDisplay}</h2>
                        <Button variant="link" className="text-sm p-0 h-auto" onClick={goToCurrentWeek}>
                            Go to Today
                        </Button>
                    </div>
                    <Button variant="outline" onClick={goToNextWeek}>
                        Next Week
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>

            <DragDropContext onDragEnd={handleDropOnCalendar}>
                <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-6 mt-6 min-h-0 print-page">
                    <div className="xl:col-span-3 min-h-0 bg-white p-4 rounded-lg shadow-sm print-calendar">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full min-h-[400px] print-hide"><Loader2 className="w-8 h-8 animate-spin" /></div>
                        ) : (
                            <CalendarGrid 
                                weekDays={weekDates}
                                timeSlots={timeSlots}
                                events={weeklyEvents}
                                holidays={holidays}
                                workSchedules={workSchedules}
                                userTasks={tasks}
                                isLoading={isLoading}
                                onEventClick={handleEventClick}
                                onTimeSlotClick={handleTimeSlotClick}
                            />
                        )}
                    </div>
                    <div className="xl:col-span-1 flex flex-col gap-6 min-h-0 print-hide print-task-panel">
                        <TaskList
                            tasks={tasks}
                            isLoading={isLoading}
                            onScheduleClick={handleScheduleTask}
                        />
                    </div>
                </div>
            </DragDropContext>

            {/* Dialogs */}
            <div className="print-hide">
                {isScheduling && (
                    <ScheduleTaskDialog
                        open={isScheduling}
                        onClose={() => setIsScheduling(false)}
                        task={schedulingTask}
                        initialDate={schedulingDate}
                        onEventSaved={handleTaskScheduled}
                        user={selectedUser}
                    />
                )}

                {/* New ScheduleOptionsDialog (for time slot clicks) */}
                {isOptionsDialogOpen && (
                    <ScheduleOptionsDialog
                        open={isOptionsDialogOpen}
                        onClose={() => setIsOptionsDialogOpen(false)}
                        selectedDate={optionsDialogDate}
                        selectedTime={optionsDialogTime}
                        onCreateMeeting={handleCreateMeeting}
                        onCreateNewTask={handleCreateNewTask}
                        onScheduleAdHocTask={handleScheduleAdHocTask}
                        onScheduleRecurrenceTask={handleScheduleRecurrenceTask}
                    />
                )}

                {isTaskSelectorOpen && (
                    <TaskSelectionDialog
                        open={isTaskSelectorOpen}
                        onClose={() => setIsTaskSelectorOpen(false)}
                        tasks={tasks}
                        onTaskSelected={handleTaskSelectedForScheduling}
                        title={taskSelectorType === 'ad-hoc' ? 'Select an Ad-hoc Task to Schedule' : 'Select a Recurrence Task to Schedule'}
                        selectedDate={optionsDialogDate}
                        selectedTime={optionsDialogTime}
                    />
                )}

                {isCreateTaskOpen && (
                     <CreateEditTaskDialog
                        open={isCreateTaskOpen}
                        onClose={() => setIsCreateTaskOpen(false)}
                        onTaskSaved={handleTaskCreated}
                        user={selectedUser}
                        loggedInUser={currentUser}
                    />
                )}
            </div>
        </div>
    );
}
