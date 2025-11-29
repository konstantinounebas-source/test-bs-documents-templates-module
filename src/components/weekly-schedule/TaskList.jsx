import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TaskItem = ({ task, onScheduleClick }) => {
    const priorityColors = {
        High: 'bg-red-100 text-red-800 border-red-200',
        Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        Low: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    const statusColors = {
        'Pending': 'bg-slate-200 text-slate-800',
        'In Progress': 'bg-blue-200 text-blue-800',
        'Completed': 'bg-green-200 text-green-800',
        'On Hold': 'bg-orange-200 text-orange-800',
        'Canceled': 'bg-gray-200 text-gray-800',
    };

    return (
        <div className="p-3 mb-2 rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-800 mb-2">{task.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={priorityColors[task.priority] || 'bg-slate-100'}>
                            {task.priority}
                        </Badge>
                        <Badge className={statusColors[task.status] || 'bg-slate-100'}>
                            {task.status}
                        </Badge>
                        {task.due_date && (
                            <Badge variant="outline">
                                Due: {task.due_date}
                            </Badge>
                        )}
                    </div>
                </div>
                <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => onScheduleClick(task)} 
                    className="flex-shrink-0 ml-2"
                >
                   <Plus className="w-4 h-4 mr-1" /> Schedule
                </Button>
            </div>
        </div>
    );
};

export default function TaskList({ tasks = [], isLoading, onScheduleClick }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Active Tasks');
    const [sortMethod, setSortMethod] = useState('priority');

    const filteredTasks = useMemo(() => {
        let tempTasks = [...tasks];
        
        if (searchTerm) {
            tempTasks = tempTasks.filter(t => 
                t.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (statusFilter === 'Active Tasks') {
            tempTasks = tempTasks.filter(t => 
                t.status !== 'Completed' && t.status !== 'Canceled'
            );
        } else if (statusFilter !== 'All') {
            tempTasks = tempTasks.filter(t => t.status === statusFilter);
        }

        if (sortMethod === 'priority') {
            const priorityOrder = { High: 1, Medium: 2, Low: 3 };
            tempTasks.sort((a, b) => 
                (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4)
            );
        } else if (sortMethod === 'due_date') {
            tempTasks.sort((a, b) => {
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date) - new Date(b.due_date);
            });
        }
        
        return tempTasks;
    }, [tasks, searchTerm, statusFilter, sortMethod]);

    const adHocTasks = filteredTasks.filter(t => !t.is_recurring);
    const recurrenceTasks = filteredTasks.filter(t => t.is_recurring);

    const TaskSection = ({ title, tasks, onScheduleClick }) => (
        <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-base">{title} ({tasks.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
                <ScrollArea className="h-64">
                    <div className="space-y-1">
                        {tasks.length > 0 ? (
                            tasks.map((task) => (
                                <TaskItem key={task.id} task={task} onScheduleClick={onScheduleClick} />
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 text-center p-4">
                                No tasks match the current filters.
                            </p>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );

    if (isLoading) {
        return (
            <div className="bg-slate-50 p-4 rounded-lg shadow-sm h-full flex items-center justify-center">
                <div className="text-slate-500">Loading tasks...</div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 p-4 rounded-lg shadow-sm h-full flex flex-col gap-4">
            <div>
                <Input 
                    placeholder="Αναζήτηση εργασιών..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-2"
                />
                <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
                            <SelectItem value="Active Tasks">Active Tasks</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="On Hold">On Hold</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={sortMethod} onValueChange={setSortMethod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="priority">Sort by Priority</SelectItem>
                            <SelectItem value="due_date">Sort by Due Date</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <p className="text-sm text-slate-600">
                {filteredTasks.length} of {tasks.length} tasks shown
            </p>
            
            <TaskSection 
                title="Ad-hoc Tasks" 
                tasks={adHocTasks} 
                onScheduleClick={onScheduleClick} 
            />
            <TaskSection 
                title="Recurrence Tasks" 
                tasks={recurrenceTasks} 
                onScheduleClick={onScheduleClick} 
            />
        </div>
    );
}