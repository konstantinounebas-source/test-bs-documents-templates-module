
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { Loader2, MessageSquare, Edit, PlusCircle, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Helper to format dates in Cyprus/Athens timezone
const formatLocalDateTime = (dateString) => {
  try {
    // Ensure we're parsing as UTC
    let utcDate;
    if (dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('T')) {
      // Parse as-is if it has timezone info or is ISO format
      utcDate = new Date(dateString);
    } else {
      // If no timezone info, assume UTC
      utcDate = new Date(dateString + 'Z');
    }
    
    // Check if date is valid
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid date:', dateString);
      return 'Invalid Date';
    }
    
    return utcDate.toLocaleString('en-GB', {
      timeZone: 'Europe/Athens',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Date formatting error:', error, 'for date:', dateString);
    return 'Invalid Date';
  }
};

const HistoryItem = ({ icon: Icon, date, user, content, children, badgeText, badgeVariant, timeSpent }) => (
  <div className="flex items-start gap-4 mb-4">
    <div className="flex-shrink-0 bg-slate-100 rounded-full p-2 mt-1">
      <Icon className="w-5 h-5 text-slate-500" />
    </div>
    <div className="flex-grow min-w-0">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-900 truncate mr-2">
          {user} - {formatLocalDateTime(date)}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          {timeSpent > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {timeSpent < 60 ? `${timeSpent}λ` : `${Math.floor(timeSpent / 60)}ώ ${timeSpent % 60}λ`}
            </Badge>
          )}
          {badgeText && <Badge variant={badgeVariant || 'secondary'}>{badgeText}</Badge>}
        </div>
      </div>
      <div className="text-sm text-slate-700 whitespace-pre-wrap break-words overflow-wrap-anywhere">
        {content}
      </div>
      {children}
    </div>
  </div>
);

export default function ViewHistoryDialog({ open, onClose, task, usersCache = {} }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && task) {
      const fetchHistory = async () => {
        setIsLoading(true);
        
        try {
          const [progressLogs, auditLogs] = await Promise.all([
            base44.entities.UserTaskLog.filter({ user_task_id: task.id }),
            base44.entities.AuditLog.filter({ target_entity: 'UserTask', target_id: task.id })
          ]);

          const formattedProgress = progressLogs.map(log => ({
            type: 'progress',
            date: log.created_date,
            user: usersCache[log.created_by] || log.created_by,
            content: log.progress_notes,
            badge: log.status_at_log_time,
            timeSpent: log.time_spent_in_log_minutes || 0,
          }));

          const formattedAudits = auditLogs
            .filter(log => log.action_type === 'UPDATE' && log.details?.changes)
            .map(log => ({
              type: 'edit',
              date: log.created_date,
              user: usersCache[log.user_email] || log.user_email,
              content: Object.entries(log.details.changes).map(([field, values]) => 
                `${field} changed from "${values.from || 'empty'}" to "${values.to || 'empty'}"`
              ).join('\n'),
            }));
          
          const creationLog = {
            type: 'creation',
            date: task.created_date,
            user: usersCache[task.created_by] || task.created_by,
            content: `Task created with title: "${task.title}"`,
          };
          
          const combined = [creationLog, ...formattedProgress, ...formattedAudits];
          combined.sort((a, b) => new Date(a.date) - new Date(b.date));

          setHistory(combined);
        } catch (error) {
          console.error("Failed to fetch history:", error);
          setHistory([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchHistory();
    }
  }, [open, task, usersCache]);

  const getIcon = (type) => {
    switch(type) {
      case 'progress': return MessageSquare;
      case 'edit': return Edit;
      case 'creation': return PlusCircle;
      default: return History;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="break-words">History for: {task?.title}</DialogTitle>
          <DialogDescription>
            Complete chronological log of all progress reports and changes for this task. Times shown in Cyprus/Athens timezone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4 -mr-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-2">
              {history.map((item, index) => (
                <HistoryItem 
                  key={index}
                  icon={getIcon(item.type)}
                  date={item.date}
                  user={item.user}
                  content={item.content}
                  badgeText={item.badge}
                  timeSpent={item.timeSpent || 0}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-500 py-10">
              <p>No history log found for this task.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
