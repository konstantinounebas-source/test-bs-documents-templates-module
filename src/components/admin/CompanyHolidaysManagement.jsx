import React, { useState, useEffect } from 'react';
import { Holiday } from '@/entities/Holiday';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { clearHolidaysCache } from '../lib/dateUtils';

export default function CompanyHolidaysManagement() {
    const [holidays, setHolidays] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });

    useEffect(() => {
        loadHolidays();
    }, []);

    const loadHolidays = async () => {
        setIsLoading(true);
        try {
            // Filter for holidays where user_email is null (i.e., public holidays)
            const data = await Holiday.filter({ user_email: null }, 'date');
            setHolidays(data);
        } catch (error) {
            console.error("Error loading holidays:", error);
        }
        setIsLoading(false);
    };

    const handleCreate = async () => {
        if (!newHoliday.date || !newHoliday.name) return;

        try {
            await Holiday.create({
                ...newHoliday,
                type: 'Public Holiday',
                user_email: null // Ensure it's a public holiday
            });
            clearHolidaysCache(); // Clear cache to force re-fetch
            setNewHoliday({ date: '', name: '' });
            setShowCreateDialog(false);
            loadHolidays();
        } catch (error) {
            console.error("Error creating holiday:", error);
        }
    };

    const handleDelete = async (holidayId) => {
        if (!confirm('Are you sure you want to delete this holiday?')) return;

        try {
            await Holiday.delete(holidayId);
            clearHolidaysCache(); // Clear cache to force re-fetch
            loadHolidays();
        } catch (error) {
            console.error("Error deleting holiday:", error);
        }
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-5 h-5 mr-2" />
                    Add Holiday
                </Button>
            </div>
            
            <div className="border rounded-lg">
                {isLoading ? (
                    <div className="p-4 text-center">Loading holidays...</div>
                ) : holidays.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No company holidays defined yet.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Holiday Name</TableHead>
                                <TableHead className="w-20 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {holidays.map(holiday => (
                                <TableRow key={holiday.id}>
                                    <TableCell>{format(parseISO(holiday.date), 'MMM d, yyyy')}</TableCell>
                                    <TableCell>{holiday.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(holiday.id)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Company Holiday</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="holiday-date">Date</Label>
                            <Input
                                id="holiday-date"
                                type="date"
                                value={newHoliday.date}
                                onChange={e => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label htmlFor="holiday-name">Holiday Name</Label>
                            <Input
                                id="holiday-name"
                                value={newHoliday.name}
                                onChange={e => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Christmas Day, Independence Day"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={!newHoliday.date || !newHoliday.name}>Add Holiday</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}