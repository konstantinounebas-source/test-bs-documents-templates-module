import React, { useState, useEffect, useCallback } from 'react';
import { Holiday } from '@/entities/Holiday';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit, Trash2, Calendar, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

const leaveTypes = ["Annual Leave", "Sick Leave", "Unpaid Leave", "Other"];

export default function PersonalLeavesManagement({ user }) {
    const [leaves, setLeaves] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingLeave, setEditingLeave] = useState(null);
    const [newLeave, setNewLeave] = useState({
        name: '',
        date: '',
        end_date: '',
        type: 'Annual Leave',
    });
    const { toast } = useToast();

    const loadLeaves = useCallback(async () => {
        if (!user?.email) return;
        setIsLoading(true);
        try {
            const userLeaves = await Holiday.filter({ user_email: user.email });
            setLeaves(userLeaves);
        } catch (error) {
            console.error("Failed to load personal leaves:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not load personal leaves.",
            });
        }
        setIsLoading(false);
    }, [user, toast]);

    useEffect(() => {
        loadLeaves();
    }, [loadLeaves]);

    const handleSaveLeave = async () => {
        if (!user?.email) return;

        const dataToSave = {
            ...newLeave,
            user_email: user.email,
        };

        if (!dataToSave.name || !dataToSave.date || !dataToSave.type) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please fill in all required fields (name, start date, type).",
            });
            return;
        }

        if (dataToSave.end_date === '') {
            dataToSave.end_date = null;
        }

        setIsSaving(true);
        try {
            if (editingLeave) {
                await Holiday.update(editingLeave.id, dataToSave);
                toast({ title: "Success", description: "Leave updated successfully." });
            } else {
                await Holiday.create(dataToSave);
                toast({ title: "Success", description: "Leave added successfully." });
            }
            setIsSaving(false);
            setIsDialogOpen(false);
            setEditingLeave(null);
            loadLeaves();
        } catch (error) {
            console.error("Failed to save leave:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not save the leave.",
            });
            setIsSaving(false);
        }
    };

    const handleDeleteLeave = async (leaveId) => {
        if (!window.confirm("Are you sure you want to delete this leave?")) return;
        try {
            await Holiday.delete(leaveId);
            toast({ title: "Success", description: "Leave deleted successfully." });
            loadLeaves();
        } catch (error) {
            console.error("Failed to delete leave:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not delete the leave.",
            });
        }
    };

    const openEditDialog = (leave) => {
        setEditingLeave(leave);
        setNewLeave({
            name: leave.name,
            date: format(parseISO(leave.date), 'yyyy-MM-dd'),
            end_date: leave.end_date ? format(parseISO(leave.end_date), 'yyyy-MM-dd') : '',
            type: leave.type,
        });
        setIsDialogOpen(true);
    };

    const openNewDialog = () => {
        setEditingLeave(null);
        setNewLeave({
            name: '',
            date: '',
            end_date: '',
            type: 'Annual Leave',
        });
        setIsDialogOpen(true);
    };

    const formatDateRange = (start, end) => {
        const startDate = format(parseISO(start), 'dd MMM yyyy');
        if (end) {
            const endDate = format(parseISO(end), 'dd MMM yyyy');
            return `${startDate} - ${endDate}`;
        }
        return startDate;
    };

    if (!user) {
        return <div className="p-4 text-center text-slate-500">Please select a user to manage their leaves.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNewDialog}>
                            <Plus className="w-4 h-4 mr-2" /> Add Leave
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingLeave ? 'Edit Leave' : 'Add New Leave'} for {user.full_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="leave-name">Reason / Name *</Label>
                                <Input id="leave-name" value={newLeave.name} onChange={(e) => setNewLeave({ ...newLeave, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="leave-start-date">Start Date *</Label>
                                    <Input id="leave-start-date" type="date" value={newLeave.date} onChange={(e) => setNewLeave({ ...newLeave, date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="leave-end-date">End Date (optional)</Label>
                                    <Input id="leave-end-date" type="date" value={newLeave.end_date} onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="leave-type">Leave Type *</Label>
                                <Select value={newLeave.type} onValueChange={(value) => setNewLeave({ ...newLeave, type: value })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {leaveTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveLeave} disabled={isSaving}>
                                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            
            {isLoading ? (
                <div className="flex justify-center items-center h-24"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : leaves.length > 0 ? (
                <div className="border rounded-md">
                    <ul className="divide-y">
                        {leaves.map(leave => (
                            <li key={leave.id} className="p-3 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{leave.name} <span className="text-sm font-normal text-slate-500">({leave.type})</span></p>
                                    <p className="text-sm text-slate-600 flex items-center gap-2">
                                        <Calendar className="w-4 h-4"/>
                                        {formatDateRange(leave.date, leave.end_date)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(leave)}><Edit className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteLeave(leave.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="text-center text-slate-500 py-10 border-2 border-dashed rounded-lg">
                    <p>No personal leaves found for {user.full_name}.</p>
                </div>
            )}
        </div>
    );
}