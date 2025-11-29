
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from '@/entities/User';
import { UserTask } from '@/entities/UserTask';
import { UserVisibilitySetting } from '@/entities/UserVisibilitySetting';
import { AppUser } from '@/entities/AppUser';
import { WatchedTask } from '@/entities/WatchedTask'; // Added import for WatchedTask
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Download, Upload, Eye, EyeOff, User as UserIcon, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isSameDay, addDays, isPast, isToday, startOfDay, endOfDay } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

import CreateEditTaskDialog from '../components/myworkday/CreateEditTaskDialog';
import ViewHistoryDialog from '../components/myworkday/ViewHistoryDialog';
import ViewTaskDetailsDialog from '../components/myworkday/ViewTaskDetailsDialog';
import UserTaskTable from '../components/myworkday/UserTaskTable';
import MyWorkdayStats from '../components/myworkday/MyWorkdayStats';
import TimePeriodTaskStats from '../components/myworkday/TimePeriodTaskStats';
import PaginationControls from '../components/myworkday/PaginationControls';
import { logAction } from "@/components/lib/logger";
import { countWorkingDays, fetchUserWorkSchedule, fetchAllHolidays, isWorkingDay } from "@/components/lib/dateUtils";
import { calculateRecurrenceTaskActualNextDueDate } from '@/components/lib/recurrenceUtils';
import ImportTasksDialog from "../components/myworkday/ImportTasksDialog";
import { usePageAccess } from "@/components/lib/usePageAccess";

