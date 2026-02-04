import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Search, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildItemOperationMap, computeOpsPerPiece, getOperationBreakdown, parseMinutes } from '../standards/shared/calculateOperationsTime';

export default function ScheduledDataTab({ selectedDepartment, selectedBundle }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showLoadTemplateDialog, setShowLoadTemplateDialog] = useState(false);
  const [showTeamTimeDialog, setShowTeamTimeDialog] = useState(false);
  const [showAssignPersonsDialog, setShowAssignPersonsDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTargetType, setSelectedTargetType] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [loadToDate, setLoadToDate] = useState('');
  const [teamEntries, setTeamEntries] = useState([]);
  const [dayPersons, setDayPersons] = useState([]);
  const [dayNotes, setDayNotes] = useState('');
  const [formData, setFormData] = useState({
    date: '',
    operation_profile_id: '',
    item_codes: [],
    qc_type: '',
    qc_level: '',
    ops_qty: '',
    qc_qty: '0',
    notes: ''
  });

  // Fetch item codes from DATA tab of selected bundle
  const { data: dataLines = [], isLoading: dataLinesLoading, isFetched: dataLinesFetched } = useQuery({
    queryKey: ['StdSetLines', selectedBundle?.id],
    queryFn: () => base44.entities.StdSetLines.filter({ bundle_id: selectedBundle.id }),
    enabled: !!selectedBundle,
    staleTime: 0
  });
  
  const itemCodes = useMemo(() => {
    return [...new Set(dataLines.map(l => l.item_code).filter(Boolean))].sort();
  }, [dataLines]);
  const hasItemCodes = itemCodes.length > 0;

  // Fetch operation profiles from Profiles tab (same department)
  const { data: allProfiles = [], isLoading: profilesLoading, isFetched: profilesFetched } = useQuery({
    queryKey: ['OperationProfileName'],
    queryFn: () => base44.entities.OperationProfileName.filter({ is_active: true }),
    staleTime: 0
  });

  const profiles = useMemo(() => {
    if (!selectedBundle?.department) return [];
    return allProfiles.filter(p => p.department === selectedBundle.department);
  }, [allProfiles, selectedBundle]);

  // Fetch Operations (needed for shared calculation engine)
  const { data: allOperations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.filter({ is_active: true }),
    staleTime: 0
  });
  const operations = allOperations
    .filter(op => op.is_allowed !== false)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .slice(0, 10);

  // Fetch QC types
  const { data: qcTypes = [], isLoading: qcTypesLoading } = useQuery({
    queryKey: ['QC_Type'],
    queryFn: () => base44.entities.QC_Type.filter({ is_active: true }),
    staleTime: 0
  });

  // Fetch QC levels
  const { data: qcLevels = [], isLoading: qcLevelsLoading } = useQuery({
    queryKey: ['QCLevel'],
    queryFn: () => base44.entities.QCLevel.filter({ is_active: true }),
    staleTime: 0
  });

  // Fetch QC Set Lines for QC calculations
  const { data: qcSetLines = [], isFetched: qcSetLinesFetched } = useQuery({
    queryKey: ['QCSetLines', selectedBundle?.id],
    queryFn: () => base44.entities.QCSetLines.filter({ bundle_id: selectedBundle.id }),
    enabled: !!selectedBundle,
    staleTime: 0
  });

  // Check if all required data is ready for calculations
  const dataPivotReady = dataLinesFetched && dataLines.length >= 0;
  const profilesReady = profilesFetched && allProfiles.length >= 0;
  const qcRulesReady = qcSetLinesFetched && qcSetLines.length >= 0;

  // Build item-operation map using shared utility
  const itemOperationMap = useMemo(() => {
    return buildItemOperationMap(dataLines);
  }, [dataLines]);

  // Fetch scheduled data lines
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['ScheduledData', selectedBundle?.id],
    queryFn: () => base44.entities.ScheduledData.filter({ bundle_id: selectedBundle.id }),
    enabled: !!selectedBundle,
    staleTime: 0
  });

  // Fetch persons
  const { data: persons = [] } = useQuery({
    queryKey: ['Person'],
    queryFn: () => base44.entities.Person.filter({ is_active: true }),
    staleTime: 0
  });

  // Fetch target types
  const { data: targetTypes = [] } = useQuery({
    queryKey: ['TargetType', selectedBundle?.id],
    queryFn: () => base44.entities.TargetType.filter({ bundle_id: selectedBundle.id }),
    enabled: !!selectedBundle,
    staleTime: 0
  });

  // Fetch daily target lines
  const { data: dailyTargetLines = [] } = useQuery({
    queryKey: ['DailyTargetLines', selectedBundle?.id],
    queryFn: () => base44.entities.DailyTargetLines.filter({ bundle_id: selectedBundle.id }),
    enabled: !!selectedBundle,
    staleTime: 0
  });

  // Fetch schedule templates
  const { data: templates = [] } = useQuery({
    queryKey: ['ScheduleTemplate', selectedBundle?.id],
    queryFn: () => base44.entities.ScheduleTemplate.filter({ bundle_id: selectedBundle.id }),
    enabled: !!selectedBundle,
    staleTime: 0
  });

  // Fetch daily team availability
  const { data: teamAvailability = [] } = useQuery({
    queryKey: ['DailyTeamAvailability', selectedBundle?.id, selectedDate],
    queryFn: () => base44.entities.DailyTeamAvailability.filter({ 
      bundle_id: selectedBundle.id,
      date: selectedDate 
    }),
    enabled: !!selectedBundle && !!selectedDate,
    staleTime: 0
  });

  // Fetch day assignments
  const { data: dayAssignments = [] } = useQuery({
    queryKey: ['ScheduledDayAssignments', selectedBundle?.id, selectedDate],
    queryFn: () => base44.entities.ScheduledDayAssignments.filter({ 
      bundle_id: selectedBundle.id,
      date: selectedDate 
    }),
    enabled: !!selectedBundle && !!selectedDate,
    staleTime: 0
  });

  const currentDayAssignment = dayAssignments[0] || null;

  // Calculate per-piece and total times (REUSES Daily Targets engine)
  const calculateTimes = (itemCode, profileId, opsQty, qcQty, qcType, qcLevel, isDebugRecord = false) => {
    // Check if data is ready
    if (!dataPivotReady || !profilesReady || !qcRulesReady) {
      if (isDebugRecord) {
        console.warn('⏳ Data not ready yet:', { dataPivotReady, profilesReady, qcRulesReady });
      }
      return { ops_per_piece_min: 0, ops_total_min: 0, qc_per_piece_min: 0, qc_total_min: 0, grand_total_min: 0 };
    }

    // Get the profile
    const profile = allProfiles.find(p => p.id === profileId);
    
    // USE SHARED CALCULATION ENGINE from Daily Targets
    const ops_per_piece_min = computeOpsPerPiece(itemCode, profile, operations, itemOperationMap, isDebugRecord);
    const ops_total_min = ops_per_piece_min * opsQty;

    // Calculate QC time (still specific to Scheduled Data)
    let qc_per_piece_min = 0;
    let qc_total_min = 0;

    if (qcType && qcLevel && qcQty > 0) {
      // For QC, we need to use canonical matching since QC rules may use different casing
      const canonicalOpKey = (name) => {
        if (!name) return '';
        return name.toString().trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
      };

      const allowedOpsCanonical = profile?.operations_required
        ?.map(opId => operations.find(o => o.id === opId)?.name)
        .filter(Boolean)
        .map(canonicalOpKey) || [];

      const qcRules = qcSetLines.filter(qc => 
        qc.item_code === itemCode && 
        qc.qc_type === qcType && 
        qc.qc_level === qcLevel &&
        allowedOpsCanonical.includes(canonicalOpKey(qc.operation))
      );

      for (const qc of qcRules) {
        const baseLine = dataLines.find(l => 
          l.item_code === itemCode && 
          canonicalOpKey(l.operation) === canonicalOpKey(qc.operation)
        );
        const baseTime = baseLine ? parseMinutes(baseLine.std_min_per_pc) : 0;

        let extraTime = 0;
        if (qc.mode === 'percent') {
          extraTime = baseTime * (qc.qc_value / 100);
        } else if (qc.mode === 'fixed') {
          extraTime = parseMinutes(qc.qc_value);
        } else {
          extraTime = parseMinutes(qc.calculated_extra_time_min);
        }

        qc_per_piece_min += extraTime;
      }

      qc_total_min = qc_per_piece_min * qcQty;

      if (isDebugRecord && qcRules.length > 0) {
        console.log('🧪 QC calculation:', { qcRulesFoundCount: qcRules.length, qc_per_piece_min, qc_total_min });
      }
    }

    const grand_total_min = ops_total_min + qc_total_min;

    return { ops_per_piece_min, ops_total_min, qc_per_piece_min, qc_total_min, grand_total_min };
  };

  // Filtered lines with recalculated values
  const filteredLines = useMemo(() => {
    if (!dataPivotReady || !profilesReady || !qcRulesReady) {
      return lines;
    }

    let filtered = lines;
    
    // Filter by date if selected
    if (selectedDate) {
      filtered = filtered.filter(l => l.date === selectedDate);
    }
    
    // Filter by search
    if (searchFilter) {
      const term = searchFilter.toLowerCase();
      filtered = filtered.filter(l => 
        l.item_code?.toLowerCase().includes(term) || l.date?.includes(term)
      );
    }

    const recalculated = filtered.map((line, index) => {
      const isFirstRecord = index === 0 && filtered.length > 0;
      const computed = calculateTimes(
        line.item_code,
        line.operation_profile_id,
        line.ops_qty,
        line.qc_qty,
        line.qc_type,
        line.qc_level,
        isFirstRecord
      );
      return {
        ...line,
        ...computed
      };
    });

    return recalculated;
  }, [lines, searchFilter, selectedDate, dataLines, allProfiles, qcSetLines, dataPivotReady, profilesReady, qcRulesReady]);

  // Get unique dates from lines
  const availableDates = useMemo(() => {
    return [...new Set(lines.map(l => l.date))].sort();
  }, [lines]);

  // Calculate daily summary
  const dailySummary = useMemo(() => {
    if (!selectedDate) return null;
    
    const dateLines = filteredLines.filter(l => l.date === selectedDate);
    const opsTotal = dateLines.reduce((sum, l) => sum + (l.ops_total_min || 0), 0);
    const qcTotal = dateLines.reduce((sum, l) => sum + (l.qc_total_min || 0), 0);
    const grandTotal = opsTotal + qcTotal;

    let targetTotal = 0;
    if (selectedTargetType) {
      const typeTargets = dailyTargetLines.filter(t => t.target_type === selectedTargetType);
      targetTotal = typeTargets.reduce((sum, t) => sum + (t.item_total_min || 0), 0);
    }

    return { opsTotal, qcTotal, grandTotal, targetTotal };
  }, [selectedDate, filteredLines, selectedTargetType, dailyTargetLines]);

  // Calculate team summary
  const teamSummary = useMemo(() => {
    if (!selectedDate) return null;
    
    const totalAvailable = teamAvailability.reduce((sum, t) => sum + (t.available_minutes || 0), 0);
    const totalScheduled = dailySummary?.grandTotal || 0;
    const coverage = totalAvailable > 0 ? (totalScheduled / totalAvailable * 100) : 0;

    return { totalAvailable, totalScheduled, coverage };
  }, [selectedDate, teamAvailability, dailySummary]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (records) => {
      // Check for duplicates
      for (const record of records) {
        const exists = lines.find(l => 
          l.date === record.date &&
          l.bundle_id === record.bundle_id &&
          l.item_code === record.item_code &&
          l.operation_profile_id === record.operation_profile_id
        );
        if (exists) {
          throw new Error(`This item is already scheduled with the same operation profile for this date: ${record.item_code}`);
        }
      }

      // Create all records
      await Promise.all(records.map(r => base44.entities.ScheduledData.create(r)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ScheduledData'] });
      setShowAddDialog(false);
      setFormData({
        date: '',
        operation_profile_id: '',
        item_codes: [],
        qc_type: '',
        qc_level: '',
        ops_qty: '',
        qc_qty: '0',
        notes: ''
      });
      toast.success('Scheduled data added');
    },
    onError: (error) => {
      toast.error('Failed to add: ' + error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.ScheduledData.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ScheduledData'] });
      toast.success('Scheduled data deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.ScheduledData.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ScheduledData'] });
      setShowEditDialog(false);
      setEditingRecord(null);
      toast.success('Scheduled data updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async ({ name, data }) => {
      await base44.entities.ScheduleTemplate.create({
        bundle_id: selectedBundle.id,
        template_name: name,
        template_data: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ScheduleTemplate'] });
      setShowSaveTemplateDialog(false);
      setTemplateName('');
      toast.success('Template saved');
    },
    onError: (error) => {
      toast.error('Failed to save template: ' + error.message);
    }
  });

  // Load template mutation
  const loadTemplateMutation = useMutation({
    mutationFn: async ({ templateData, targetDate }) => {
      const records = templateData.map(item => ({
        ...item,
        date: targetDate,
        bundle_id: selectedBundle.id
      }));
      await Promise.all(records.map(r => base44.entities.ScheduledData.create(r)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ScheduledData'] });
      setShowLoadTemplateDialog(false);
      setLoadToDate('');
      toast.success('Template loaded');
    },
    onError: (error) => {
      toast.error('Failed to load template: ' + error.message);
    }
  });

  // Save team availability mutation
  const saveTeamMutation = useMutation({
    mutationFn: async (entries) => {
      // Delete existing entries for this date
      const existing = teamAvailability;
      await Promise.all(existing.map(e => base44.entities.DailyTeamAvailability.delete(e.id)));
      
      // Create new entries
      await Promise.all(entries.map(entry => 
        base44.entities.DailyTeamAvailability.create({
          bundle_id: selectedBundle.id,
          date: selectedDate,
          ...entry
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['DailyTeamAvailability'] });
      setShowTeamTimeDialog(false);
      setTeamEntries([]);
      toast.success('Team availability saved');
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    }
  });

  // Save day assignments mutation
  const saveDayAssignmentsMutation = useMutation({
    mutationFn: async ({ persons, notes }) => {
      if (currentDayAssignment) {
        await base44.entities.ScheduledDayAssignments.update(currentDayAssignment.id, {
          assigned_persons: persons,
          notes
        });
      } else {
        await base44.entities.ScheduledDayAssignments.create({
          bundle_id: selectedBundle.id,
          date: selectedDate,
          assigned_persons: persons,
          notes
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ScheduledDayAssignments'] });
      setShowAssignPersonsDialog(false);
      toast.success('Day assignments saved');
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    }
  });

  const handleAdd = () => {
    // Validation
    if (!formData.date || !formData.operation_profile_id || formData.item_codes.length === 0 || !formData.ops_qty) {
      toast.error('Please fill all required fields (Date, Operation Profile, Item Codes, Ops Qty)');
      return;
    }

    const opsQty = parseFloat(formData.ops_qty);
    if (isNaN(opsQty) || opsQty <= 0) {
      toast.error('Ops Qty must be greater than 0');
      return;
    }

    // Default QC Qty to Ops Qty if not specified or 0
    let qcQty = parseFloat(formData.qc_qty);
    if (isNaN(qcQty) || qcQty === 0) {
      qcQty = opsQty; // Default to ops_qty
    }
    if (qcQty < 0) {
      toast.error('QC Qty must be 0 or greater');
      return;
    }

    if (formData.qc_type && !formData.qc_level) {
      toast.error('QC Level is required when QC Type is selected');
      return;
    }

    // Check item codes exist in DATA
    const invalidItems = formData.item_codes.filter(ic => !itemCodes.includes(ic));
    if (invalidItems.length > 0) {
      toast.error(`Item codes not found in DATA tab: ${invalidItems.join(', ')}`);
      return;
    }

    // Check profile is active
    const profile = allProfiles.find(p => p.id === formData.operation_profile_id);
    if (!profile || !profile.is_active) {
      toast.error('Selected Operation Profile is not active');
      return;
    }

    // Create one record per selected item code
    const records = formData.item_codes.map(itemCode => {
      const times = calculateTimes(itemCode, formData.operation_profile_id, opsQty, qcQty, formData.qc_type, formData.qc_level);
      return {
        bundle_id: selectedBundle.id,
        date: formData.date,
        item_code: itemCode,
        operation_profile_id: formData.operation_profile_id,
        ops_qty: opsQty,
        qc_qty: qcQty,
        qc_type: formData.qc_type || null,
        qc_level: formData.qc_level || null,
        notes: formData.notes || null,
        ...times
      };
    });

    createMutation.mutate(records);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setShowEditDialog(true);
  };

  const handleUpdateRecord = () => {
    if (!editingRecord) return;

    const opsQty = parseFloat(editingRecord.ops_qty);
    if (isNaN(opsQty) || opsQty <= 0) {
      toast.error('Ops Qty must be greater than 0');
      return;
    }

    let qcQty = parseFloat(editingRecord.qc_qty);
    if (isNaN(qcQty) || qcQty === 0) {
      qcQty = opsQty;
    }

    const times = calculateTimes(
      editingRecord.item_code,
      editingRecord.operation_profile_id,
      opsQty,
      qcQty,
      editingRecord.qc_type,
      editingRecord.qc_level
    );

    updateMutation.mutate({
      id: editingRecord.id,
      data: {
        ...editingRecord,
        ops_qty: opsQty,
        qc_qty: qcQty,
        ...times
      }
    });
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (!selectedDate) {
      toast.error('Please select a date first');
      return;
    }

    const dateLines = lines.filter(l => l.date === selectedDate);
    if (dateLines.length === 0) {
      toast.error('No scheduled data for selected date');
      return;
    }

    // Remove date and IDs from template data
    const templateData = dateLines.map(({ id, date, bundle_id, created_date, updated_date, created_by, ...rest }) => rest);

    saveTemplateMutation.mutate({
      name: templateName.trim(),
      data: templateData
    });
  };

  const handleLoadTemplate = (template) => {
    if (!loadToDate) {
      toast.error('Please select target date');
      return;
    }

    loadTemplateMutation.mutate({
      templateData: template.template_data,
      targetDate: loadToDate
    });
  };

  const handleOpenTeamTime = () => {
    // Initialize with existing availability or empty
    if (teamAvailability.length > 0) {
      setTeamEntries(teamAvailability.map(t => ({
        person_name: t.person_name,
        available_minutes: t.available_minutes,
        notes: t.notes || ''
      })));
    } else {
      setTeamEntries([]);
    }
    setShowTeamTimeDialog(true);
  };

  const handleAddTeamEntry = () => {
    setTeamEntries([...teamEntries, { person_name: '', available_minutes: 480, notes: '' }]);
  };

  const handleRemoveTeamEntry = (index) => {
    setTeamEntries(teamEntries.filter((_, i) => i !== index));
  };

  const handleTeamEntryChange = (index, field, value) => {
    const updated = [...teamEntries];
    updated[index][field] = value;
    setTeamEntries(updated);
  };

  const handleSaveTeam = () => {
    const valid = teamEntries.every(e => e.person_name.trim() && e.available_minutes > 0);
    if (!valid) {
      toast.error('All entries must have a person and positive minutes');
      return;
    }

    saveTeamMutation.mutate(teamEntries);
  };

  const handleOpenAssignPersons = () => {
    if (currentDayAssignment) {
      setDayPersons(currentDayAssignment.assigned_persons || []);
      setDayNotes(currentDayAssignment.notes || '');
    } else {
      setDayPersons([]);
      setDayNotes('');
    }
    setShowAssignPersonsDialog(true);
  };

  const handleSaveDayAssignments = () => {
    saveDayAssignmentsMutation.mutate({
      persons: dayPersons,
      notes: dayNotes
    });
  };

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setShowDetailsDialog(true);
  };

  const getProfileName = (profileId) => {
    const profile = allProfiles.find(p => p.id === profileId);
    return profile?.name || 'Unknown';
  };

  const getRecordDetails = (record) => {
    const profile = allProfiles.find(p => p.id === record.operation_profile_id);
    if (!profile) return null;

    // Use shared breakdown utility
    const breakdown = getOperationBreakdown(record.item_code, profile, operations, itemOperationMap);

    const qcBreakdown = [];
    if (record.qc_type && record.qc_level) {
      const canonicalOpKey = (name) => {
        if (!name) return '';
        return name.toString().trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
      };

      const allowedOpsCanonical = profile.operations_required
        ?.map(opId => operations.find(o => o.id === opId)?.name)
        .filter(Boolean)
        .map(canonicalOpKey) || [];

      const qcRules = qcSetLines.filter(qc => 
        qc.item_code === record.item_code && 
        qc.qc_type === record.qc_type && 
        qc.qc_level === record.qc_level &&
        allowedOpsCanonical.includes(canonicalOpKey(qc.operation))
      );

      qcBreakdown.push(...qcRules.map(qc => {
        const baseLine = dataLines.find(l => 
          l.item_code === record.item_code && 
          canonicalOpKey(l.operation) === canonicalOpKey(qc.operation)
        );
        const baseTime = baseLine ? parseMinutes(baseLine.std_min_per_pc) : 0;

        let extraTime = 0;
        if (qc.mode === 'percent') {
          extraTime = baseTime * (qc.qc_value / 100);
        } else if (qc.mode === 'fixed') {
          extraTime = parseMinutes(qc.qc_value);
        } else {
          extraTime = parseMinutes(qc.calculated_extra_time_min);
        }

        return {
          operation: qc.operation,
          minutes: extraTime
        };
      }));
    }

    return { profile, breakdown, qcBreakdown };
  };

  const isLoading_any = isLoading || dataLinesLoading || profilesLoading || qcTypesLoading || qcLevelsLoading;
  const isCalculationReady = dataPivotReady && profilesReady && qcRulesReady;

  if (isLoading_any) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isCalculationReady) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-600">Loading calculation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!hasItemCodes && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Define Item Codes in Standards → DATA tab first.
          </AlertDescription>
        </Alert>
      )}

      {profiles.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Define Operation Profiles in Standards → Profiles tab first.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h3 className="text-lg font-semibold">Scheduled Data</h3>
        
        <div className="flex gap-2 items-center">
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All Dates</SelectItem>
              {availableDates.map(date => (
                <SelectItem key={date} value={date}>{date}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Filter..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9 w-40"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {selectedDate && (
            <>
              <Button onClick={() => setShowSaveTemplateDialog(true)} variant="outline" size="sm">
                Save Template
              </Button>
              <Button onClick={() => setShowLoadTemplateDialog(true)} variant="outline" size="sm">
                Load Template
              </Button>
            </>
          )}
          <Button 
            onClick={() => setShowAddDialog(true)} 
            variant="outline" 
            size="sm"
            disabled={!hasItemCodes || profiles.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* Assigned Persons Card */}
      {selectedDate && (
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-semibold text-purple-900 mb-2">Assigned Persons (Day)</p>
                {currentDayAssignment ? (
                  <>
                    <p className="text-lg">
                      {currentDayAssignment.assigned_persons?.join(', ') || 'None assigned'}
                    </p>
                    {currentDayAssignment.notes && (
                      <p className="text-sm text-purple-700 mt-1">{currentDayAssignment.notes}</p>
                    )}
                  </>
                ) : (
                  <p className="text-slate-500 italic">No persons assigned yet</p>
                )}
              </div>
              <Button onClick={handleOpenAssignPersons} size="sm">
                {currentDayAssignment ? 'Edit' : 'Assign'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Summary */}
      {selectedDate && dailySummary && (
        <Card className="bg-blue-50">
          <CardContent className="pt-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-600">Ops Total</p>
                <p className="text-xl font-bold">{dailySummary.opsTotal.toFixed(2)} min</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">QC Total</p>
                <p className="text-xl font-bold">{dailySummary.qcTotal.toFixed(2)} min</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Grand Total</p>
                <p className="text-xl font-bold text-blue-700">{dailySummary.grandTotal.toFixed(2)} min</p>
              </div>
              <div>
                <Label className="text-sm">Target Type</Label>
                <Select value={selectedTargetType} onValueChange={setSelectedTargetType}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Compare" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {targetTypes.map(tt => (
                      <SelectItem key={tt.id} value={tt.name}>{tt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTargetType && (
                  <p className="text-lg font-semibold mt-1">{dailySummary.targetTotal.toFixed(2)} min</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-lg overflow-auto bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Item Code</TableHead>
              <TableHead className="font-semibold">Profile</TableHead>
              <TableHead className="font-semibold text-right">Ops Qty</TableHead>
              <TableHead className="font-semibold text-right">Ops Total</TableHead>
              <TableHead className="font-semibold text-right">QC Total</TableHead>
              <TableHead className="font-semibold text-right">Grand Total</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-slate-500 py-12">
                  {searchFilter ? 'No matching scheduled data found' : 'No scheduled data defined. Click "Add Scheduled Data" to start.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLines.map(line => (
                <TableRow 
                  key={line.id} 
                  className="hover:bg-slate-50"
                >
                  <TableCell className="font-medium">{line.date}</TableCell>
                  <TableCell className="font-medium">{line.item_code}</TableCell>
                  <TableCell className="text-sm">{getProfileName(line.operation_profile_id)}</TableCell>
                  <TableCell className="text-right font-mono">{line.ops_qty}</TableCell>
                  <TableCell className="text-right font-mono">{(line.ops_total_min || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{(line.qc_total_min || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{(line.grand_total_min || 0).toFixed(2)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button onClick={() => handleEdit(line)} variant="ghost" size="sm">
                        Edit
                      </Button>
                      <Button onClick={() => handleRowClick(line)} variant="ghost" size="sm">
                        <Info className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          if (confirm('Delete?')) deleteMutation.mutate(line.id);
                        }}
                        variant="ghost"
                        size="icon"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Scheduled Data</DialogTitle>
            <DialogDescription>Schedule production data for planning</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[500px] overflow-auto">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div>
              <Label>Operation Profile *</Label>
              <Select 
                value={formData.operation_profile_id} 
                onValueChange={(v) => setFormData({ ...formData, operation_profile_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operation profile" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>QC Type (Optional)</Label>
                <Select 
                  value={formData.qc_type} 
                  onValueChange={(v) => setFormData({ ...formData, qc_type: v, qc_level: v ? formData.qc_level : '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select QC type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {qcTypes.map(qt => (
                      <SelectItem key={qt.id} value={qt.name}>{qt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>QC Level {formData.qc_type && '*'}</Label>
                <Select 
                  value={formData.qc_level} 
                  onValueChange={(v) => setFormData({ ...formData, qc_level: v })}
                  disabled={!formData.qc_type}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select QC level" />
                  </SelectTrigger>
                  <SelectContent>
                    {qcLevels.map(ql => (
                      <SelectItem key={ql.id} value={ql.name}>{ql.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.operation_profile_id && (
              <div>
                <Label>Item Codes * (Multi-select)</Label>
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
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.ops_qty}
                  onChange={(e) => setFormData({ ...formData, ops_qty: e.target.value })}
                  placeholder="Enter ops quantity"
                />
              </div>

              <div>
                <Label>QC Qty (Optional, defaults to Ops Qty)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.qc_qty}
                  onChange={(e) => setFormData({ ...formData, qc_qty: e.target.value })}
                  placeholder="Leave blank to use Ops Qty"
                />
              </div>
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Scheduled Data Details</DialogTitle>
          </DialogHeader>

          {selectedRecord && (() => {
            const details = getRecordDetails(selectedRecord);
            if (!details) return <p>No details available</p>;

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-600">Date</Label>
                    <p className="font-medium">{selectedRecord.date}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Item Code</Label>
                    <p className="font-medium">{selectedRecord.item_code}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Operation Profile</Label>
                    <p className="font-medium">{details.profile.name}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Ops Qty</Label>
                    <p className="font-medium">{selectedRecord.ops_qty}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">QC Qty</Label>
                    <p className="font-medium">{selectedRecord.qc_qty}</p>
                  </div>
                  {selectedRecord.notes && (
                    <div className="col-span-2">
                      <Label className="text-slate-600">Notes</Label>
                      <p className="font-medium">{selectedRecord.notes}</p>
                    </div>
                  )}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Operations Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Operation</TableHead>
                          <TableHead className="text-right">Minutes per Piece</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {details.breakdown.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.operation}</TableCell>
                            <TableCell className="text-right font-mono">{item.minutes.toFixed(2)}</TableCell>
                          </TableRow>
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
                    <CardHeader>
                      <CardTitle className="text-base">QC Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Operation</TableHead>
                            <TableHead className="text-right">Extra Minutes per Piece</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {details.qcBreakdown.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.operation}</TableCell>
                              <TableCell className="text-right font-mono">{item.minutes.toFixed(2)}</TableCell>
                            </TableRow>
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
                      <div>
                        <p className="text-sm text-slate-600">Ops Total</p>
                        <p className="text-lg font-bold">{(selectedRecord.ops_total_min || 0).toFixed(2)} min</p>
                        <p className="text-xs text-slate-500">({selectedRecord.ops_per_piece_min.toFixed(2)} × {selectedRecord.ops_qty})</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">QC Total</p>
                        <p className="text-lg font-bold">{(selectedRecord.qc_total_min || 0).toFixed(2)} min</p>
                        <p className="text-xs text-slate-500">({selectedRecord.qc_per_piece_min.toFixed(2)} × {selectedRecord.qc_qty})</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Grand Total</p>
                        <p className="text-lg font-bold text-blue-700">{(selectedRecord.grand_total_min || 0).toFixed(2)} min</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Scheduled Data</DialogTitle>
          </DialogHeader>

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
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateRecord}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Schedule as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g., Standard Monday Schedule"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                This will save all scheduled data for {selectedDate} as a reusable template (without date).
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={showLoadTemplateDialog} onOpenChange={setShowLoadTemplateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Load Schedule Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Target Date *</Label>
              <Input
                type="date"
                value={loadToDate}
                onChange={(e) => setLoadToDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Select Template</Label>
              <div className="border rounded-lg divide-y max-h-96 overflow-auto">
                {templates.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No templates saved yet</p>
                ) : (
                  templates.map(template => (
                    <div key={template.id} className="p-4 hover:bg-slate-50 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{template.template_name}</p>
                        <p className="text-sm text-slate-500">{template.template_data.length} items</p>
                      </div>
                      <Button
                        onClick={() => handleLoadTemplate(template)}
                        disabled={!loadToDate}
                        size="sm"
                      >
                        Load
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadTemplateDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Time Dialog */}
      <Dialog open={showTeamTimeDialog} onOpenChange={setShowTeamTimeDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Team Time - {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-600">Set available minutes for each team member</p>
              <Button onClick={handleAddTeamEntry} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Person
              </Button>
            </div>

            <div className="space-y-2">
              {teamEntries.map((entry, index) => (
                <Card key={index} className="p-3">
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-4">
                      <Label className="text-xs">Person</Label>
                      <Select 
                        value={entry.person_name} 
                        onValueChange={(val) => handleTeamEntryChange(index, 'person_name', val)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {persons.map(p => (
                            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Or type name"
                        className="mt-1 h-8 text-xs"
                        value={entry.person_name}
                        onChange={(e) => handleTeamEntryChange(index, 'person_name', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Minutes</Label>
                      <Input
                        type="number"
                        className="h-8"
                        value={entry.available_minutes}
                        onChange={(e) => handleTeamEntryChange(index, 'available_minutes', parseFloat(e.target.value) || 0)}
                      />
                      <p className="text-xs text-slate-500 mt-1">{(entry.available_minutes / 60).toFixed(1)} hrs</p>
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Notes</Label>
                      <Input
                        className="h-8"
                        placeholder="Optional"
                        value={entry.notes}
                        onChange={(e) => handleTeamEntryChange(index, 'notes', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        onClick={() => handleRemoveTeamEntry(index)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {teamEntries.length === 0 && (
                <p className="text-center text-slate-500 py-8">No team entries yet. Click "Add Person" to start.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeamTimeDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTeam} disabled={teamEntries.length === 0}>
              Save Team Availability
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Persons Dialog */}
      <Dialog open={showAssignPersonsDialog} onOpenChange={setShowAssignPersonsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assigned Persons - {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Select Persons</Label>
              <MultiSelect
                options={persons.map(p => ({ value: p.name, label: p.name }))}
                selected={dayPersons}
                onChange={setDayPersons}
                placeholder="Select persons for this day"
              />
              <Input
                placeholder="Or type new person name and press Enter"
                className="mt-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    const newPerson = e.target.value.trim();
                    if (!dayPersons.includes(newPerson)) {
                      setDayPersons([...dayPersons, newPerson]);
                    }
                    e.target.value = '';
                  }
                }}
              />
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={dayNotes}
                onChange={(e) => setDayNotes(e.target.value)}
                placeholder="Day notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignPersonsDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveDayAssignments}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}