
import React, { useState, useEffect, useCallback } from 'react';
import { WorkSchedule } from "@/entities/WorkSchedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label"; // Added Label import
import TimeSelect from "@/components/common/TimeSelect";
import { Plus, Edit, Trash2, Clock, Loader2 } from "lucide-react";

// Adjusted day options to include label for consistent display
const dayOptionDetails = [
    { value: "Weekdays", label: "Weekdays (Mon-Fri)" },
    { value: "Monday", label: "Monday" },
    { value: "Tuesday", label: "Tuesday" },
    { value: "Wednesday", label: "Wednesday" },
    { value: "Thursday", label: "Thursday" },
    { value: "Friday", label: "Friday" },
    { value: "Saturday", label: "Saturday" },
    { value: "Sunday", label: "Sunday" }
];

export default function WorkScheduleManagement({ user }) {
    const [schedules, setSchedules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false); // For edit dialog
    const [isSaving, setIsSaving] = useState(false); // For edit dialog save
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [formData, setFormData] = useState({ // For edit dialog
        day_of_week: 'Weekdays',
        start_time: '09:00',
        end_time: '17:00'
    });
    const [newScheduleForm, setNewScheduleForm] = useState({ // For inline add form
        day_of_week: 'Weekdays',
        start_time: '09:00',
        end_time: '17:00'
    });
    const [isCreatingNewSchedule, setIsCreatingNewSchedule] = useState(false); // For inline add form save

    const loadSchedules = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const userSchedules = await WorkSchedule.filter({ user_email: user.email });
            setSchedules(userSchedules);
        } catch (error) {
            console.error("Failed to load schedules:", error);
        }
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        loadSchedules();
    }, [loadSchedules]);

    // handleAddNew is removed as adding is now handled by an inline form

    const handleEdit = (schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time
        });
        setShowDialog(true);
    };

    const handleDelete = async (scheduleId) => {
        if (confirm('Are you sure you want to delete this schedule?')) {
            try {
                await WorkSchedule.delete(scheduleId);
                await loadSchedules();
            } catch (error) {
                console.error("Failed to delete schedule:", error);
            }
        }
    };

    // Renamed handleSave to handleUpdateSchedule as it's now exclusively for the edit dialog
    const handleUpdateSchedule = async () => {
        if (!user || !editingSchedule) return;
        setIsSaving(true);
        try {
            const dataToSave = { ...formData, user_email: user.email };
            await WorkSchedule.update(editingSchedule.id, dataToSave);
            await loadSchedules();
            setShowDialog(false);
        } catch (error) {
            console.error("Failed to update schedule:", error);
        }
        setIsSaving(false);
    };

    // New handler for the inline form to create a new schedule
    const handleCreateNewSchedule = async () => {
        if (!user) return;
        setIsCreatingNewSchedule(true);
        try {
            const dataToSave = { ...newScheduleForm, user_email: user.email };
            await WorkSchedule.create(dataToSave);
            await loadSchedules();
            // Reset form after successful creation
            setNewScheduleForm({
                day_of_week: 'Weekdays',
                start_time: '09:00',
                end_time: '17:00'
            });
        } catch (error) {
            console.error("Failed to create schedule:", error);
        }
        setIsCreatingNewSchedule(false);
    };

    if (!user) return null;

    return (
        <div className="space-y-6"> {/* New wrapper div */}
            <Card className="border-dashed">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Clock className="w-5 h-5" />
                                Work Schedule
                            </CardTitle>
                            <CardDescription>Define standard working hours per day.</CardDescription>
                        </div>
                        {/* The "Add" button is removed as adding is now handled by an inline form */}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p>Loading schedules...</p>
                    ) : schedules.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No work schedules defined yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Day of Week</TableHead>
                                    <TableHead>Start Time</TableHead>
                                    <TableHead>End Time</TableHead>
                                    <TableHead className="w-24">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {schedules.map(schedule => (
                                    <TableRow key={schedule.id}>
                                        <TableCell>
                                            {/* Display consistent label from dayOptionDetails */}
                                            {dayOptionDetails.find(option => option.value === schedule.day_of_week)?.label || schedule.day_of_week}
                                        </TableCell>
                                        <TableCell>{schedule.start_time}</TableCell>
                                        <TableCell>{schedule.end_time}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(schedule)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(schedule.id)} className="text-red-500 hover:text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add New Schedule Form - as per code_outline */}
            <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-lg">Add New Work Schedule</h4>
                
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="newDayOfWeek">Day of Week</Label>
                        <Select
                            value={newScheduleForm.day_of_week}
                            onValueChange={(value) => setNewScheduleForm(p => ({ ...p, day_of_week: value }))}
                        >
                            <SelectTrigger id="newDayOfWeek"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {dayOptionDetails.map(option => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="newStartTime">Start Time</Label>
                        <TimeSelect
                            id="newStartTime"
                            value={newScheduleForm.start_time}
                            onChange={value => setNewScheduleForm(p => ({ ...p, start_time: value }))}
                        />
                    </div>
                    <div>
                        <Label htmlFor="newEndTime">End Time</Label>
                        <TimeSelect
                            id="newEndTime"
                            value={newScheduleForm.end_time}
                            onChange={value => setNewScheduleForm(p => ({ ...p, end_time: value }))}
                        />
                    </div>
                </div>
                <Button onClick={handleCreateNewSchedule} disabled={isCreatingNewSchedule} className="mt-4">
                    {isCreatingNewSchedule && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Schedule
                </Button>
            </div>

            {/* Dialog now only for editing schedules */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Work Schedule for {user.full_name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="editDayOfWeek">Day of Week</Label>
                            <Select
                                value={formData.day_of_week}
                                onValueChange={value => setFormData(p => ({ ...p, day_of_week: value }))}
                            >
                                <SelectTrigger id="editDayOfWeek"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {dayOptionDetails.map(option => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="editStartTime">Start Time</Label>
                            <TimeSelect
                                id="editStartTime"
                                value={formData.start_time}
                                onChange={value => setFormData(p => ({ ...p, start_time: value }))}
                            />
                        </div>
                        <div>
                            <Label htmlFor="editEndTime">End Time</Label>
                            <TimeSelect
                                id="editEndTime"
                                value={formData.end_time}
                                onChange={value => setFormData(p => ({ ...p, end_time: value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleUpdateSchedule} disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
