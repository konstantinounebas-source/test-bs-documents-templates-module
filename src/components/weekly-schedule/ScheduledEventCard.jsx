import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Edit, X } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ScheduledEventCard({ event, onEdit, onRemove, onClick, isSelected = false }) {
    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Canceled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const getEventTypeColor = (isToday) => {
        if (event.is_meeting) {
            return isToday ? 'bg-purple-100 border-purple-300' : 'bg-purple-50 border-purple-200';
        }
        return isToday ? 'bg-blue-100 border-blue-300' : 'bg-blue-50 border-blue-200';
    };

    const formatDuration = (minutes) => {
        if (!minutes) return '';
        if (minutes < 60) return `${minutes}λ`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}ώ ${remainingMinutes}λ` : `${hours}ώ`;
    };

    const handleCardClick = (e) => {
        e.stopPropagation();
        if (onClick) {
            onClick(event);
        }
    };

    const handleEditClick = (e) => {
        e.stopPropagation();
        if (onEdit) {
            onEdit(event);
        }
    };

    const handleRemoveClick = (e) => {
        e.stopPropagation();
        if (onRemove) {
            onRemove(event);
        }
    };

    return (
        <div
            className={`relative p-2 border rounded-md text-xs cursor-pointer hover:shadow-sm transition-all duration-200 ${
                getEventTypeColor(false)
            } ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
            onClick={handleCardClick}
        >
            <div className="flex items-start justify-between gap-1 mb-1">
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-xs line-clamp-2 break-words leading-tight">
                        {event.title}
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-slate-400 hover:text-slate-600 flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Edit className="w-3 h-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={handleEditClick}>
                            <Edit className="w-3 h-3 mr-2" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleRemoveClick} className="text-red-600">
                            <X className="w-3 h-3 mr-2" />
                            Remove
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                <Clock className="w-3 h-3" />
                <span>{event.start_time} - {event.end_time}</span>
                {event.duration_minutes && (
                    <span className="text-slate-500">({formatDuration(event.duration_minutes)})</span>
                )}
            </div>

            <div className="flex items-center gap-1 flex-wrap">
                <Badge className={`text-xs px-1 py-0 ${event.is_meeting ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {event.is_meeting ? 'Meeting' : 'Task'}
                </Badge>
                <Badge className={`text-xs px-1 py-0 ${getStatusColor(event.status)}`}>
                    {event.status}
                </Badge>
            </div>

            {event.progress_notes && (
                <div className="mt-1 p-1 bg-slate-100 rounded text-xs">
                    <p className="text-slate-700 line-clamp-2">{event.progress_notes}</p>
                </div>
            )}
        </div>
    );
}