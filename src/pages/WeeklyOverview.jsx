
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Clock, CheckSquare, AlertTriangle, Repeat, CalendarX2, ListChecks, History, CalendarDays, ChevronLeft, ChevronRight, User as UserIcon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isSameDay, subWeeks, startOfDay, endOfDay } from 'date-fns';
import { User } from '@/entities/User';
import { AppUser } from '@/entities/AppUser'; // Added import for AppUser
import { UserTask } from '@/entities/UserTask';
import { ScheduledEvent } from '@/entities/ScheduledEvent';
import { UserTaskLog } from '@/entities/UserTaskLog';
import { AuditLog } from '@/entities/AuditLog';
import { UserVisibilitySetting } from '@/entities/UserVisibilitySetting';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    LineChart, Line, Cell, PieChart, Pie
} from 'recharts';

// Helper to get local YYYY-MM-DD string
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

export default function WeeklyOverviewPage() {
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [isLoading, setIsLoading] = useState(true);
    
    // User selection states
    const [currentUser, setCurrentUser] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [visibleUsers, setVisibleUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    
    // Data states
    const [allUserTasks, setAllUserTasks] = useState([]);
    const [allScheduledEvents, setAllScheduledEvents] = useState([]);
    const [allUserTaskLogs, setAllUserTaskLogs] = useState([]);
    const [allAuditLogs, setAllAuditLogs] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const currentWeekEnd = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart]);
    const weekDays = useMemo(() => eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd }), [currentWeekStart, currentWeekEnd]);
    const weekDisplay = `${format(currentWeekStart, 'dd MMM')} - ${format(currentWeekEnd, 'dd MMM, yyyy')}`;

    // Effect to load user information and set default selected user
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
                const visibleEmails = new Set(visibilitySettings[0]?.visible_user_emails || []);
                visibleEmails.add(loggedInUser.email); // Always ensure self is visible

                // Fetch all users from both AppUser and Platform User sources
                const appUsers = await AppUser.list();
                // Attempt to fetch platform users, fall back to just loggedInUser if permission denied or error
                const platformUsers = await User.list().catch((error) => {
                    console.warn("Failed to load all platform users (User.list()):", error);
                    return [loggedInUser]; // Fallback for non-admins or errors
                });

                // Create a combined map of all users for easy lookup, prioritizing User entity for full_name etc.
                const allUsersMap = new Map();
                platformUsers.forEach(u => u.email && allUsersMap.set(u.email, u));
                // Add AppUser data, but let User data override if email matches (or vice-versa depending on desired source of truth)
                // For this scenario, if AppUser contains specific details not in User, or vice versa, this merge handles it.
                // The order means AppUser data will be overridden by PlatformUser data if emails clash.
                // If AppUser is expected to be more complete for display, reverse the order.
                appUsers.forEach(u => u.email && allUsersMap.set(u.email, { ...allUsersMap.get(u.email), ...u }));


                // Construct the final list of users to display in the dropdown
                let usersToDisplayInDropdown = [];
                for (const email of visibleEmails) {
                    if (allUsersMap.has(email)) {
                        usersToDisplayInDropdown.push(allUsersMap.get(email));
                    }
                }
                
                // Double-check: Ensure loggedInUser is always present in the display list.
                // This handles edge cases where, for some reason, the loggedInUser wasn't in appUsers/platformUsers or allUsersMap.
                if (!usersToDisplayInDropdown.some(u => u.email === loggedInUser.email)) {
                    usersToDisplayInDropdown.push(loggedInUser);
                }

                // Sort by full name for better UX
                usersToDisplayInDropdown.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
                
                // Set the states
                setAllUsers(Array.from(allUsersMap.values())); // Keep all fetched users for `handleUserChange` lookup
                setVisibleUsers(usersToDisplayInDropdown);
                setSelectedUser(loggedInUser); // Default selection for data fetching
                
            } catch (error) {
                console.error("Failed to initialize Weekly Overview:", error);
            } finally {
                setIsLoading(false);
            }
        };
        initialize();
    }, []); // This effect runs once on mount to set up users and initial selectedUser

    const fetchData = useCallback(async () => {
        if (!selectedUser) return;
        setIsLoading(true);
        try {
            const tasksPromise = UserTask.filter({ assigned_to_user_email: selectedUser.email });
            const eventsPromise = ScheduledEvent.filter({ user_email: selectedUser.email });
            const userTaskLogsPromise = UserTaskLog.list();
            const auditLogsPromise = AuditLog.filter({ user_email: selectedUser.email });

            const [tasks, events, logs, audit] = await Promise.all([
                tasksPromise,
                eventsPromise,
                userTaskLogsPromise.catch(() => []), // Catch errors for logs as it's a general list
                auditLogsPromise.catch(() => [])
            ]);

            setAllUserTasks(tasks);
            setAllScheduledEvents(events);
            setAllUserTaskLogs(logs);
            setAllAuditLogs(audit);
        } catch (error) {
            console.error("Failed to fetch data for weekly overview:", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedUser]); // This effect re-fetches data whenever the selectedUser changes

    // Effect to fetch data when selected user changes
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUserChange = (userEmail) => {
        const userToSelect = allUsers.find(u => u.email === userEmail);
        if (userToSelect) {
            setSelectedUser(userToSelect);
        }
    };
    
    // Filter tasks and events for current week
    const weeklyTasks = useMemo(() => {
        return allUserTasks.filter(task => {
            const createdDate = new Date(task.created_date);
            const completionDate = task.completion_date ? new Date(task.completion_date) : null;
            const updatedDate = new Date(task.updated_date);
            
            return (createdDate >= currentWeekStart && createdDate <= currentWeekEnd) ||
                   (completionDate && completionDate >= currentWeekStart && completionDate <= currentWeekEnd) ||
                   (updatedDate >= currentWeekStart && updatedDate <= currentWeekEnd);
        });
    }, [allUserTasks, currentWeekStart, currentWeekEnd]);

    const weeklyEvents = useMemo(() => {
        return allScheduledEvents.filter(event => {
            const eventDate = parseDateStringAsLocalDate(event.scheduled_date);
            return eventDate && eventDate >= currentWeekStart && eventDate <= currentWeekEnd;
        });
    }, [allScheduledEvents, currentWeekStart, currentWeekEnd]);

    // Calculate KPIs
    const weeklyKPIs = useMemo(() => {
        const completedTasks = allUserTasks.filter(task => 
            task.status === 'Completed' && 
            task.completion_date &&
            new Date(task.completion_date) >= currentWeekStart && 
            new Date(task.completion_date) <= currentWeekEnd
        );

        // For total time spent, we need to filter logs by tasks assigned to the selected user
        const totalTimeSpent = weeklyEvents.reduce((total, event) => 
            total + (event.time_spent_minutes || 0), 0
        ) + allUserTaskLogs.filter(log => {
            const logDate = new Date(log.created_date);
            const relatedTask = allUserTasks.find(task => task.id === log.user_task_id);
            return relatedTask && logDate >= currentWeekStart && logDate <= currentWeekEnd;
        }).reduce((total, log) => total + (log.time_spent_in_log_minutes || 0), 0);

        const dueTasks = allUserTasks.filter(task => {
            const dueDate = task.due_date ? parseDateStringAsLocalDate(task.due_date) : null;
            return dueDate && dueDate >= currentWeekStart && dueDate <= currentWeekEnd;
        });

        const overdueTasks = dueTasks.filter(task => {
            const dueDate = parseDateStringAsLocalDate(task.due_date);
            const today = startOfDay(new Date());
            return dueDate < today && task.status !== 'Completed';
        });

        const reopenedTasks = allUserTasks.filter(task => 
            task.reopen_count > 0 && 
            new Date(task.updated_date) >= currentWeekStart && 
            new Date(task.updated_date) <= currentWeekEnd
        );

        const dueDateChanges = allUserTasks.filter(task => 
            task.due_date_change_count > 0 && 
            new Date(task.updated_date) >= currentWeekStart && 
            new Date(task.updated_date) <= currentWeekEnd
        ).reduce((total, task) => total + task.due_date_change_count, 0);

        const completionRate = dueTasks.length > 0 ? 
            (completedTasks.filter(task => dueTasks.some(dt => dt.id === task.id)).length / dueTasks.length) * 100 : 0;

        const totalActiveTasks = allUserTasks.filter(task => 
            !['Completed', 'Canceled'].includes(task.status)
        ).length;

        const totalReportPendingTasks = allUserTasks.filter(task => {
            if (!['Pending', 'In Progress'].includes(task.status)) return false;
            if (!task.last_reported_date) return true;
            return !isSameDay(new Date(task.last_reported_date), new Date());
        }).length;

        // NEW KPI CALCULATIONS
        const onTimeCompletedTasks = completedTasks.filter(task => {
            const dueDate = task.due_date ? parseDateStringAsLocalDate(task.due_date) : null;
            const completionDate = parseDateStringAsLocalDate(task.completion_date);
            return dueDate && completionDate && completionDate <= dueDate;
        });
        const onTimeCompletionRate = dueTasks.length > 0 ? 
            (onTimeCompletedTasks.length / dueTasks.length) * 100 : 100;

        const newOverdueTasks = allUserTasks.filter(task => {
            const dueDate = task.due_date ? parseDateStringAsLocalDate(task.due_date) : null;
            if (!dueDate || task.status === 'Completed' || task.status === 'Canceled') return false;
            
            const today = startOfDay(new Date());
            return dueDate >= currentWeekStart && dueDate <= currentWeekEnd && dueDate < today;
        });

        const completedTasksWithEstimates = completedTasks.filter(task => 
            task.estimated_time_minutes && task.total_time_spent_minutes
        );
        const totalEstimatedTime = completedTasksWithEstimates.reduce((sum, task) => 
            sum + task.estimated_time_minutes, 0);
        const totalActualTime = completedTasksWithEstimates.reduce((sum, task) => 
            sum + task.total_time_spent_minutes, 0);
        const timeEstimationAccuracy = totalEstimatedTime > 0 ? 
            (totalActualTime / totalEstimatedTime) * 100 : 100;

        const activeTasks = allUserTasks.filter(task => 
            ['Pending', 'In Progress'].includes(task.status)
        );
        const tasksWithRecentReports = activeTasks.filter(task => {
            if (!task.last_reported_date) return false;
            const lastReported = new Date(task.last_reported_date);
            const daysSinceReport = Math.floor((new Date() - lastReported) / (1000 * 60 * 60 * 24));
            return daysSinceReport <= 2;
        });
        const progressReportingConsistency = activeTasks.length > 0 ? 
            (tasksWithRecentReports.length / activeTasks.length) * 100 : 100;

        const tasksCompletedThisWeek = completedTasks.length;
        const tasksReopenedThisWeek = reopenedTasks.length;
        const taskReopenRate = tasksCompletedThisWeek > 0 ? 
            (tasksReopenedThisWeek / tasksCompletedThisWeek) * 100 : 0;

        return {
            completedTasks: completedTasks.length,
            totalTimeSpent: Math.round(totalTimeSpent),
            completionRate: Math.round(completionRate),
            overdueTasks: overdueTasks.length,
            reopenedTasks: reopenedTasks.length,
            dueDateChanges,
            totalActiveTasks,
            totalReportPendingTasks,
            
            onTimeCompletionRate: Math.round(onTimeCompletionRate * 10) / 10,
            newOverdueTasks: newOverdueTasks.length,
            timeEstimationAccuracy: Math.round(timeEstimationAccuracy * 10) / 10,
            progressReportingConsistency: Math.round(progressReportingConsistency * 10) / 10,
            taskReopenRate: Math.round(taskReopenRate * 10) / 10,
            
            hasTasksWithEstimates: completedTasksWithEstimates.length > 0
        };
    }, [allUserTasks, allUserTaskLogs, weeklyEvents, currentWeekStart, currentWeekEnd]);

    // Daily breakdown data for charts
    const dailyData = useMemo(() => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        return weekDays.map(day => {
            const dayString = getLocalDateString(day);
            const endOfCurrentDay = endOfDay(day);
            const startOfCurrentDay = startOfDay(day);

            const dayCompletedTasks = allUserTasks.filter(task =>
                task.status === 'Completed' &&
                task.completion_date &&
                isSameDay(parseDateStringAsLocalDate(task.completion_date), day)
            ).length;

            const dayTimeSpent = weeklyEvents.filter(event =>
                event.scheduled_date === dayString
            ).reduce((total, event) => total + (event.time_spent_minutes || 0), 0) +
            allUserTaskLogs.filter(log => {
                const logDate = new Date(log.created_date);
                const relatedTask = allUserTasks.find(task => task.id === log.user_task_id);
                return relatedTask && isSameDay(logDate, day);
            }).reduce((total, log) => total + (log.time_spent_in_log_minutes || 0), 0);

            const isFutureDate = day > today;
            
            const dayActiveTasks = isFutureDate ? 0 : allUserTasks.filter(task => {
                const created = new Date(task.created_date);
                return !['Completed', 'Canceled'].includes(task.status) && created <= endOfCurrentDay;
            }).length;

            const dayReportPendingTasks = isFutureDate ? 0 : allUserTasks.filter(task => {
                const created = new Date(task.created_date);
                
                if (!['Pending', 'In Progress'].includes(task.status)) return false;
                if (created > endOfCurrentDay) return false;

                const hasReportedOnThisDay = allUserTaskLogs.some(log =>
                    log.user_task_id === task.id && isSameDay(new Date(log.created_date), day)
                );
                
                return !hasReportedOnThisDay;
            }).length;

            return {
                day: format(day, 'EEE'),
                date: dayString,
                completedTasks: dayCompletedTasks,
                timeSpent: Math.round(dayTimeSpent / 60 * 10) / 10,
                activeTasks: dayActiveTasks,
                reportPendingTasks: dayReportPendingTasks
            };
        });
    }, [weekDays, allUserTasks, weeklyEvents, allUserTaskLogs]);

    // Priority breakdown
    const priorityData = useMemo(() => {
        const priorities = { High: 0, Medium: 0, Low: 0 };
        weeklyTasks.forEach(task => {
            if (priorities.hasOwnProperty(task.priority)) {
                priorities[task.priority]++;
            }
        });

        return Object.entries(priorities).map(([priority, count]) => ({
            name: priority,
            value: count,
            fill: priority === 'High' ? '#ef4444' : priority === 'Medium' ? '#f59e0b' : '#10b981'
        }));
    }, [weeklyTasks]);

    // Daily actions history
    const dailyActions = useMemo(() => {
        const selectedDateString = getLocalDateString(selectedDate);
        
        const taskActions = allUserTaskLogs.filter(log => {
            const logDate = getLocalDateString(new Date(log.created_date));
            const relatedTask = allUserTasks.find(t => t.id === log.user_task_id);
            return relatedTask && logDate === selectedDateString;
        }).map(log => {
            const relatedTask = allUserTasks.find(t => t.id === log.user_task_id);
            const taskTitle = relatedTask ? relatedTask.title : 'Unknown Task';
            
            return {
                time: format(new Date(log.created_date), 'HH:mm'),
                type: 'Task Progress',
                description: `Progress on "${taskTitle}": ${log.progress_notes}`,
                timestamp: new Date(log.created_date)
            };
        });

        const auditActions = allAuditLogs.filter(log => {
            const logDate = getLocalDateString(new Date(log.created_date));
            return logDate === selectedDateString;
        }).map(log => {
            let description = `${log.action_type} on ${log.target_entity}`;
            
            if (log.details) {
                const details = log.details;
                const title = details.title || details.title_english;
                const code = details.code;
                const approvalAction = details.approval_action;

                if (approvalAction) {
                    let subject = title ? `template "${title}"` : `a template`;
                    description = `${approvalAction} ${subject}`;
                    if(details.notes) description += ` (Notes: ${details.notes})`;
                } else if (title) {
                    const formattedActionType = log.action_type.charAt(0).toUpperCase() + log.action_type.slice(1).toLowerCase();
                    const formattedTargetEntity = log.target_entity.replace(/([A-Z])/g, ' $1').toLowerCase();
                    description = `${formattedActionType} ${formattedTargetEntity}: "${title}"`;
                } else if (code) {
                    const formattedActionType = log.action_type.charAt(0).toUpperCase() + log.action_type.slice(1).toLowerCase();
                    const formattedTargetEntity = log.target_entity.replace(/([A-Z])/g, ' $1').toLowerCase();
                    description = `${formattedActionType} ${formattedTargetEntity}: "${code}"`;
                } else if (details.changes && log.target_entity === 'UserTask') {
                    const relatedTask = allUserTasks.find(t => t.id === log.target_id);
                    if (relatedTask) {
                        const changedFields = Object.keys(details.changes);
                        description = `Updated task "${relatedTask.title}"`;
                        if (changedFields.length > 0) {
                            description += ` (${changedFields.join(', ')})`;
                        }
                    } else {
                        description = `Updated user task (${Object.keys(details.changes || {}).join(', ')})`;
                    }
                } else {
                    const formattedActionType = log.action_type.charAt(0).toUpperCase() + log.action_type.slice(1).toLowerCase();
                    const formattedTargetEntity = log.target_entity.replace(/([A-Z])/g, ' $1').toLowerCase();
                    description = `${formattedActionType} ${formattedTargetEntity}`;
                }
            }

            return {
                time: format(new Date(log.created_date), 'HH:mm'),
                type: log.action_type,
                description: description,
                timestamp: new Date(log.created_date)
            };
        });

        const eventActions = weeklyEvents.filter(event => 
            event.scheduled_date === selectedDateString && event.status === 'Completed'
        ).map(event => ({
            time: event.start_time,
            type: 'Event Completed',
            description: event.title,
            timestamp: new Date(`${event.scheduled_date}T${event.start_time || '00:00'}`)
        }));

        return [...taskActions, ...auditActions, ...eventActions]
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [selectedDate, allUserTaskLogs, allAuditLogs, weeklyEvents, allUserTasks]);

    const handlePreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    const handleThisWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // Show full-page loading spinner only if selectedUser is not yet determined (initial load)
    if (isLoading && !selectedUser) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6 relative">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">My Week Productivity</h1>
                        <p className="text-slate-600 mt-1">
                            {selectedUser && currentUser?.email === selectedUser.email 
                                ? "Performance metrics and analytics for your productivity"
                                : `Viewing productivity for ${selectedUser?.full_name || 'selected user'}`
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                         <div className="w-full sm:w-56">
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
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={handleThisWeek}>This Week</Button>
                            <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={handleNextWeek}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                            <div className="font-semibold text-slate-700 w-48 text-center">{weekDisplay}</div>
                        </div>
                    </div>
                </div>

                {isLoading && selectedUser && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                    </div>
                )}

                {/* Performance KPI Cards - MOVED TO TOP */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Performance & Quality Metrics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4 text-green-600" />
                                    On-Time Rate
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${weeklyKPIs.onTimeCompletionRate >= 90 ? 'text-green-600' : weeklyKPIs.onTimeCompletionRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {weeklyKPIs.onTimeCompletionRate.toFixed(1)}%
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Tasks completed on time</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                    New Overdue
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${weeklyKPIs.newOverdueTasks === 0 ? 'text-green-600' : weeklyKPIs.newOverdueTasks <= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {weeklyKPIs.newOverdueTasks}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Tasks that became overdue</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-600" />
                                    Time Accuracy
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${Math.abs(weeklyKPIs.timeEstimationAccuracy - 100) <= 20 ? 'text-green-600' : Math.abs(weeklyKPIs.timeEstimationAccuracy - 100) <= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {weeklyKPIs.timeEstimationAccuracy.toFixed(1)}%
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Estimation vs actual time</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <History className="w-4 h-4 text-purple-600" />
                                    Reporting Rate
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${weeklyKPIs.progressReportingConsistency >= 80 ? 'text-green-600' : weeklyKPIs.progressReportingConsistency >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {weeklyKPIs.progressReportingConsistency.toFixed(1)}%
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Tasks with recent progress</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Repeat className="w-4 h-4 text-orange-600" />
                                    Reopen Rate
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${weeklyKPIs.taskReopenRate === 0 ? 'text-green-600' : weeklyKPIs.taskReopenRate <= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {weeklyKPIs.taskReopenRate.toFixed(1)}%
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Completed tasks reopened</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Basic KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-green-600" />
                                Completed Tasks
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{weeklyKPIs.completedTasks}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                Time Spent
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                {Math.floor(weeklyKPIs.totalTimeSpent / 60)}h {weeklyKPIs.totalTimeSpent % 60}m
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-purple-600" />
                                Completion Rate
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">{weeklyKPIs.completionRate}%</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                Overdue Tasks
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{weeklyKPIs.overdueTasks}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Repeat className="w-4 h-4 text-orange-600" />
                                Reopens
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{weeklyKPIs.reopenedTasks}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <CalendarX2 className="w-4 h-4 text-yellow-600" />
                                Due Date Changes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{weeklyKPIs.dueDateChanges}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <ListChecks className="w-4 h-4 text-indigo-600" />
                                Active Tasks
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-indigo-600">{weeklyKPIs.totalActiveTasks}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                Report Pending
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{weeklyKPIs.totalReportPendingTasks}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Task Completion</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dailyData}>
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="completedTasks" fill="#10b981" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Time Spent (Hours)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={dailyData}>
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="timeSpent" stroke="#3b82f6" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Active Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dailyData}>
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="activeTasks" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Report Pending Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dailyData}>
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="reportPendingTasks" fill="#ffc658" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Priority Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={priorityData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        dataKey="value"
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {priorityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="w-5 h-5" />
                                Daily Actions History
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={getLocalDateString(selectedDate)}
                                    onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
                                    className="px-3 py-1 border rounded text-sm"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-72 overflow-y-auto space-y-2">
                                {dailyActions.length === 0 ? (
                                    <p className="text-slate-500 text-sm">No actions recorded for this date.</p>
                                ) : (
                                    dailyActions.map((action, index) => (
                                        <div key={index} className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg">
                                            <div className="text-xs text-slate-500 font-mono min-w-12">
                                                {action.time}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-slate-900">{action.type}</div>
                                                <div className="text-xs text-slate-600">{action.description}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Enhanced Weekly Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>Weekly Summary & Performance Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="prose prose-sm max-w-none space-y-3">
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-2">📊 Task Completion Overview</h4>
                                <p>
                                    This week you completed <strong>{weeklyKPIs.completedTasks} tasks</strong> and 
                                    spent a total of <strong>{Math.floor(weeklyKPIs.totalTimeSpent / 60)} hours and {weeklyKPIs.totalTimeSpent % 60} minutes</strong> on 
                                    your activities.
                                </p>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-2">⏰ Time Management Performance</h4>
                                <p>
                                    Your on-time completion rate was <strong className={weeklyKPIs.onTimeCompletionRate >= 90 ? 'text-green-600' : weeklyKPIs.onTimeCompletionRate >= 70 ? 'text-yellow-600' : 'text-red-600'}>{weeklyKPIs.onTimeCompletionRate.toFixed(1)}%</strong>.
                                    {weeklyKPIs.onTimeCompletionRate >= 90 && " Excellent work meeting your deadlines!"}
                                    {weeklyKPIs.onTimeCompletionRate >= 70 && weeklyKPIs.onTimeCompletionRate < 90 && " Good performance, but there's room for improvement in meeting deadlines."}
                                    {weeklyKPIs.onTimeCompletionRate < 70 && " Consider reviewing your time estimation and task prioritization."}
                                </p>
                                
                                {weeklyKPIs.hasTasksWithEstimates && weeklyKPIs.timeEstimationAccuracy !== 100 && (
                                    <p>
                                        Your time estimation accuracy was <strong className={Math.abs(weeklyKPIs.timeEstimationAccuracy - 100) <= 20 ? 'text-green-600' : Math.abs(weeklyKPIs.timeEstimationAccuracy - 100) <= 40 ? 'text-yellow-600' : 'text-red-600'}>{weeklyKPIs.timeEstimationAccuracy.toFixed(1)}%</strong> of your estimates.
                                        {weeklyKPIs.timeEstimationAccuracy > 120 && " You're working faster than expected - consider if you're underestimating task complexity."}
                                        {weeklyKPIs.timeEstimationAccuracy < 80 && " Tasks are taking longer than estimated - consider breaking them down further or adding buffer time."}
                                        {weeklyKPIs.timeEstimationAccuracy >= 80 && weeklyKPIs.timeEstimationAccuracy <= 120 && " Your time estimates are quite accurate!"}
                                    </p>
                                )}
                                {weeklyKPIs.newOverdueTasks > 0 && (
                                    <p className={`mt-1 ${weeklyKPIs.newOverdueTasks === 0 ? 'text-green-600' : weeklyKPIs.newOverdueTasks <= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        <strong className="font-bold">{weeklyKPIs.newOverdueTasks}</strong> new tasks became overdue this week.
                                    </p>
                                )}
                                {weeklyKPIs.dueDateChanges > 0 && (
                                    <p className="mt-1 text-yellow-600">
                                        There were <strong>{weeklyKPIs.dueDateChanges} due date changes</strong> this week, 
                                        suggesting potential scheduling challenges.
                                    </p>
                                )}
                            </div>
                            
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-2">📈 Quality & Consistency Metrics</h4>
                                {weeklyKPIs.taskReopenRate > 0 ? (
                                    <p className="text-orange-600">
                                        <strong>{weeklyKPIs.taskReopenRate.toFixed(1)}%</strong> of your completed tasks were reopened, 
                                        which may indicate the need for more thorough completion or better definition of "done".
                                    </p>
                                ) : (
                                    <p className="text-green-600">
                                        Great job! None of your completed tasks needed to be reopened this week.
                                    </p>
                                )}
                                
                                <p>
                                    Your progress reporting consistency is at <strong className={weeklyKPIs.progressReportingConsistency >= 80 ? 'text-green-600' : weeklyKPIs.progressReportingConsistency >= 60 ? 'text-yellow-600' : 'text-red-600'}>{weeklyKPIs.progressReportingConsistency.toFixed(1)}%</strong>.
                                    {weeklyKPIs.progressReportingConsistency >= 80 && " Excellent job keeping your task progress up to date!"}
                                    {weeklyKPIs.progressReportingConsistency >= 60 && weeklyKPIs.progressReportingConsistency < 80 && " Consider updating task progress more frequently for better tracking."}
                                    {weeklyKPIs.progressReportingConsistency < 60 && " Regular progress updates will help you stay on top of your workload."}
                                </p>
                            </div>
                            
                            {(weeklyKPIs.newOverdueTasks === 0 && weeklyKPIs.reopenedTasks === 0 && weeklyKPIs.dueDateChanges === 0 && weeklyKPIs.onTimeCompletionRate >= 90) && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <h4 className="font-semibold text-green-800 mb-1">🎉 Exceptional Performance!</h4>
                                    <p className="text-green-700 text-sm">
                                        Outstanding work this week! You maintained excellent time management, 
                                        quality standards, and consistency across all metrics.
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
