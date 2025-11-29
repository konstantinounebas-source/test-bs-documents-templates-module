import { addDays, addWeeks, addMonths, startOfMonth, endOfMonth, getDay, setDate, format, isBefore, isAfter, isSameDay } from 'date-fns';

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

// Helper to convert day of week string to number (0 = Sunday, 1 = Monday, etc.)
const getDayOfWeekNumber = (dayOfWeekString) => {
    const dayMap = {
        'SUNDAY': 0,
        'MONDAY': 1,
        'TUESDAY': 2,
        'WEDNESDAY': 3,
        'THURSDAY': 4,
        'FRIDAY': 5,
        'SATURDAY': 6
    };
    return dayMap[dayOfWeekString] || 1;
};

// Helper to find the Nth occurrence of a specific day in a month
const findNthDayOfWeekInMonth = (monthStart, targetDayOfWeek, ordinal) => {
    const firstDay = startOfMonth(monthStart);
    const lastDay = endOfMonth(monthStart);
    
    if (ordinal === 'LAST') {
        let date = lastDay;
        while (getDay(date) !== targetDayOfWeek) {
            date = addDays(date, -1);
            if (date < firstDay) {
                return null; 
            }
        }
        return date;
    }
    
    const ordinalMap = { 'FIRST': 1, 'SECOND': 2, 'THIRD': 3, 'FOURTH': 4 };
    const targetOccurrence = ordinalMap[ordinal] || 1;
    
    let date = firstDay;
    let occurrence = 0;
    
    while (date <= lastDay) {
        if (getDay(date) === targetDayOfWeek) {
            occurrence++;
            if (occurrence === targetOccurrence) {
                return date;
            }
        }
        date = addDays(date, 1);
    }
    
    return null;
};

// Generate all occurrences of a recurring task from start date
const generateRecurringTaskOccurrences = (task) => {
    if (!task.is_recurring || task.recurrence_pattern === 'None') {
        return [];
    }

    const startDate = task.recurrence_start_date ? 
        parseDateStringAsLocalDate(task.recurrence_start_date) : 
        (task.start_date ? parseDateStringAsLocalDate(task.start_date) : new Date());
    
    if (!startDate) return [];
    
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = task.recurrence_end_date ? parseDateStringAsLocalDate(task.recurrence_end_date) : null;
    const maxOccurrences = task.max_occurrences || null;
    
    const occurrences = [];
    let currentIterationAnchorDate = new Date(startDate);
    let occurrenceCount = 0;
    
    // Safety limit to prevent infinite loops
    const safetyLimit = 1000;
    let iterations = 0;

    while (iterations < safetyLimit) {
        let potentialOccurrenceDate = null;

        switch (task.recurrence_pattern) {
            case 'Daily':
                potentialOccurrenceDate = new Date(currentIterationAnchorDate);
                currentIterationAnchorDate = addDays(currentIterationAnchorDate, 1);
                break;
                
            case 'Weekly': {
                const weeklyInterval = task.recurrence_interval || 1;
                const targetDayOfWeek = getDayOfWeekNumber(task.recurrence_day_of_week || 'MONDAY');
                
                // Find the next targetDayOfWeek on or after currentIterationAnchorDate
                let foundDate = new Date(currentIterationAnchorDate);
                while (getDay(foundDate) !== targetDayOfWeek) {
                    foundDate = addDays(foundDate, 1);
                }
                potentialOccurrenceDate = foundDate;
                currentIterationAnchorDate = addWeeks(foundDate, weeklyInterval);
                break;
            }
                
            case 'Monthly': {
                const monthlyInterval = task.recurrence_interval || 1;
                
                // For monthly, calculate occurrence in the month of currentIterationAnchorDate
                const monthToCalculate = new Date(currentIterationAnchorDate.getFullYear(), currentIterationAnchorDate.getMonth(), 1);
                
                if (task.monthly_recurrence_type === 'DAY_OF_MONTH') {
                    const targetDay = task.recurrence_day_of_month || startDate.getDate();
                    try {
                        potentialOccurrenceDate = setDate(monthToCalculate, targetDay);
                    } catch {
                        // Handle cases like Feb 30th
                        potentialOccurrenceDate = endOfMonth(monthToCalculate);
                    }
                } else { // DAY_OF_WEEK (e.g., "Third Monday")
                    const targetDayOfWeek = getDayOfWeekNumber(task.recurrence_day_of_week || 'MONDAY');
                    const ordinal = task.recurrence_ordinal || 'FIRST';
                    potentialOccurrenceDate = findNthDayOfWeekInMonth(monthToCalculate, targetDayOfWeek, ordinal);
                }
                
                // Move to next month interval
                currentIterationAnchorDate = addMonths(currentIterationAnchorDate, monthlyInterval);
                break;
            }
            default:
                break;
        }

        if (potentialOccurrenceDate) {
            potentialOccurrenceDate.setHours(0, 0, 0, 0);
            
            // Apply end date condition
            if (endDate && potentialOccurrenceDate > endDate) {
                break;
            }

            occurrenceCount++;
            occurrences.push({
                date: getLocalDateString(potentialOccurrenceDate),
                occurrence: occurrenceCount
            });

            // Apply max occurrences condition
            if (maxOccurrences && occurrenceCount >= maxOccurrences) {
                break;
            }
        }
        
        iterations++;
    }
    
    return occurrences;
};

