
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Clock, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { isPast, isToday } from 'date-fns';

export default function TaskSelectionDialog({ 
    open, 
    onClose, 
    onTaskSelected, 
    tasks = [], 
    title,
    selectedDate,
    selectedTime 
}) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTasks = useMemo(() => {
        if (!tasks) return [];
        
        let filtered = tasks; 

        if (searchTerm) {
            filtered = filtered.filter(task => 
                task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        return filtered;
    }, [tasks, searchTerm]);

    const handleTaskSelect = (task) => {
        onTaskSelected(task);
        onClose();
        setSearchTerm('');
    };

    const formatDateTime = () => {
        if (!selectedDate || !selectedTime) return '';
        const dateStr = selectedDate.toLocaleDateString('el-GR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        return `${dateStr} στις ${selectedTime}`;
    };

    const TaskItem = ({ task }) => {
        const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
        
        return (
            <Button
                variant="outline"
                className="w-full p-3 h-auto text-left justify-start mb-2"
                onClick={() => handleTaskSelect(task)}
            >
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900 text-sm line-clamp-2 break-words">{task.title}</span>
                        {isOverdue && (
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                        )}
                    </div>
                    
                    {task.description && (
                        <p className="text-xs text-slate-600 mb-1 line-clamp-2 break-words">
                            {task.description}
                        </p>
                    )}
                    
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                            {task.priority}
                        </Badge>
                        
                        <Badge variant="outline" className="text-xs px-1 py-0">
                            {task.status}
                        </Badge>
                        
                        {task.priority_order && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                                #{task.priority_order}
                            </Badge>
                        )}
                        
                        {task.estimated_time_minutes && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="w-3 h-3" />
                                {task.estimated_time_minutes}λ
                            </div>
                        )}
                        
                        {task.due_date && (
                            <div className="text-xs text-slate-500">
                                {new Date(task.due_date).toLocaleDateString('el-GR')}
                            </div>
                        )}
                    </div>
                </div>
            </Button>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl max-h-[70vh] flex flex-col">
                <DialogHeader className="flex-none">
                    <DialogTitle className="text-base">
                        {title}
                    </DialogTitle>
                    {selectedDate && selectedTime && (
                        <p className="text-sm text-slate-600 mt-1">
                            Προγραμματισμός για: {formatDateTime()}
                        </p>
                    )}
                </DialogHeader>
                
                <div className="flex flex-col flex-1 min-h-0 space-y-3">
                    <div className="flex-none relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Αναζήτηση εργασιών..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-9"
                        />
                    </div>
                    
                    <ScrollArea className="flex-1 pr-4">
                        {filteredTasks.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <p className="text-sm">Δεν βρέθηκαν εργασίες</p>
                                {searchTerm && (
                                    <p className="text-xs mt-1">Δοκιμάστε διαφορετικό όρο αναζήτησης</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-0">
                                {filteredTasks.map(task => (
                                    <TaskItem key={task.id} task={task} />
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
