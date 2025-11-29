import { isWeekend, isSameDay, addDays } from 'date-fns';
import { Holiday } from '@/entities/Holiday';
import { WorkSchedule } from '@/entities/WorkSchedule';

let holidaysCache = null; // Cache for fetched holidays
let lastFetchTime = null; // Track when holidays were last fetched
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to fetch holidays and cache them
async function fetchHolidays() {
    const now = Date.now();
    
    // Return cached holidays if they're still fresh
    if (holidaysCache && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION) {
        return holidaysCache;
    }
    
    try {
        const holidays = await Holiday.list();
        holidaysCache = holidays.map(h => new Date(h.date));
        lastFetchTime = now;
        return holidaysCache;
    } catch (error) {
        console.error("Failed to fetch holidays:", error);
        // Return empty array on error, but keep any existing cache
        return holidaysCache || [];
    }
}

/**
 * Counts the number of working days between two dates, excluding weekends and predefined holidays.
 * @param {Date|string} startDate The start date (inclusive).
 * @param {Date|string} endDate The end date (inclusive).
 * @returns {number} The number of working days.
 */
export async function countWorkingDays(startDate, endDate) {
    let current = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;

    const holidays = await fetchHolidays();

    while (current <= end) {
        // Only count if it's not a weekend and not a holiday
        if (!isWeekend(current) && !holidays.some(h => isSameDay(h, current))) {
            workingDays++;
        }
        current = addDays(current, 1);
    }

    return workingDays;
}

/**
 * Determines if a specific date is a working day for a user.
 * @param {Date} date The date to check
 * @param {string} userEmail The user's email
 * @param {Array} workSchedules Array of WorkSchedule records for the user
 * @param {Array} holidays Array of Holiday records (both public and user-specific)
 * @returns {boolean} True if it's a working day for the user
 */
export function isWorkingDay(date, userEmail, workSchedules = [], holidays = []) {
    // Check if it's a public holiday or user's personal leave
    const isHoliday = holidays.some(holiday => {
        const holidayDate = new Date(holiday.date);
        const isSameDate = isSameDay(date, holidayDate);
        
        // Public holiday (no user_email) OR user's personal leave
        return isSameDate && (!holiday.user_email || holiday.user_email === userEmail);
    });
    
    if (isHoliday) {
        return false;
    }
    
    // If no work schedules defined, assume standard weekdays (Mon-Fri)
    if (!workSchedules || workSchedules.length === 0) {
        return !isWeekend(date);
    }
    
    // Get day of week
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Check if user has schedule for this specific day or for "Weekdays"
    const hasScheduleForDay = workSchedules.some(schedule => {
        if (schedule.day_of_week === dayOfWeek) {
            return true;
        }
        // "Weekdays" covers Monday through Friday
        if (schedule.day_of_week === 'Weekdays' && !isWeekend(date)) {
            return true;
        }
        return false;
    });
    
    return hasScheduleForDay;
}

/**
 * Fetches work schedules for a specific user
 * @param {string} userEmail The user's email
 * @returns {Array} Array of WorkSchedule records
 */
export async function fetchUserWorkSchedule(userEmail) {
    try {
        const schedules = await WorkSchedule.filter({ user_email: userEmail });
        return schedules;
    } catch (error) {
        console.error("Failed to fetch user work schedule:", error);
        return [];
    }
}

/**
 * Fetches all holidays (public and user-specific)
 * @param {string} userEmail Optional - if provided, includes user's personal leaves
 * @returns {Array} Array of Holiday records
 */
export async function fetchAllHolidays(userEmail = null) {
    try {
        const allHolidays = await Holiday.list();
        
        if (userEmail) {
            // Return both public holidays and user's personal leaves
            return allHolidays.filter(holiday => 
                !holiday.user_email || holiday.user_email === userEmail
            );
        } else {
            // Return only public holidays
            return allHolidays.filter(holiday => !holiday.user_email);
        }
    } catch (error) {
        console.error("Failed to fetch holidays:", error);
        return [];
    }
}

/**
 * Clears the holidays cache.
 * Useful if holidays are updated and needs to be re-fetched.
 */
export function clearHolidaysCache() {
    holidaysCache = null;
    lastFetchTime = null;
}