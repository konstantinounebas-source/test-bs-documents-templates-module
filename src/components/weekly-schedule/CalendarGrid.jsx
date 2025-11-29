import React, { useMemo } from 'react';
import { format, isToday, getDay } from 'date-fns';
import { Droppable } from '@hello-pangea/dnd';
import ScheduledEventCard from './ScheduledEventCard';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

const DayHeader = ({ day, userTasks }) => {
    const dayName = format(day, 'EEE');
    const dateNum = format(day, 'd');
    const today = isToday(day);

    const dueTasks = useMemo(() => 
        userTasks.filter(task => 
            task.due_date && 
            format(new Date(task.due_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') &&
            task.status !== 'Completed' && task.status !== 'Canceled'
        ), [userTasks, day]);

    return (
        <div className={`text-center py-2 border-b-2 ${today ? 'border-blue-500' : 'border-slate-200'}`}>
            <p className={`text-sm ${today ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>{dayName}</p>
            <p className={`text-2xl font-bold mt-1 ${today ? 'text-blue-600' : 'text-slate-800'}`}>{dateNum}</p>
            {dueTasks.length > 0 && (
                <div className="flex items-center justify-center mt-1 gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span className="text-xs font-semibold text-red-600">{dueTasks.length} Due</span>
                </div>
            )}
        </div>
    );
};

const TimeSlotLabel = ({ slot }) => (
    <div className="text-right pr-2 text-xs text-slate-500 h-20 flex items-start justify-end pt-1">
        <span>{slot}</span>
    </div>
);

const DayCell = ({ day, slot, children, onTimeSlotClick, isHoliday }) => {
    const droppableId = `calendar-cell-${format(day, 'yyyy-MM-dd')}-${slot}`;
    return (
        <Droppable droppableId={droppableId}>
            {(provided, snapshot) => (
                <td
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`border-t border-l border-slate-200 h-20 p-1 relative transition-colors duration-200
                        ${snapshot.isDraggingOver ? 'bg-blue-100' : ''}
                        ${isHoliday ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'}`
                    }
                    onClick={() => !isHoliday && onTimeSlotClick(day, slot)}
                >
                    <div className="absolute top-0 right-0 text-xs text-slate-300 p-1 hidden">{slot}</div>
                    {children}
                    <div style={{ display: 'none' }}>{provided.placeholder}</div>
                </td>
            )}
        </Droppable>
    );
};


export default function CalendarGrid({ 
    weekDays, 
    timeSlots, 
    events, 
    holidays,
    workSchedules,
    userTasks = [],
    onEventClick, 
    onTimeSlotClick 
}) {
    const gridLayout = {
        gridTemplateColumns: `auto repeat(${weekDays.length}, minmax(0, 1fr))`
    };
    
    const isPublicHoliday = (day) => {
        return holidays.some(h => !h.user_email && format(new Date(h.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
    };
    
    const isWorkingDay = (day) => {
        const dayName = format(day, 'eeee');
        const dayOfWeek = getDay(day); // Sunday = 0, Monday = 1, etc.
        const onLeave = holidays.some(h => h.user_email && format(new Date(h.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));

        if (isPublicHoliday(day) || onLeave) return false;

        const specificDaySchedule = workSchedules.find(ws => ws.day_of_week === dayName);
        if (specificDaySchedule) return true;
        
        const weekdaySchedule = workSchedules.find(ws => ws.day_of_week === 'Weekdays');
        if (weekdaySchedule && dayOfWeek >= 1 && dayOfWeek <= 5) return true;

        if (workSchedules.length === 0 && dayOfWeek >= 1 && dayOfWeek <= 5) return true;

        return false;
    };

    return (
        <div className="h-full flex flex-col">
            <div className="grid sticky top-0 bg-white z-10" style={gridLayout}>
                <div /> 
                {weekDays.map(day => (
                    <DayHeader 
                        key={day.toString()} 
                        day={day} 
                        userTasks={userTasks} 
                    />
                ))}
            </div>

            <div className="flex-grow overflow-y-auto">
                <div className="grid" style={gridLayout}>
                    {timeSlots.map((slot) => (
                        <React.Fragment key={slot}>
                            <TimeSlotLabel slot={slot} />
                            {weekDays.map((day) => {
                                const dayEvents = events.filter(e => 
                                    format(new Date(e.scheduled_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') &&
                                    e.start_time === slot
                                );
                                
                                const isNonWorking = !isWorkingDay(day);

                                return (
                                    <DayCell 
                                        key={day.toString()}
                                        day={day}
                                        slot={slot}
                                        isHoliday={isNonWorking}
                                        onTimeSlotClick={onTimeSlotClick}
                                    >
                                        {dayEvents.map(event => (
                                            <ScheduledEventCard 
                                                key={event.id}
                                                event={event}
                                                onClick={onEventClick}
                                            />
                                        ))}
                                    </DayCell>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}