// Helper to get local YYYY-MM-DD string to avoid timezone issues
const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to parse YYYY-MM-DD string to a Date object set to local midnight
const parseDateStringAsLocalDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper function to add delay between API calls
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function MyWorkdayPage() {
    const { hasAccess, isLoading: isAccessLoading } = usePageAccess('MyWorkday');
    const [tasks, setTasks] = useState([]);
    
    // User selection states
    const [user, setUser] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [usersCache, setUsersCache] = useState({}); // Added users cache for passing to dialogs
    const [visibleUsers, setVisibleUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingTask, setEditingTask] = useState(null); 
    const [showHistoryDialog, setShowHistoryDialog] = useState(false);
    const [taskForHistory, setTaskForHistory] = useState(null);
    const [showCompleted, setShowCompleted] = useState(false);
    const [showCanceled, setShowCanceled] = useState(false);
    
    const [columnFilters, setColumnFilters] = useState({});
    const [statFilter, setStatFilter] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [daysNotReportedStreakData, setDaysNotReportedStreakData] = useState({});

    // Add missing sort state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc'); // Corrected to use useState

    const [showViewDetailsDialog, setShowViewDetailsDialog] = useState(false);
    const [taskForDetails, setTaskForDetails] = useState(null);

    // States for starred tasks, all visible tasks, and all watched task records
    const [starredTasks, setStarredTasks] = useState([]); 
    const [allVisibleTasks, setAllVisibleTasks] = useState([]);
    const [allWatchedTaskRecords, setAllWatchedTaskRecords] = useState([]); // All WatchedTask records from all users

    const [showImportDialog, setShowImportDialog] = useState(false);
    const [activeTab, setActiveTab] = useState("ad-hoc"); // Added to track active tab for export

    // Add new state for work schedule and holidays
    const [userWorkSchedule, setUserWorkSchedule] = useState([]);
    const [userHolidays, setUserHolidays] = useState([]);

    const loadTasks = useCallback(async (userEmail) => {
        if (!userEmail) return;
        try {
            const userTasks = await UserTask.filter({ assigned_to_user_email: userEmail });
            setTasks(userTasks);
        } catch (error) {
            console.error("Failed to load tasks:", error);
        }
    }, []);

    // Load starred tasks (tasks that current user has starred)
    const loadStarredTasks = useCallback(async (userEmail) => {
        if (!userEmail) return;
        
        try {
            const myWatchedTaskRecords = await WatchedTask.filter({ watcher_user_email: userEmail });
            const myWatchedTaskIds = myWatchedTaskRecords.map(wt => wt.watched_task_id);
            
            if (myWatchedTaskIds.length === 0) {
                setStarredTasks([]);
                return;
            }
            
            // Parallelize starred task fetching
            const starredTasksPromises = myWatchedTaskIds.map(async (taskId) => {
                try {
                    const task = await UserTask.filter({ id: taskId });
                    return task.length > 0 ? task[0] : null;
                } catch (error) {
                    console.warn(`Failed to load starred task ${taskId}:`, error);
                    return null;
                }
            });
            
            const starredTasksResults = await Promise.all(starredTasksPromises);
            const starredTasksData = starredTasksResults.filter(task => task !== null);
            setStarredTasks(starredTasksData);
        } catch (error) {
            console.error("Failed to load starred tasks:", error);
        }
    }, []);

    // Load all visible tasks (excluding current user's own tasks)
    const loadAllVisibleTasks = useCallback(async (userEmail) => {
        if (!userEmail) return;
        
        try {
            const visibilitySettings = await UserVisibilitySetting.filter({ viewer_user_email: userEmail });
            const visibleUserEmails = (visibilitySettings[0]?.visible_user_emails) || [];
            const emailsToQuery = Array.isArray(visibleUserEmails) ? visibleUserEmails : [];
            
            // Parallelize visible tasks fetching
            const visibleTasksPromises = emailsToQuery
                .filter(email => email !== userEmail) // Exclude current user's tasks
                .map(async (email) => {
                    try {
                        const userTasks = await UserTask.filter({ assigned_to_user_email: email });
                        return userTasks;
                    } catch (error) {
                        console.warn(`Failed to load tasks for ${email}:`, error);
                        return [];
                    }
                });
            
            const visibleTasksResults = await Promise.all(visibleTasksPromises);
            const allVisibleTasksData = visibleTasksResults.flat();
            setAllVisibleTasks(allVisibleTasksData);
        } catch (error) {
            console.error("Failed to load all visible tasks:", error);
        }
    }, []);

    // Load ALL WatchedTask records (from all users) to know which stars should be lit
    const loadAllWatchedTaskRecords = useCallback(async () => {
        try {
            const allWatchedRecords = await WatchedTask.list(); // Get ALL WatchedTask records
            setAllWatchedTaskRecords(allWatchedRecords);
        } catch (error) {
            console.error("Failed to load all watched task records:", error);
        }
    }, []);

    // Add function to load work schedule and holidays
    const loadUserWorkData = useCallback(async (userEmail) => {
        if (!userEmail) return;
        
        try {
            // Parallelize work schedule and holidays loading
            const [workSchedule, holidays] = await Promise.all([
                fetchUserWorkSchedule(userEmail),
                fetchAllHolidays(userEmail)
            ]);
            setUserWorkSchedule(workSchedule);
            setUserHolidays(holidays);
        } catch (error) {
            console.error("Failed to load user work data:", error);
        }
    }, []);

    // Combined initialization and data loading effect
    useEffect(() => {
        if (isAccessLoading) return; // Wait for access check
        if (!hasAccess) {
          setIsLoading(false);
          return;
        }

        const initializeAndLoadAllData = async () => {
            setIsLoading(true);
            try {
                // --- Phase 1: Core User and Visibility ---
                const loggedInUser = await User.me();
                if (!loggedInUser) {
                    setIsLoading(false);
                    return;
                }
                setCurrentUser(loggedInUser);
                setUser(loggedInUser);

                // Parallelize user and visibility data loading - removed User.list() call
                const [visibilitySettings, appUsers] = await Promise.all([
                    UserVisibilitySetting.filter({ viewer_user_email: loggedInUser.email }).catch(() => []),
                    AppUser.list().catch(() => [])
                ]);

                const visibleUserEmails = (visibilitySettings[0]?.visible_user_emails) || [];
                const visibleEmails = new Set(Array.isArray(visibleUserEmails) ? visibleUserEmails : []);
                visibleEmails.add(loggedInUser.email);

                // Create users map only from AppUser and current logged-in user
                const allUsersMap = new Map();
                appUsers.forEach(u => u?.email && allUsersMap.set(u.email, u));
                // Add the logged-in user to the map if not already present
                if (loggedInUser?.email && !allUsersMap.has(loggedInUser.email)) {
                    allUsersMap.set(loggedInUser.email, loggedInUser);
                }

                // Create users cache for dialogs
                const cache = {};
                allUsersMap.forEach((user, email) => {
                    cache[email] = user.full_name;
                    cache[user.id] = user.full_name;
                });
                setUsersCache(cache);

                const usersToDisplayInDropdown = [];
                visibleEmails.forEach(email => {
                    if (email && allUsersMap.has(email)) {
                        usersToDisplayInDropdown.push(allUsersMap.get(email));
                    }
                });
                
                if (!usersToDisplayInDropdown.some(u => u?.email === loggedInUser.email)) {
                    usersToDisplayInDropdown.push(loggedInUser);
                }
                
                usersToDisplayInDropdown.sort((a, b) => (a?.full_name || '').localeCompare(b?.full_name || ''));
                
                setAllUsers(Array.from(allUsersMap.values()));
                setVisibleUsers(usersToDisplayInDropdown);
                setSelectedUser(loggedInUser);
                
                // --- Phase 2: Load All Task Data in Parallel ---
                if (loggedInUser) {
                    await Promise.all([
                        loadTasks(loggedInUser.email),
                        loadStarredTasks(loggedInUser.email),
                        loadAllVisibleTasks(loggedInUser.email),
                        loadAllWatchedTaskRecords(),
                        loadUserWorkData(loggedInUser.email)
                    ]);
                }
            } catch (error) {
                console.error("Failed to initialize My Workday:", error);
                const loggedInUser = await User.me().catch(() => null);
                if (loggedInUser) {
                    setCurrentUser(loggedInUser);
                    setUser(loggedInUser);
                    setVisibleUsers([loggedInUser]);
                    setSelectedUser(loggedInUser);
                    // Create minimal users cache
                    setUsersCache({
                        [loggedInUser.email]: loggedInUser.full_name,
                        [loggedInUser.id]: loggedInUser.full_name
                    });
                }
            } finally {
                setIsLoading(false);
            }
        };

        initializeAndLoadAllData();
    }, [hasAccess, isAccessLoading, loadTasks, loadStarredTasks, loadAllVisibleTasks, loadAllWatchedTaskRecords, loadUserWorkData]);

    // Effect to load tasks and work data when selected user changes
    useEffect(() => {
        if (selectedUser) {
            // Parallelize task and work data loading for selected user
            Promise.all([
                loadTasks(selectedUser.email),
                loadUserWorkData(selectedUser.email)
            ]);
            setUser(selectedUser);
            setColumnFilters({});
            setStatFilter(null);
            setCurrentPage(1);
        }
    }, [selectedUser, loadTasks, loadUserWorkData]);

    // Modified effect for streak calculation with reduced processing
    useEffect(() => {
        let timeoutId;
        const calculateStreaks = async () => {
            if (!tasks || tasks.length === 0) {
                setDaysNotReportedStreakData({});
                return;
            }
            const streakData = {};
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Process tasks in smaller batches with reduced delay
            const batchSize = 10; // Increased batch size
            for (let i = 0; i < tasks.length; i += batchSize) {
                const batch = tasks.slice(i, i + batchSize);
                
                for (const task of batch) {
                    let streakStartDate;
                    try {
                        if (task.last_reported_date) {
                            const dateParts = task.last_reported_date.split('-').map(Number);
                            streakStartDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                        } else if (task.created_date) {
                            streakStartDate = new Date(task.created_date);
                        } else {
                            streakStartDate = new Date();
                        }
                        streakStartDate.setHours(0, 0, 0, 0);
                    } catch (e) {
                        console.error(`Error parsing date for task ${task.id}:`, e);
                        streakStartDate = new Date();
                        streakStartDate.setHours(0, 0, 0, 0);
                    }
                    
                    if (['Pending', 'In Progress'].includes(task.status) && streakStartDate < today) {
                        const dayAfterLastReport = addDays(streakStartDate, 1);
                        if (dayAfterLastReport > today) {
                             streakData[task.id] = 0;
                        } else {
                            try {
                                const workingDaysNotReported = await countWorkingDays(dayAfterLastReport, today);
                                streakData[task.id] = Math.max(0, workingDaysNotReported);
                            } catch (error) {
                                console.error(`Error calculating working days for task ${task.id}:`, error);
                                streakData[task.id] = 0;
                            }
                        }
                    } else {
                        streakData[task.id] = 0;
                    }
                }
                
                // Reduced delay between batches
                if (i + batchSize < tasks.length) {
                    await delay(100); // Reduced from 200ms to 100ms
                }
            }
            
            setDaysNotReportedStreakData(streakData);
        };

        // Reduced debounce time
        if (tasks && tasks.length > 0 && !isLoading) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                calculateStreaks();
            }, 200); // Reduced from 500ms to 200ms
        }

        return () => clearTimeout(timeoutId);
    }, [tasks, isLoading]);

    
    const handleTaskUpdate = (updatedTaskId, updatedFields) => {
        setTasks(currentTasks =>
            currentTasks.map(task =>
                task.id === updatedTaskId ? { ...task, ...updatedFields } : task
            )
        );
        
        // Also update starred and visible tasks if they contain this task
        setStarredTasks(currentStarredTasks =>
            currentStarredTasks.map(task =>
                task.id === updatedTaskId ? { ...task, ...updatedFields } : task
            )
        );
        
        setAllVisibleTasks(currentVisibleTasks =>
            currentVisibleTasks.map(task =>
                task.id === updatedTaskId ? { ...task, ...updatedFields } : task
            )
        );
    };

    const handleTaskSaved = () => {
        setShowCreateDialog(false);
        setEditingTask(null);
        if(selectedUser) loadTasks(selectedUser.email);
        // Reload starred and visible tasks as well
        if (currentUser) {
            loadStarredTasks(currentUser.email);
            loadAllVisibleTasks(currentUser.email);
            loadAllWatchedTaskRecords();
        }
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setShowCreateDialog(true);
    };

    const handleCreateTask = () => {
        setEditingTask(null);
        setShowCreateDialog(true);
    };

    const handleViewHistory = async (task) => {
        if (currentUser?.email === task.assigned_to_user_email && task.has_unseen_external_changes) {
            try {
                await UserTask.update(task.id, { has_unseen_external_changes: false });
                handleTaskUpdate(task.id, { has_unseen_external_changes: false });
            } catch (error) {
                console.error("Failed to mark task as seen:", error);
            }
        }
        setTaskForHistory(task);
        setShowHistoryDialog(true);
    };

    const handleViewTaskDetails = (task) => {
        setTaskForDetails(task);
        setShowViewDetailsDialog(true);
    };

    const handleEditFromDetails = (task) => {
        setShowViewDetailsDialog(false);
        setEditingTask(task);
        setShowCreateDialog(true);
    };
    
    const handleStatClick = (newFilter) => {
      const stringify = (obj) => JSON.stringify(obj || {});

      setStatFilter(currentFilter => {
        if (stringify(currentFilter) === stringify(newFilter)) {
          return null;
        }
        return newFilter;
      });
      setCurrentPage(1);
    };

    // Add handleSortChange function if missing
    const handleSortChange = useCallback((column, direction) => {
        setSortColumn(column);
        setSortDirection(direction);
        setCurrentPage(1); // Reset to first page when sorting changes
    }, []);

    const exportToCsv = (data, filename) => {
        if (!data || data.length === 0) {
            console.warn("No data to export.");
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(','),
          ...data.map(row => 
            headers.map(header => {
              let cell = row[header];
              if (cell === null || cell === undefined) return '';
              if (typeof cell === 'object') cell = JSON.stringify(cell);
              const strCell = String(cell); 
              if (strCell.includes(',') || strCell.includes('"') || strCell.includes('\n')) {
                return `"${strCell.replace(/"/g, '""')}"`; 
              }
              return strCell; 
            }).join(',')
          )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        logAction({
          action_type: 'EXPORT',
          target_entity: 'UserTask',
          details: { filename, record_count: data.length }
        });
    };

    const handleImport = () => {
        setShowImportDialog(true);
    };

    const handleTasksImported = () => {
        setShowImportDialog(false);
        if (selectedUser) {
            loadTasks(selectedUser.email);
        }
        // Also reload starred and visible tasks, and all watched records as they might be affected by import
        if (currentUser) {
            loadStarredTasks(currentUser.email);
            loadAllVisibleTasks(currentUser.email);
            loadAllWatchedTaskRecords();
        }
    };

    const handleExport = (exportType) => {
        let dataToExport = [];
        let filename = `my_workday_tasks_${new Date().toISOString().split('T')[0]}.csv`;

        if (exportType === 'all') {
            dataToExport = tasks; // All tasks for the selected user
            filename = `all_tasks_for_${selectedUser?.full_name?.replace(/\s/g, '_') || 'selected_user'}_${new Date().toISOString().split('T')[0]}.csv`;
        } else if (exportType === 'view') {
            switch (activeTab) {
                case 'ad-hoc':
                    dataToExport = adHocTasks;
                    filename = `ad_hoc_tasks_${selectedUser?.full_name?.replace(/\s/g, '_') || 'selected_user'}_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'recurring':
                    dataToExport = recurringTasks;
                    filename = `recurring_tasks_${selectedUser?.full_name?.replace(/\s/g, '_') || 'selected_user'}_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'watched':
                    // For 'watched' tab, 'Current View' defaults to 'starred' tasks sub-tab
                    dataToExport = processedStarredTasks;
                    filename = `starred_tasks_${currentUser?.full_name?.replace(/\s/g, '_') || 'current_user'}_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                default:
                    dataToExport = processedTasks; 
                    filename = `current_view_tasks_${selectedUser?.full_name?.replace(/\s/g, '_') || 'selected_user'}_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
            }
        } else {
            console.warn("Unknown export type:", exportType);
            return;
        }

        exportToCsv(dataToExport, filename);
    };


    const applyFilters = (data, filters) => {
        if (!data) return [];
        if (!filters || Object.keys(filters).length === 0) {
            return data;
        }
        
        return data.filter(item => {
            return Object.entries(filters).every(([columnKey, filterValue]) => {
                if (filterValue === null || filterValue === undefined || filterValue === '') {
                    return true;
                }

                if ((columnKey === 'status' || columnKey === 'priority') && typeof filterValue === 'string') {
                    return item[columnKey] === filterValue;
                }
                
                const filterConditions = filterValue;

                if (filterConditions.startDate || filterConditions.endDate) {
                    if (!item[columnKey]) return false;
                    const itemDate = new Date(item[columnKey]);
                    const startDate = filterConditions.startDate ? new Date(filterConditions.startDate) : null;
                    const endDate = filterConditions.endDate ? new Date(filterConditions.endDate) : null;

                    if (startDate) startDate.setHours(0, 0, 0, 0);
                    if (endDate) endDate.setHours(23, 59, 59, 999);
                    
                    if (startDate && itemDate < startDate) return false;
                    if (endDate && itemDate > endDate) return false;
                    return true;
                }

                if (Array.isArray(filterConditions)) {
                    let itemValue = item[columnKey];
                    
                    if (columnKey === 'days_active') {
                        itemValue = Math.floor((new Date() - new Date(item.created_date)) / (1000 * 60 * 60 * 24));
                    }
                    if (columnKey === 'days_due') {
                        if (!item.due_date) return true;
                        const today = new Date();
                        const due = new Date(item.due_date);
                        const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
                        itemValue = diffDays;
                    }
                    
                    itemValue = String(itemValue || '').toLowerCase();

                    let columnFilterResult = false;
                    let firstCondition = true;
                    for (let i = 0; i < filterConditions.length; i++) {
                        const condition = filterConditions[i];
                        const { operator, value, logical } = condition;
                        const filterValueLower = String(value || '').toLowerCase();
                        
                        let currentConditionMatches = false;
                        switch (operator) {
                            case 'contains': currentConditionMatches = itemValue.includes(filterValueLower); break;
                            case 'equals': currentConditionMatches = itemValue === filterValueLower; break;
                            case 'starts_with': currentConditionMatches = itemValue.startsWith(filterValueLower); break;
                            case 'ends_with': currentConditionMatches = itemValue.endsWith(filterValueLower); break;
                            case 'not_equals': currentConditionMatches = itemValue !== filterValueLower; break;
                            case 'is_empty': currentConditionMatches = itemValue === ''; break;
                            case 'is_not_empty': currentConditionMatches = itemValue !== ''; break;
                            default: currentConditionMatches = false;
                        }

                        if (firstCondition) {
                            columnFilterResult = currentConditionMatches;
                            firstCondition = false;
                        } else {
                            if (logical === 'and') columnFilterResult = columnFilterResult && currentConditionMatches;
                            else if (logical === 'or') columnFilterResult = columnFilterResult || currentConditionMatches;
                            else columnFilterResult = columnFilterResult && currentConditionMatches;
                            // Default behavior (no logical operator) is AND
                        }
                    }
                    return columnFilterResult;
                }
                
                return true;
            });
        });
    };

    // Modified dailyReportStatus to consider work schedule
    const dailyReportStatus = useMemo(() => {
        if (!tasks || !selectedUser) return {};
        const reportStatus = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check if today is a working day for the selected user
        const isTodayWorkingDay = isWorkingDay(today, selectedUser.email, userWorkSchedule, userHolidays);
        
        for (const task of tasks) {
            let hasReportedToday = false;
            if (task.last_reported_date) {
                try {
                    const dateParts = task.last_reported_date.split('-').map(Number);
                    const lastReportDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

                    if (isSameDay(lastReportDate, today)) {
                        hasReportedToday = true;
                    }
                } catch(e) {
                    console.error("Error parsing last_reported_date", task.last_reported_date);
                }
            }
            
            // Only require report if it's a working day AND task is active AND hasn't reported today
            const needsReportToday = isTodayWorkingDay && 
                                   ['Pending', 'In Progress'].includes(task.status) && 
                                   !hasReportedToday;
            reportStatus[task.id] = needsReportToday;
        }
        return reportStatus;
    }, [tasks, selectedUser, userWorkSchedule, userHolidays]);

    // Create a Map of all watched task IDs for quick lookup
    const watchedTaskIds = useMemo(() => {
        const watchedIds = new Set();
        allWatchedTaskRecords.forEach(record => {
            watchedIds.add(record.watched_task_id);
        });
        return watchedIds;
    }, [allWatchedTaskRecords]);

    // Create a Map of task IDs watched ONLY by current user (for All Visible Tasks tab)
    const currentUserWatchedTaskIds = useMemo(() => {
        const currentUserWatchedIds = new Set();
        allWatchedTaskRecords.forEach(record => {
            if (record.watcher_user_email === currentUser?.email) {
                currentUserWatchedIds.add(record.watched_task_id);
            }
        });
        return currentUserWatchedIds;
    }, [allWatchedTaskRecords, currentUser?.email]);

    // Extracted sorting logic for reusability
    const getSortedTasks = useCallback((data, sortCol, sortDir, streakData) => {
        if (!data) return [];
        if (!sortCol) {
            // Default sort by due_date if no specific column is selected
            return [...data].sort((a, b) => {
                const dateA = a.due_date ? parseDateStringAsLocalDate(a.due_date) : null;
                const dateB = b.due_date ? parseDateStringAsLocalDate(b.due_date) : null;
                
                if (dateA === null && dateB === null) return 0;
                if (dateA === null) return 1;
                if (dateB === null) return -1;
                return dateA.getTime() - dateB.getTime();
            });
        }

        return [...data].sort((a, b) => {
            let aValue, bValue;

            if (sortCol === '_days_active_') {
                aValue = Math.floor((new Date() - new Date(a.created_date)) / (1000 * 60 * 60 * 24));
                bValue = Math.floor((new Date() - new Date(b.created_date)) / (1000 * 60 * 60 * 24));
            } else if (sortCol === '_days_due_') {
                if (!a.due_date && !b.due_date) return 0;
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const aDue = parseDateStringAsLocalDate(a.due_date);
                const bDue = parseDateStringAsLocalDate(b.due_date);
                
                aValue = (aDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
                bValue = (bDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

            } else if (sortCol === '_days_not_reported_') {
                aValue = streakData[a.id] || 0;
                bValue = streakData[b.id] || 0;
            } else if (sortCol === '_time_completion_percentage_') {
                const aTimePercentage = a.estimated_time_minutes > 0 ? (a.total_time_spent_minutes || 0) / a.estimated_time_minutes * 100 : 0;
                const bTimePercentage = b.estimated_time_minutes > 0 ? (b.total_time_spent_minutes || 0) / b.estimated_time_minutes * 100 : 0;
                aValue = aTimePercentage;
                bValue = bTimePercentage;
            } else if (sortCol === '_calculated_next_due_date_') {
                const aNextDue = a.is_recurring ? calculateRecurrenceTaskActualNextDueDate(a) : null;
                const bNextDue = b.is_recurring ? calculateRecurrenceTaskActualNextDueDate(b) : null;
                
                if (!aNextDue && !bNextDue) return 0;
                if (!aNextDue) return sortDir === 'asc' ? 1 : -1;
                if (!bNextDue) return sortDir === 'asc' ? -1 : 1;
                
                const aDate = parseDateStringAsLocalDate(aNextDue);
                const bDate = parseDateStringAsLocalDate(bNextDue);

                if (!aDate && !bDate) return 0;
                if (!aDate) return sortDir === 'asc' ? 1 : -1;
                if (!bDate) return sortDir === 'asc' ? -1 : 1;

                aValue = aDate.getTime();
                bValue = bDate.getTime();
            } else {
                aValue = a[sortCol];
                bValue = b[sortCol];
                
                if (sortCol === 'reopen_count' || sortCol === 'due_date_change_count' || sortCol === 'completion_percentage') {
                    aValue = Number(aValue) || 0;
                    bValue = Number(bValue) || 0;
                }
            }

            if (sortCol !== 'due_date' && sortCol !== 'created_date' && sortCol !== 'updated_date' && sortCol !== '_calculated_next_due_date_') {
                if (aValue === null || aValue === undefined) aValue = 0;
                if (bValue === null || bValue === undefined) bValue = 0;
            }

            if (sortCol === 'due_date' || sortCol === 'created_date' || sortCol === 'updated_date' || sortCol === '_calculated_next_due_date_') {
                let dateA;
                if (sortCol === 'due_date') {
                    dateA = a.due_date ? parseDateStringAsLocalDate(a.due_date) : null;
                } else if (sortCol === '_calculated_next_due_date_') {
                    dateA = a.is_recurring ? parseDateStringAsLocalDate(calculateRecurrenceTaskActualNextDueDate(a)) : null;
                }
                else {
                    dateA = a[sortCol] ? new Date(a[sortCol]) : null;
                }

                let dateB;
                if (sortCol === 'due_date') {
                    dateB = b.due_date ? parseDateStringAsLocalDate(b.due_date) : null;
                } else if (sortCol === '_calculated_next_due_date_') {
                    dateB = b.is_recurring ? parseDateStringAsLocalDate(calculateRecurrenceTaskActualNextDueDate(b)) : null;
                }
                else {
                    dateB = b[sortCol] ? new Date(b[sortCol]) : null;
                }

                if (dateA === null && dateB === null) return 0;
                if (dateA === null) return sortDir === 'asc' ? 1 : -1;
                if (dateB === null) return sortDir === 'asc' ? -1 : 1;

                return sortDir === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
            }

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortDir === 'asc' ? aValue - bValue : bValue - aValue;
            }

            const strA = String(aValue);
            const strB = String(bValue);
            const comparison = strA.localeCompare(strB);
            return sortDir === 'asc' ? comparison : -comparison;
        });
    }, []); // Dependencies for this useCallback are handled by parameters

    // Process tasks for Ad-Hoc and Recurrence tabs (uses selected user's tasks)
    const processedTasks = useMemo(() => {
        if (!tasks) return [];
        let filteredTasks = applyFilters(tasks, columnFilters);
        
        if (!showCompleted) {
            filteredTasks = filteredTasks.filter(t => t.status !== 'Completed');
        }
        if (!showCanceled) {
            filteredTasks = filteredTasks.filter(t => t.status !== 'Canceled');
        }
        
        // Apply stat filters...
        if (statFilter) {
            filteredTasks = filteredTasks.filter(t => {
                let mainCondition = false;
                
                if (statFilter.field === 'overdue') {
                    mainCondition = t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date));
                } else if (statFilter.field === 'report_pending') {
                    if (!['Pending', 'In Progress'].includes(t.status)) {
                        mainCondition = false;
                    } else if (!t.last_reported_date) {
                        mainCondition = true;
                    } else {
                        mainCondition = !isSameDay(new Date(t.last_reported_date), new Date());
                    }
                } else if (statFilter.field === 'status' && statFilter.value === 'active') {
                    mainCondition = t.status !== 'Completed' && t.status !== 'Canceled';
                } else if (statFilter.field && statFilter.value) {
                    const tValue = t[statFilter.field];
                    const filterValue = statFilter.value;
                    if (filterValue === 'Not Set') {
                        mainCondition = tValue === null || tValue === undefined || tValue === '';
                    } else {
                        mainCondition = String(tValue) === String(filterValue);
                    }
                } else {
                    mainCondition = true; 
                }

                if (!mainCondition && statFilter.field) return false;

                if (statFilter.dateRange) {
                    const rangeStartDate = startOfDay(new Date(statFilter.dateRange.startDate));
                    const rangeEndDate = endOfDay(new Date(statFilter.dateRange.endDate));
                    
                    const taskCreated = new Date(t.created_date);
                    if (taskCreated > rangeEndDate) return false;
                    
                    if (statFilter.field === 'status' && statFilter.value === 'Completed') {
                        if (!t.completion_date) return false;
                        const completedDate = new Date(t.completion_date);
                        return completedDate >= rangeStartDate && completedDate <= rangeEndDate;
                    }
                    
                    if (statFilter.field === 'overdue') {
                        if (!t.due_date) return false;
                        const dueDate = new Date(t.due_date);
                        const completedDate = t.completion_date ? new Date(t.completion_date) : null;
                        
                        return dueDate < rangeEndDate && (!completedDate || completedDate >= rangeStartDate);
                    }
                    
                    if (statFilter.field === 'report_pending') {
                        if (!['Pending', 'In Progress'].includes(t.status)) return false;
                        const completedDate = t.completion_date ? new Date(t.completion_date) : null;
                        if (completedDate && completedDate < rangeEndDate) return false; 
                        
                        if (!t.last_reported_date) {
                            return taskCreated <= rangeEndDate; 
                        }
                        
                        const lastReportDate = new Date(t.last_reported_date);
                        return lastReportDate < rangeStartDate;
                    }
                    
                    if (statFilter.field === 'status' && statFilter.value === 'active') {
                        const completedDate = t.completion_date ? new Date(t.completion_date) : null;
                        return !completedDate || completedDate > rangeEndDate;
                    }

                    return taskCreated >= rangeStartDate && taskCreated <= rangeEndDate;
                }
                
                return mainCondition;
            });
        }
        return getSortedTasks(filteredTasks, sortColumn, sortDirection, daysNotReportedStreakData);
    }, [tasks, columnFilters, statFilter, showCompleted, showCanceled, sortColumn, sortDirection, daysNotReportedStreakData, getSortedTasks]);

    // Process starred tasks (independent of selected user)
    const processedStarredTasks = useMemo(() => {
        if (!starredTasks) return [];
        let filteredTasks = applyFilters(starredTasks, columnFilters);
        
        if (!showCompleted) {
            filteredTasks = filteredTasks.filter(t => t.status !== 'Completed');
        }
        if (!showCanceled) {
            filteredTasks = filteredTasks.filter(t => t.status !== 'Canceled');
        }
        
        // Apply sorting using the common helper function.
        // Note: daysNotReportedStreakData may not contain data for all starred tasks if they are not part of `selectedUser`'s tasks.
        return getSortedTasks(filteredTasks, sortColumn, sortDirection, daysNotReportedStreakData); 
    }, [starredTasks, columnFilters, showCompleted, showCanceled, sortColumn, sortDirection, daysNotReportedStreakData, getSortedTasks]);

    // Process all visible tasks (independent of selected user)
    const processedAllVisibleTasks = useMemo(() => {
        if (!allVisibleTasks) return [];
        let filteredTasks = applyFilters(allVisibleTasks, columnFilters);
        
        if (!showCompleted) {
            filteredTasks = filteredTasks.filter(t => t.status !== 'Completed');
        }
        if (!showCanceled) {
            filteredTasks = filteredTasks.filter(t => t.status !== 'Canceled');
        }
        
        // Apply sorting using the common helper function.
        // Note: daysNotReportedStreakData may not contain data for all visible tasks if they are not part of `selectedUser`'s tasks.
        return getSortedTasks(filteredTasks, sortColumn, sortDirection, daysNotReportedStreakData);
    }, [allVisibleTasks, columnFilters, showCompleted, showCanceled, sortColumn, sortDirection, daysNotReportedStreakData, getSortedTasks]);

    // Separate ad-hoc and recurrence tasks from the selected user's tasks
    const { adHocTasks, recurringTasks } = useMemo(() => {
        return {
            adHocTasks: processedTasks.filter(t => !t.is_recurring),
            recurringTasks: processedTasks.filter(t => t.is_recurring)
        };
    }, [processedTasks]);

    // Task counts for tabs
    const totalAdHocTasksCount = useMemo(() => {
        if (!tasks) return 0;
        return tasks.filter(t => !t.is_recurring).length;
    }, [tasks]);

    const totalRecurringTasksCount = useMemo(() => {
        if (!tasks) return 0;
        return tasks.filter(t => t.is_recurring).length;
    }, [tasks]);

    const totalStarredTasksCount = useMemo(() => {
        return starredTasks.length;
    }, [starredTasks]);

    const totalAllVisibleTasksCount = useMemo(() => {
        return allVisibleTasks.length;
    }, [allVisibleTasks]);

    // Pagination for each tab
    const paginatedAdHocTasks = useMemo(() => {
        if (itemsPerPage === 0) return adHocTasks;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return adHocTasks.slice(startIndex, startIndex + itemsPerPage);
    }, [adHocTasks, currentPage, itemsPerPage]);

    const paginatedRecurringTasks = useMemo(() => {
        if (itemsPerPage === 0) return recurringTasks;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return recurringTasks.slice(startIndex, startIndex + itemsPerPage);
    }, [recurringTasks, currentPage, itemsPerPage]);

    const paginatedStarredTasks = useMemo(() => {
        if (itemsPerPage === 0) return processedStarredTasks;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedStarredTasks.slice(startIndex, startIndex + itemsPerPage);
    }, [processedStarredTasks, currentPage, itemsPerPage]);

    const paginatedAllVisibleTasks = useMemo(() => {
        if (itemsPerPage === 0) return processedAllVisibleTasks;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedAllVisibleTasks.slice(startIndex, startIndex + itemsPerPage);
    }, [processedAllVisibleTasks, currentPage, itemsPerPage]);

    const handleUserChange = (userEmail) => {
        const userToSelect = allUsers.find(u => u.email === userEmail);
        if (userToSelect) {
            setSelectedUser(userToSelect);
        }
    };

    if (isAccessLoading || (isLoading && !selectedUser)) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (!hasAccess) {
        return null; // The usePageAccess hook will handle the redirect.
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-full mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">My Tasks</h1>
                        <p className="text-slate-600 mt-1">
                            {selectedUser && currentUser?.email === selectedUser.email 
                                ? "Manage and track all your personal tasks and assignments"
                                : `Managing tasks for ${selectedUser?.full_name || 'selected user'}`
                            }
                        </p>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                        <div className="w-full md:w-56">
                            <Label htmlFor="user-select">Viewing Tasks For</Label>
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="shadow-sm">
                                    <Download className="w-4 h-4 mr-2" />
                                    Actions
                                    <ChevronDown className="w-4 h-4 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleImport}>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Import Tasks (.csv)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('view')}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Export Current View (.csv)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('all')}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Export All Data (.csv)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={handleCreateTask} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-5 h-5 mr-2" />
                            New Task
                        </Button>
                    </div>
                </div>
                
                <MyWorkdayStats tasks={tasks || []} isLoading={isLoading} onStatClick={handleStatClick} />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="ad-hoc">Ad-Hoc Tasks ({totalAdHocTasksCount})</TabsTrigger>
                        <TabsTrigger value="recurring">Recurrence Tasks ({totalRecurringTasksCount})</TabsTrigger>
                        <TabsTrigger value="watched">Watched Tasks ({totalStarredTasksCount})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="ad-hoc">
                        <Card>
                            <CardContent className="p-4">
                                <TimePeriodTaskStats 
                                    tasks={tasks ? tasks.filter(t => !t.is_recurring) : []} 
                                    isLoading={isLoading} 
                                    onStatClick={handleStatClick}
                                    taskTypeLabel="Ad-Hoc Tasks" 
                                />
                                
                                <div className="flex items-center justify-between mt-8 mb-4">
                                     <h2 className="text-xl font-semibold text-slate-900">Ad-Hoc Tasks ({adHocTasks.length})</h2>
                                     <div className="flex items-center space-x-4">
                                        <div className="flex items-center space-x-2">
                                            <Switch 
                                                id="show-completed-adhoc" 
                                                checked={showCompleted} 
                                                onCheckedChange={setShowCompleted}
                                            />
                                            <Label htmlFor="show-completed-adhoc" className="text-sm font-normal">
                                                {showCompleted ? <Eye className="w-4 h-4 inline mr-1" /> : <EyeOff className="w-4 h-4 inline mr-1" />}
                                                Show Completed
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch 
                                                id="show-canceled-adhoc" 
                                                checked={showCanceled} 
                                                onCheckedChange={setShowCanceled}
                                            />
                                            <Label htmlFor="show-canceled-adhoc" className="text-sm font-normal">
                                                {showCanceled ? <Eye className="w-4 h-4 inline mr-1" /> : <EyeOff className="w-4 h-4 inline mr-1" />}
                                                Show Canceled
                                            </Label>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full overflow-x-auto">
                                    <UserTaskTable 
                                        tasks={paginatedAdHocTasks} 
                                        isLoading={isLoading} 
                                        onEdit={handleEditTask}
                                        onUpdate={handleTaskUpdate}
                                        onHistory={handleViewHistory}
                                        onViewDetails={handleViewTaskDetails}
                                        columnFilters={columnFilters}
                                        setColumnFilters={setColumnFilters}
                                        currentUser={currentUser}
                                        dailyReportStatus={dailyReportStatus}
                                        daysNotReportedStreakData={daysNotReportedStreakData}
                                        sortColumn={sortColumn}
                                        sortDirection={sortDirection}
                                        onSortChange={handleSortChange}
                                        isRecurrenceTasksView={false}
                                        watchedTaskIds={watchedTaskIds}
                                        allWatchedTaskRecords={allWatchedTaskRecords}
                                        onWatchedTasksUpdate={loadAllWatchedTaskRecords}
                                    />
                                </div>
                                <PaginationControls
                                    totalItems={adHocTasks.length}
                                    itemsPerPage={itemsPerPage}
                                    setItemsPerPage={setItemsPerPage}
                                    currentPage={currentPage}
                                    setCurrentPage={setCurrentPage}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="recurring">
                        <Card>
                            <CardContent>
                                 <TimePeriodTaskStats 
                                    tasks={tasks ? tasks.filter(t => t.is_recurring) : []} 
                                    isLoading={isLoading} 
                                    onStatClick={handleStatClick}
                                    taskTypeLabel="Recurrence Tasks" 
                                />
                                
                                <div className="flex items-center justify-between mt-8 mb-4">
                                     <h2 className="text-xl font-semibold text-slate-900">Recurrence Tasks ({recurringTasks.length})</h2>
                                     <div className="flex items-center space-x-4">
                                        <div className="flex items-center space-x-2">
                                            <Switch 
                                                id="show-completed-recurring" 
                                                checked={showCompleted} 
                                                onCheckedChange={setShowCompleted}
                                            />
                                            <Label htmlFor="show-completed-recurring" className="text-sm font-normal">
                                                {showCompleted ? <Eye className="w-4 h-4 inline mr-1" /> : <EyeOff className="w-4 h-4 inline mr-1" />}
                                                Show Completed
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch 
                                                id="show-canceled-recurring" 
                                                checked={showCanceled} 
                                                onCheckedChange={setShowCanceled}
                                            />
                                            <Label htmlFor="show-canceled-recurring" className="text-sm font-normal">
                                                {showCanceled ? <Eye className="w-4 h-4 inline mr-1" /> : <EyeOff className="w-4 h-4 inline mr-1" />}
                                                Show Canceled
                                            </Label>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full overflow-x-auto">
                                    <UserTaskTable 
                                        tasks={paginatedRecurringTasks} 
                                        isLoading={isLoading} 
                                        onEdit={handleEditTask}
                                        onUpdate={handleTaskUpdate}
                                        onHistory={handleViewHistory}
                                        onViewDetails={handleViewTaskDetails}
                                        columnFilters={columnFilters}
                                        setColumnFilters={setColumnFilters}
                                        currentUser={currentUser}
                                        dailyReportStatus={dailyReportStatus}
                                        daysNotReportedStreakData={daysNotReportedStreakData}
                                        sortColumn={sortColumn}
                                        sortDirection={sortDirection}
                                        onSortChange={handleSortChange}
                                        isRecurrenceTasksView={true}
                                        watchedTaskIds={watchedTaskIds}
                                        allWatchedTaskRecords={allWatchedTaskRecords}
                                        onWatchedTasksUpdate={loadAllWatchedTaskRecords}
                                    />
                                </div>
                                <PaginationControls
                                    totalItems={recurringTasks.length}
                                    itemsPerPage={itemsPerPage}
                                    setItemsPerPage={setItemsPerPage}
                                    currentPage={currentPage}
                                    setCurrentPage={setCurrentPage}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="watched">
                        <Card>
                            <CardContent>
                                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Eye className="w-5 h-5 text-blue-600" />
                                        <h3 className="text-lg font-semibold text-blue-900">Task Monitoring Overview</h3>
                                    </div>
                                    <p className="text-blue-800 text-sm mb-3">
                                        This section shows tasks that you're actively monitoring. Use the star (⭐) to mark specific tasks for watching.
                                    </p>
                                </div>

                                {/* Sub-tabs within Watched Tasks */}
                                <Tabs defaultValue="starred" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="starred">Starred Tasks ({totalStarredTasksCount})</TabsTrigger>
                                        <TabsTrigger value="visible">All Visible Tasks ({totalAllVisibleTasksCount})</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="starred">
                                        <div className="mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                                            <p className="text-yellow-800 text-sm">
                                                <strong>Starred Tasks:</strong> Tasks you have specifically marked with a star (⭐) for monitoring, regardless of who owns them.
                                            </p>
                                        </div>

                                        <TimePeriodTaskStats 
                                            tasks={starredTasks} 
                                            isLoading={isLoading} 
                                            onStatClick={handleStatClick}
                                            taskTypeLabel="Starred Tasks" 
                                        />

                                        <div className="flex items-center justify-between mt-8 mb-4">
                                             <h2 className="text-xl font-semibold text-slate-900">Starred Tasks ({processedStarredTasks.length})</h2>
                                             <div className="flex items-center space-x-4">
                                                <div className="flex items-center space-x-2">
                                                    <Switch 
                                                        id="show-completed-starred" 
                                                        checked={showCompleted} 
                                                        onCheckedChange={setShowCompleted}
                                                    />
                                                    <Label htmlFor="show-completed-starred" className="text-sm font-normal">
                                                        {showCompleted ? <Eye className="w-4 h-4 inline mr-1" /> : <EyeOff className="w-4 h-4 inline mr-1" />}
                                                        Show Completed
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch 
                                                        id="show-canceled-starred" 
                                                        checked={showCanceled} 
                                                        onCheckedChange={setShowCanceled}
                                                    />
                                                    <Label htmlFor="show-canceled-starred" className="text-sm font-normal">
                                                        {showCanceled ? <Eye className="w-4 h-4 inline mr-1" /> : <EyeOff className="w-4 h-4 inline mr-1" />}
                                                        Show Canceled
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full overflow-x-auto">
                                            <UserTaskTable 
                                                tasks={paginatedStarredTasks} 
                                                isLoading={isLoading} 
                                                onEdit={handleEditTask}
                                                onUpdate={handleTaskUpdate}
                                                onHistory={handleViewHistory}
                                                onViewDetails={handleViewTaskDetails}
                                                columnFilters={columnFilters}
                                                setColumnFilters={setColumnFilters}
                                                currentUser={currentUser}
                                                dailyReportStatus={dailyReportStatus}
                                                daysNotReportedStreakData={daysNotReportedStreakData}
                                                sortColumn={sortColumn}
                                                sortDirection={sortDirection}
                                                onSortChange={handleSortChange}
                                                isRecurrenceTasksView={false}
                                                isWatchedTasksView={true}
                                                watchedTaskIds={watchedTaskIds}
                                                allWatchedTaskRecords={allWatchedTaskRecords}
                                                onWatchedTasksUpdate={loadAllWatchedTaskRecords}
                                            />
                                        </div>
                                        <PaginationControls
                                            totalItems={processedStarredTasks.length}
                                            itemsPerPage={itemsPerPage}
                                            setItemsPerPage={setItemsPerPage}
                                            currentPage={currentPage}
                                            setCurrentPage={setCurrentPage}
                                        />
                                    </TabsContent>

                                    <TabsContent value="visible">
                                        <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
                                            <p className="text-green-800 text-sm">
                                                <strong>All Visible Tasks:</strong> Tasks from other users that you have permission to view (excludes your own tasks). Visibility is managed in Workspace Settings.
                                            </p>
                                        </div>

                                        <TimePeriodTaskStats 
                                            tasks={allVisibleTasks} 
                                            isLoading={isLoading} 
                                            onStatClick={handleStatClick}
                                            taskTypeLabel="All Visible Tasks" 
                                        />

                                        <div className="flex items-center justify-between mt-8 mb-4">
                                             <h2 className="text-xl font-semibold text-slate-900">All Visible Tasks ({processedAllVisibleTasks.length})</h2>
                                             <div className="flex items-center space-x-4">
                                                <div className="flex items-center space-x-2">
                                                    <Switch 
                                                        id="show-completed-visible" 
                                                        checked={showCompleted} 
                                                        onCheckedChange={setShowCompleted}
                                                    />
                                                    <Label htmlFor="show-completed-visible" className="text-sm font-normal">
                                                        {showCompleted ? <Eye className="w-4 h-4 inline mr-1" /> : <EyeOff className="w-4 h-4 inline mr-1" />}
                                                        Show Completed
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch 
                                                        id="show-canceled-visible" 
                                                        checked={showCanceled} 
                                                        onCheckedChange={setShowCanceled}
                                                    />
                                                    <Label htmlFor="show-canceled-visible" className="text-sm font-normal">
                                                        {showCanceled ? <Eye className="w-4 h-4 inline mr-1" /> : <EyeOff className="w-4 h-4 inline mr-1" />}
                                                        Show Canceled
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full overflow-x-auto">
                                            <UserTaskTable 
                                                tasks={paginatedAllVisibleTasks} 
                                                isLoading={isLoading} 
                                                onEdit={handleEditTask}
                                                onUpdate={handleTaskUpdate}
                                                onHistory={handleViewHistory}
                                                onViewDetails={handleViewTaskDetails}
                                                columnFilters={columnFilters}
                                                setColumnFilters={setColumnFilters}
                                                currentUser={currentUser}
                                                dailyReportStatus={dailyReportStatus}
                                                daysNotReportedStreakData={daysNotReportedStreakData}
                                                sortColumn={sortColumn}
                                                sortDirection={sortDirection}
                                                onSortChange={handleSortChange}
                                                isRecurrenceTasksView={false}
                                                isWatchedTasksView={true}
                                                watchedTaskIds={currentUserWatchedTaskIds}
                                                allWatchedTaskRecords={allWatchedTaskRecords}
                                                onWatchedTasksUpdate={loadAllWatchedTaskRecords}
                                            />
                                        </div>
                                        <PaginationControls
                                            totalItems={processedAllVisibleTasks.length}
                                            itemsPerPage={itemsPerPage}
                                            setItemsPerPage={setItemsPerPage}
                                            currentPage={currentPage}
                                            setCurrentPage={setCurrentPage}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {showCreateDialog && (
                <CreateEditTaskDialog
                    open={showCreateDialog}
                    onClose={() => {
                        setShowCreateDialog(false);
                        setEditingTask(null);
                    }}
                    onTaskSaved={handleTaskSaved}
                    task={editingTask}
                    user={user}
                    loggedInUser={currentUser}
                />
            )}
            {showHistoryDialog && (
                <ViewHistoryDialog
                    open={showHistoryDialog}
                    onClose={() => setShowHistoryDialog(false)}
                    task={taskForHistory}
                    usersCache={usersCache}
                />
            )}
            {showViewDetailsDialog && (
                <ViewTaskDetailsDialog
                    open={showViewDetailsDialog}
                    onClose={() => setShowViewDetailsDialog(false)}
                    task={taskForDetails}
                    onEdit={handleEditFromDetails}
                />
            )}
            <ImportTasksDialog
                open={showImportDialog}
                onClose={() => setShowImportDialog(false)}
                onTasksImported={handleTasksImported}
            />
        </div>
    );
}
