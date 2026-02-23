import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AssignPersonsDialog({ open, onOpenChange, selectedDate, persons, currentDayAssignment, onSave }) {
  const [dayPersons, setDayPersons] = useState([]);
  const [dayNotes, setDayNotes] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonMinutes, setNewPersonMinutes] = useState(465);

  React.useEffect(() => {
    if (open) {
      if (currentDayAssignment) {
        const p = currentDayAssignment.assigned_persons || [];
        if (p.length > 0 && typeof p[0] === 'string') {
          setDayPersons(p.map(name => ({ name, available_minutes: 480 })));
        } else {
          setDayPersons(p);
        }
        setDayNotes(currentDayAssignment.notes || '');
      } else {
        setDayPersons([]);
        setDayNotes('');
      }
      setNewPersonName('');
      setNewPersonMinutes(465);
    }
  }, [open, currentDayAssignment]);

  const handleAdd = () => {
    if (!newPersonName.trim()) { toast.error('Enter person name'); return; }
    if (dayPersons.find(p => p.name === newPersonName.trim())) { toast.error('Person already added'); return; }
    setDayPersons([...dayPersons, { name: newPersonName.trim(), available_minutes: newPersonMinutes }]);
    setNewPersonName('');
    setNewPersonMinutes(465);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Assigned Persons - {selectedDate}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Person Name</Label>
              <Select value={newPersonName} onValueChange={setNewPersonName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or type below" />
                </SelectTrigger>
                <SelectContent>
                  {persons.map(p => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or type new person name"
                className="mt-1"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
              />
            </div>
            <div className="w-32">
              <Label>Minutes</Label>
              <Input type="number" value={newPersonMinutes} onChange={(e) => setNewPersonMinutes(parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-slate-500 mt-1">{Math.floor(newPersonMinutes / 60)}h {newPersonMinutes % 60}m</p>
            </div>
            <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" />Add</Button>
          </div>

          <div className="border rounded-lg divide-y max-h-60 overflow-auto">
            {dayPersons.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No persons assigned yet</p>
            ) : dayPersons.map((person, index) => (
              <div key={index} className="p-3 flex justify-between items-center hover:bg-slate-50">
                <div className="flex-1">
                  <p className="font-medium">{person.name}</p>
                  <p className="text-sm text-slate-600">{person.available_minutes} min ({Math.floor(person.available_minutes / 60)}h {person.available_minutes % 60}m)</p>
                </div>
                <div className="flex gap-2">
                  <Input type="number" value={person.available_minutes}
                    onChange={(e) => {
                      const updated = [...dayPersons];
                      updated[index].available_minutes = parseFloat(e.target.value) || 0;
                      setDayPersons(updated);
                    }}
                    className="w-24"
                  />
                  <Button onClick={() => setDayPersons(dayPersons.filter((_, i) => i !== index))} variant="ghost" size="icon">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {dayPersons.length > 0 && (
            <div className="bg-slate-100 p-3 rounded-lg">
              <p className="text-sm font-semibold">
                Total Available: {dayPersons.reduce((sum, p) => sum + p.available_minutes, 0)} min
                ({Math.floor(dayPersons.reduce((sum, p) => sum + p.available_minutes, 0) / 60)}h {dayPersons.reduce((sum, p) => sum + p.available_minutes, 0) % 60}m)
              </p>
            </div>
          )}

          <div>
            <Label>Notes (Optional)</Label>
            <Textarea value={dayNotes} onChange={(e) => setDayNotes(e.target.value)} placeholder="Day notes..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave({ persons: dayPersons, notes: dayNotes })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}