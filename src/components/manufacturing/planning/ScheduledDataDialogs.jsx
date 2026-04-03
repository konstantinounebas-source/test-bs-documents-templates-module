import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function AddDialog({ open, onClose, formData, setFormData, profiles, itemCodes, qcTypes, qcLevels, onAdd, isAdding }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Scheduled Data</DialogTitle>
          <DialogDescription>Schedule production data for planning</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[500px] overflow-auto">
          <div>
            <Label>Date *</Label>
            <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
          </div>
          <div>
            <Label>Operation Profile *</Label>
            <Select value={formData.operation_profile_id} onValueChange={(v) => setFormData({ ...formData, operation_profile_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select operation profile" /></SelectTrigger>
              <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>QC Type (Optional)</Label>
              <Select value={formData.qc_type} onValueChange={(v) => setFormData({ ...formData, qc_type: v, qc_level: v ? formData.qc_level : '' })}>
                <SelectTrigger><SelectValue placeholder="Select QC type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {qcTypes.map(qt => <SelectItem key={qt.id} value={qt.name}>{qt.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>QC Level {formData.qc_type && '*'}</Label>
              <Select value={formData.qc_level} onValueChange={(v) => setFormData({ ...formData, qc_level: v })} disabled={!formData.qc_type}>
                <SelectTrigger><SelectValue placeholder="Select QC level" /></SelectTrigger>
                <SelectContent>{qcLevels.map(ql => <SelectItem key={ql.id} value={ql.name}>{ql.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {formData.operation_profile_id && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Item Codes * (Multi-select)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ 
                    ...formData, 
                    item_codes: formData.item_codes.length === itemCodes.length ? [] : itemCodes 
                  })}
                >
                  {formData.item_codes.length === itemCodes.length ? 'Clear All' : 'Select All'}
                </Button>
              </div>
              <MultiSelect
                options={itemCodes.map(code => ({ value: code, label: code }))}
                selected={formData.item_codes}
                onChange={(selected) => setFormData({ ...formData, item_codes: selected })}
                placeholder="Select item codes from DATA tab"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ops Qty *</Label>
              <Input type="number" step="0.01" min="0.01" value={formData.ops_qty} onChange={(e) => setFormData({ ...formData, ops_qty: e.target.value })} placeholder="Enter ops quantity" />
            </div>
            <div>
              <Label>QC Qty (Optional, defaults to Ops Qty)</Label>
              <Input type="number" step="0.01" min="0" value={formData.qc_qty} onChange={(e) => setFormData({ ...formData, qc_qty: e.target.value })} placeholder="Leave blank to use Ops Qty" />
            </div>
          </div>
          <div>
            <Label>Notes (Optional)</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Add notes..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
          <Button onClick={onAdd} disabled={isAdding}>
            {isAdding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditDialog({ open, onClose, editingRecord, setEditingRecord, onSave }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Edit Scheduled Data</DialogTitle></DialogHeader>
        {editingRecord && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={editingRecord.date} onChange={(e) => setEditingRecord({...editingRecord, date: e.target.value})} />
              </div>
              <div>
                <Label>Item Code</Label>
                <Input value={editingRecord.item_code} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ops Qty</Label>
                <Input type="number" step="0.01" value={editingRecord.ops_qty} onChange={(e) => setEditingRecord({...editingRecord, ops_qty: e.target.value})} />
              </div>
              <div>
                <Label>QC Qty</Label>
                <Input type="number" step="0.01" value={editingRecord.qc_qty} onChange={(e) => setEditingRecord({...editingRecord, qc_qty: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={editingRecord.notes || ''} onChange={(e) => setEditingRecord({...editingRecord, notes: e.target.value})} rows={3} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
          <Button onClick={onSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DetailsDialog({ open, onClose, selectedRecord, getRecordDetails }) {
  if (!selectedRecord) return null;
  const details = getRecordDetails(selectedRecord);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Scheduled Data Details</DialogTitle></DialogHeader>
        {!details ? <p>No details available</p> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-slate-600">Date</Label><p className="font-medium">{selectedRecord.date}</p></div>
              <div><Label className="text-slate-600">Item Code</Label><p className="font-medium">{selectedRecord.item_code}</p></div>
              <div><Label className="text-slate-600">Operation Profile</Label><p className="font-medium">{details.profile.name}</p></div>
              <div><Label className="text-slate-600">Ops Qty</Label><p className="font-medium">{selectedRecord.ops_qty}</p></div>
              <div><Label className="text-slate-600">QC Qty</Label><p className="font-medium">{selectedRecord.qc_qty}</p></div>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Operations Breakdown</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Operation</TableHead><TableHead className="text-right">Min/Piece</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {details.breakdown.map((item, idx) => (
                      <TableRow key={idx}><TableCell>{item.operation}</TableCell><TableCell className="text-right font-mono">{item.minutes.toFixed(2)}</TableCell></TableRow>
                    ))}
                    <TableRow className="font-semibold bg-slate-50">
                      <TableCell>Total Per-piece</TableCell>
                      <TableCell className="text-right font-mono">{(selectedRecord.ops_per_piece_min || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            {details.qcBreakdown.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">QC Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Operation</TableHead><TableHead className="text-right">Extra Min/Piece</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {details.qcBreakdown.map((item, idx) => (
                        <TableRow key={idx}><TableCell>{item.operation}</TableCell><TableCell className="text-right font-mono">{item.minutes.toFixed(2)}</TableCell></TableRow>
                      ))}
                      <TableRow className="font-semibold bg-slate-50">
                        <TableCell>Total Per-piece</TableCell>
                        <TableCell className="text-right font-mono">{(selectedRecord.qc_per_piece_min || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <Card className="bg-blue-50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-sm text-slate-600">Ops Total</p><p className="text-lg font-bold">{(selectedRecord.ops_total_min || 0).toFixed(2)} min</p></div>
                  <div><p className="text-sm text-slate-600">QC Total</p><p className="text-lg font-bold">{(selectedRecord.qc_total_min || 0).toFixed(2)} min</p></div>
                  <div><p className="text-sm text-slate-600">Grand Total</p><p className="text-lg font-bold text-blue-700">{(selectedRecord.grand_total_min || 0).toFixed(2)} min</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onClose(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SaveTemplateDialog({ open, onClose, templateName, setTemplateName, selectedDate, onSave }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Save Schedule as Template</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Template Name *</Label>
            <Input placeholder="e.g., Standard Monday Schedule" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          </div>
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>This will save all scheduled data and assigned persons for {selectedDate} as a reusable template.</AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
          <Button onClick={onSave}>Save Template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LoadTemplateDialog({ open, onClose, templates, loadToDate, setLoadToDate, onLoad, isLoading }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Load Schedule Template</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Target Date *</Label>
            <Input type="date" value={loadToDate} onChange={(e) => setLoadToDate(e.target.value)} />
          </div>
          <div>
            <Label>Select Template</Label>
            <div className="border rounded-lg divide-y max-h-96 overflow-auto">
              {templates.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No templates saved yet</p>
              ) : templates.map(template => (
                <div key={template.id} className="p-4 hover:bg-slate-50 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{template.template_name}</p>
                    <p className="text-sm text-slate-500">{template.template_data?.length || 0} items{template.assigned_persons_data?.assigned_persons ? ' + assigned persons' : ''}</p>
                  </div>
                  <Button onClick={() => onLoad(template)} disabled={!loadToDate || isLoading} size="sm">Load</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onClose(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssignPersonsDialog({ open, onClose, dayPersons, setDayPersons, dayNotes, setDayNotes, persons, currentDayAssignment, onSave }) {
  const [newPersonName, setNewPersonName] = React.useState('');
  const [newPersonMinutes, setNewPersonMinutes] = React.useState(465);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader><DialogTitle>Assigned Persons</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Person Name</Label>
              <Select value={newPersonName} onValueChange={setNewPersonName}>
                <SelectTrigger><SelectValue placeholder="Select or type below" /></SelectTrigger>
                <SelectContent>{persons.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Or type new person name" className="mt-1" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} />
            </div>
            <div className="w-32">
              <Label>Minutes</Label>
              <Input type="number" value={newPersonMinutes} onChange={(e) => setNewPersonMinutes(parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-slate-500 mt-1">{Math.floor(newPersonMinutes / 60)}h {newPersonMinutes % 60}m</p>
            </div>
            <Button onClick={() => {
              if (!newPersonName.trim()) { toast.error('Enter person name'); return; }
              if (dayPersons.find(p => p.name === newPersonName.trim())) { toast.error('Person already added'); return; }
              setDayPersons([...dayPersons, { name: newPersonName.trim(), available_minutes: newPersonMinutes }]);
              setNewPersonName('');
              setNewPersonMinutes(465);
            }}>
              <Plus className="w-4 h-4 mr-2" />Add
            </Button>
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
                  <Input type="number" value={person.available_minutes} onChange={(e) => { const updated = [...dayPersons]; updated[index].available_minutes = parseFloat(e.target.value) || 0; setDayPersons(updated); }} className="w-24" />
                  <Button onClick={() => setDayPersons(dayPersons.filter((_, i) => i !== index))} variant="ghost" size="icon">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {dayPersons.length > 0 && (
            <div className="bg-slate-100 p-3 rounded-lg">
              <p className="text-sm font-semibold">Total Available: {dayPersons.reduce((s, p) => s + p.available_minutes, 0)} min</p>
            </div>
          )}
          <div>
            <Label>Notes (Optional)</Label>
            <Textarea value={dayNotes} onChange={(e) => setDayNotes(e.target.value)} placeholder="Day notes..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}