// Calculate the actual next due date for a recurrence task
export const calculateRecurrenceTaskActualNextDueDate = (task) => {
    if (!task.is_recurring || task.recurrence_pattern === 'None') {
        return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastReportedDate = task.last_reported_date ? parseDateStringAsLocalDate(task.last_reported_date) : null;
    if (lastReportedDate) {
        lastReportedDate.setHours(0, 0, 0, 0);
    }
    
    // Generate all potential occurrences
    const allOccurrences = generateRecurringTaskOccurrences(task);
    
    // Find the first occurrence that meets our criteria
    for (const occurrence of allOccurrences) {
        const occurrenceDate = parseDateStringAsLocalDate(occurrence.date);
        if (!occurrenceDate) continue;

        // Must be today or in the future
        if (occurrenceDate < today) {
            continue;
        }

        // If there's a last reported date, must be after it
        if (lastReportedDate && occurrenceDate <= lastReportedDate) {
            continue;
        }

        return occurrence.date;
    }
    
    return null;
};

// Legacy function - keeping for compatibility
export const calculateNextDueDate = (task, fromDate = new Date()) => {
    return calculateRecurrenceTaskActualNextDueDate(task);
};

// Check if a recurring task's due date should be updated
export const shouldUpdateDueDate = (task) => {
    if (!task.is_recurring) return false;
    
    if (task.status === 'Completed' || task.status === 'Canceled') {
        return false;
    }
    
    const nextDue = calculateRecurrenceTaskActualNextDueDate(task);
    return nextDue && nextDue !== task.due_date;
};

// Get all future occurrences for a recurring task
export const getFutureOccurrences = (task, limit = 10) => {
    if (!task.is_recurring || task.recurrence_pattern === 'None') {
        return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allOccurrences = generateRecurringTaskOccurrences(task);
    
    return allOccurrences
        .filter(occurrence => parseDateStringAsLocalDate(occurrence.date) > today)
        .slice(0, limit);
};

// Get the current occurrence number based on today's date
export const getCurrentOccurrenceNumber = (task) => {
    if (!task.is_recurring || task.recurrence_pattern === 'None') {
        return 1;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allOccurrences = generateRecurringTaskOccurrences(task);
    
    let currentOccurrence = 1;
    
    for (const occurrence of allOccurrences) {
        const occurrenceDate = parseDateStringAsLocalDate(occurrence.date);
        if (occurrenceDate <= today) {
            currentOccurrence = occurrence.occurrence;
        } else {
            break;
        }
    }
    
    return currentOccurrence;
};