
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ListChecks, Clock, AlertTriangle, CheckSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isPast, isToday, isSameDay } from 'date-fns';

export default function MyWorkdayStats({ tasks, isLoading, onStatClick }) {
  const stats = React.useMemo(() => {
    if (!tasks) { // Guard against null tasks
        return { 
          totalActive: { adhoc: 0, recurrence: 0 }, 
          overdue: { adhoc: 0, recurrence: 0 }, 
          reportPending: { adhoc: 0, recurrence: 0 }, 
          completed: { adhoc: 0, recurrence: 0 } 
        };
    }

    // Separate tasks by type
    const adhocTasks = tasks.filter(t => !t.is_recurring);
    const recurrenceTasks = tasks.filter(t => t.is_recurring);

    // Calculate stats for ad-hoc tasks
    const activeAdhocTasks = adhocTasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled');
    const overdueAdhocTasks = activeAdhocTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
    const reportPendingAdhocTasks = activeAdhocTasks.filter(t => {
      if (!['Pending', 'In Progress'].includes(t.status)) return false;
      if (!t.last_reported_date) return true;
      return !isSameDay(new Date(t.last_reported_date), new Date());
    });
    const completedAdhocTasks = adhocTasks.filter(t => t.status === 'Completed');

    // Calculate stats for recurrence tasks
    const activeRecurrenceTasks = recurrenceTasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled');
    const overdueRecurrenceTasks = activeRecurrenceTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
    const reportPendingRecurrenceTasks = activeRecurrenceTasks.filter(t => {
      if (!['Pending', 'In Progress'].includes(t.status)) return false;
      if (!t.last_reported_date) return true;
      return !isSameDay(new Date(t.last_reported_date), new Date());
    });
    const completedRecurrenceTasks = recurrenceTasks.filter(t => t.status === 'Completed');
    
    return {
      totalActive: { 
        adhoc: activeAdhocTasks.length, 
        recurrence: activeRecurrenceTasks.length 
      },
      overdue: { 
        adhoc: overdueAdhocTasks.length, 
        recurrence: overdueRecurrenceTasks.length 
      },
      reportPending: { 
        adhoc: reportPendingAdhocTasks.length, 
        recurrence: reportPendingRecurrenceTasks.length 
      },
      completed: { 
        adhoc: completedAdhocTasks.length, 
        recurrence: completedRecurrenceTasks.length 
      },
    };
  }, [tasks]);

  const StatCard = ({ icon: Icon, title, value, subtitle, color, onClick, filterField, filterValue }) => (
    <Card 
      className="border-slate-200 hover:shadow-md transition-shadow duration-200 cursor-pointer hover:bg-slate-50" 
      onClick={onClick ? () => onClick(filterField, filterValue) : undefined}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 mt-2">
                <span className="text-blue-600">{value.adhoc}</span>
                <span className="text-slate-400 mx-1">/</span>
                <span className="text-purple-600">{value.recurrence}</span>
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              <span className="text-blue-600">Ad-hoc</span> / <span className="text-purple-600">Recurrence</span>
            </p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        icon={ListChecks}
        title="Active Tasks"
        value={stats.totalActive}
        subtitle="Pending, In Progress, On Hold"
        color="bg-blue-500"
        onClick={onStatClick}
        filterField="status"
        filterValue="active"
      />
      <StatCard
        icon={Clock}
        title="Overdue Tasks"
        value={stats.overdue}
        subtitle="Past their due date"
        color="bg-red-500"
        onClick={onStatClick}
        filterField="overdue"
        filterValue="true"
      />
      <StatCard
        icon={AlertTriangle}
        title="Report Pending"
        value={stats.reportPending}
        subtitle="No report logged today"
        color="bg-amber-500"
        onClick={onStatClick}
        filterField="report_pending"
        filterValue="true"
      />
      <StatCard
        icon={CheckSquare}
        title="Completed Tasks"
        value={stats.completed}
        subtitle="Finished and closed"
        color="bg-green-500"
        onClick={onStatClick}
        filterField="status"
        filterValue="Completed"
      />
    </div>
  );
}
