
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, User, BarChart, Repeat, Edit, File, Download, BarChart3, Tag } from 'lucide-react'; // BarChart3 kept for Progress section, BarChart for header as per original and outline implies BarChart for general chart icon. Tag added for Category.
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserTaskCategory } from '@/entities/UserTaskCategory';

// Helper component for displaying detailed items
const DetailItem = ({ icon, label, children, fullWidth = false }) => (
    <div className={`flex flex-col gap-1 ${fullWidth ? 'col-span-full' : ''}`}>
        <div className="flex items-center text-sm font-medium text-slate-700 gap-2">
            {icon}
            <span>{label}</span>
        </div>
        <div className="text-sm text-slate-800">
            {children}
        </div>
    </div>
);

export default function ViewTaskDetailsDialog({ open, onClose, task, onEdit }) {
    // State variables for future expansions, as implied by outline
    // Note: Their corresponding useEffects for data fetching are not provided in this specific outline,
    // so they will remain empty/default values unless further outlines implement their logic.
    const [userMap, setUserMap] = useState({});
    const [attachments, setAttachments] = useState([]);
    const [history, setHistory] = useState([]);
    const [categoryColor, setCategoryColor] = useState('#A8A29E'); // Default color

    useEffect(() => {
        const fetchCategoryColor = async () => {
            if (task?.category) {
                try {
                    const categories = await UserTaskCategory.filter({ name: task.category });
                    if (categories.length > 0) {
                        setCategoryColor(categories[0].color_code);
                    } else {
                        setCategoryColor('#A8A29E'); // Reset to default if category not found
                    }
                } catch (error) {
                    console.error("Failed to fetch category color:", error);
                    setCategoryColor('#A8A29E'); // Fallback on error
                }
            } else {
                setCategoryColor('#A8A29E'); // Reset if no category
            }
        };

        if (open && task) {
            fetchCategoryColor();
            // This is where useEffects for users, attachments, history would go if provided
        }
    }, [open, task]);

    if (!task) return null;

    const formatMinutes = (minutes) => {
        if (!minutes || minutes === 0) return '0 λεπτά';
        if (minutes < 60) return `${minutes} λεπτά`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) return `${hours} ώρες`;
        return `${hours} ώρες και ${remainingMinutes} λεπτά`;
    };

    const statusColors = {
        'Pending': 'bg-slate-100 text-slate-800',
        'In Progress': 'bg-blue-100 text-blue-800',
        'On Hold': 'bg-orange-100 text-orange-800',
        'Completed': 'bg-green-100 text-green-800',
        'Canceled': 'bg-gray-100 text-gray-800', // Added 'Canceled' status
    };

    const priorityColors = {
        High: 'bg-red-100 text-red-800 border-red-200',
        Medium: 'bg-slate-100 text-slate-600 border-slate-200',
        Low: 'bg-slate-100 text-slate-600 border-slate-200',
    };

    const getRecurrenceDescription = (task) => { // Renamed from getRecurrenceDisplay
        if (!task.is_recurring || task.recurrence_pattern === 'None') return 'Όχι';
        
        const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();

        switch (task.recurrence_pattern) {
            case 'Daily':
                return 'Καθημερινά';
            case 'Weekly':
                const dayLabel = task.recurrence_day_of_week ? capitalizeFirstLetter(task.recurrence_day_of_week) : 'Δευτέρα';
                const interval = task.recurrence_interval || 1;
                return interval === 1 ? `Εβδομαδιαία (${dayLabel})` : `Κάθε ${interval} εβδομάδες (${dayLabel})`;
            case 'Monthly':
                const monthInterval = task.recurrence_interval || 1;
                const monthText = monthInterval === 1 ? 'μήνα' : `${monthInterval} μήνες`;
                
                if (task.monthly_recurrence_type === 'DAY_OF_MONTH') {
                    return `Μηνιαία (Ημέρα ${task.recurrence_day_of_month || 1} κάθε ${monthText})`;
                } else {
                    const ordinal = task.recurrence_ordinal ? capitalizeFirstLetter(task.recurrence_ordinal) : 'Πρώτη';
                    const day = task.recurrence_day_of_week ? capitalizeFirstLetter(task.recurrence_day_of_week) : 'Δευτέρα';
                    return `Μηνιαία (${ordinal} ${day} κάθε ${monthText})`;
                }
            default:
                return task.recurrence_pattern;
        }
    };

    const recurrenceDescription = getRecurrenceDescription(task);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{task.title}</DialogTitle>
                    <DialogDescription>{task.description}</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <ScrollArea className="h-[60vh] pr-6">
                        <div className="space-y-6">
                            {/* Combined Details Section */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 border-t border-b py-4">
                                {/* Status & Priority */}
                                <DetailItem icon={<BarChart className="w-4 h-4 text-slate-700" />} label="Status & Priority">
                                    <div className="flex items-center gap-2">
                                        <Badge className={statusColors[task.status]}>{task.status}</Badge>
                                        <Badge className={priorityColors[task.priority]}>{task.priority} Priority</Badge>
                                    </div>
                                </DetailItem>

                                {/* Assigned To */}
                                <DetailItem icon={<User className="w-4 h-4 text-slate-700" />} label="Assigned To">
                                    <span>{task.assigned_to_user_email}</span>
                                </DetailItem>
                                
                                {/* Category */}
                                <DetailItem icon={<Tag className="w-4 h-4 text-slate-700" />} label="Category">
                                    {task.category ? (
                                        <Badge variant="outline" style={{ borderColor: categoryColor, color: categoryColor }}>
                                            {task.category}
                                        </Badge>
                                    ) : (
                                        <span className="text-slate-500">None</span>
                                    )}
                                </DetailItem>

                                {/* Start Date */}
                                <DetailItem icon={<Calendar className="w-4 h-4 text-slate-700" />} label="Start Date">
                                    <span className="font-medium">{task.start_date ? format(new Date(task.start_date), 'dd/MM/yyyy') : 'Δεν ορίστηκε'}</span>
                                </DetailItem>
                                
                                {/* Due Date */}
                                <DetailItem icon={<Calendar className="w-4 h-4 text-slate-700" />} label="Due Date">
                                    <span className="font-medium">{task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy') : 'Δεν ορίστηκε'}</span>
                                </DetailItem>

                                {/* Completion Date */}
                                {task.completion_date && (
                                    <DetailItem icon={<Calendar className="w-4 h-4 text-slate-700" />} label="Completed On">
                                        <span className="font-medium">{format(new Date(task.completion_date), 'dd/MM/yyyy')}</span>
                                    </DetailItem>
                                )}

                                {/* Last Reported Date */}
                                {task.last_reported_date && (
                                    <DetailItem icon={<Calendar className="w-4 h-4 text-slate-700" />} label="Last Reported On">
                                        <span className="ml-2 font-medium">{format(new Date(task.last_reported_date), 'dd/MM/yyyy')}</span>
                                    </DetailItem>
                                )}
                            </div>

                            {/* Progress */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-slate-900 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    Πρόοδος
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-slate-600">Ποσοστό Ολοκλήρωσης</span>
                                            <span className="font-semibold">{task.completion_percentage || 0}%</span>
                                        </div>
                                        <Progress value={task.completion_percentage || 0} className="h-2" />
                                    </div>
                                </div>
                            </div>

                            {/* Time Tracking */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-slate-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Παρακολούθηση Χρόνου
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <span className="text-slate-500 block">Εκτιμώμενος Χρόνος:</span>
                                        <span className="font-semibold text-blue-700">
                                            {task.estimated_time_minutes ? formatMinutes(task.estimated_time_minutes) : 'Δεν ορίστηκε'}
                                        </span>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-lg">
                                        <span className="text-slate-500 block">Συνολικός Χρόνος:</span>
                                        <span className="font-semibold text-green-700">
                                            {formatMinutes(task.total_time_spent_minutes || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Attachments Section */}
                            {task.attachments && task.attachments.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-lg mb-3">Attachments</h3>
                                    <div className="space-y-2">
                                        {task.attachments.map((attachment, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                                                <div className="flex items-center gap-3">
                                                    <File className="w-5 h-5 text-slate-500" />
                                                    <span className="text-sm font-medium text-slate-800">{attachment.filename}</span>
                                                </div>
                                                <a
                                                    href={attachment.url}
                                                    download={attachment.filename}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
                                                >
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Download
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recurrence */}
                            {task.is_recurring && recurrenceDescription && (
                                <div className="space-y-3">
                                    <h4 className="font-medium text-slate-900 flex items-center gap-2">
                                        <Repeat className="w-4 h-4" />
                                        Επανάληψη
                                    </h4>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                                        {recurrenceDescription}
                                    </p>
                                </div>
                            )}

                            {/* Stats */}
                            {(task.reopen_count > 0 || task.due_date_change_count > 0 || task.total_days_not_reported > 0) && (
                                <div className="space-y-3">
                                    <h4 className="font-medium text-slate-900">Στατιστικά</h4>
                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                        {task.reopen_count > 0 && (
                                            <div className="text-center p-2 bg-orange-50 rounded">
                                                <div className="font-semibold text-orange-700">{task.reopen_count}</div>
                                                <div className="text-orange-600 text-xs">Επανανοίγματα</div>
                                            </div>
                                        )}
                                        {task.due_date_change_count > 0 && (
                                            <div className="text-center p-2 bg-yellow-50 rounded">
                                                <div className="font-semibold text-yellow-700">{task.due_date_change_count}</div>
                                                <div className="text-yellow-600 text-xs">Αλλαγές Λήξης</div>
                                            </div>
                                        )}
                                        {task.total_days_not_reported > 0 && (
                                            <div className="text-center p-2 bg-red-50 rounded">
                                                <div className="font-semibold text-red-700">{task.total_days_not_reported}</div>
                                                <div className="text-red-600 text-xs">Ημέρες Χωρίς Αναφορά</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Κλείσιμο
                    </Button>
                    {task.status !== 'Completed' && task.status !== 'Canceled' && (
                        <Button onClick={() => onEdit(task)} className="ml-2">
                            <Edit className="w-4 h-4 mr-2" />
                            Επεξεργασία
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
