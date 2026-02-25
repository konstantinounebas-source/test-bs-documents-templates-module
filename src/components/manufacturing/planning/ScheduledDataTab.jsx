import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Search, AlertCircle, Info, Download, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildItemOperationMap, computeOpsPerPiece, getOperationBreakdown, parseMinutes } from '../standards/shared/calculateOperationsTime';
import { AddDialog, EditDialog, DetailsDialog, SaveTemplateDialog, LoadTemplateDialog, AssignPersonsDialog } from './ScheduledDataDialogs';
import { exportScheduledDataToExcel } from '../standards/shared/exportToExcel';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

export default function ScheduledDataTab({ selectedDepartment, selectedBundle: initialSelectedBundle, selectedDate: urlSelectedDate }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedBundle, setSelectedBundle] = useState(null);
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
  const [selectedTargetType, setSelectedTargetType] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [loadToDate, setLoadToDate] = useState('');
  const [teamEntries, setTeamEntries] = useState([]);
  const [dayPersons, setDayPersons] = useState([]);
  const [dayNotes, setDayNotes] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonMinutes, setNewPersonMinutes] = useState(465);
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

  // Fetch all bundles for department (ALL statuses, not just ACTIVE)
  const { data: allBundles = [] } = useQuery({
    queryKey: ['StandardsBundle', selectedDepartment],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      const all = await base44.entities.StandardsBundle.list();
      return all.filter(b => b.department === selectedDepartment);
    },
    enabled: !!selectedDepartment,
    staleTime: 0
  });

  // Fetch DailyStandardsAssignment for this department
  const { data: dailyStandardsAssignments = [] } = useQuery({
    queryKey: ['DailyStandardsAssignment', selectedDepartment],
    queryFn: () => base44.entities.DailyStandardsAssignment.filter({ department_id: selectedDepartment }),
    enabled: !!selectedDepartment,
    staleTime: 0
  });

  // Auto-select active bundle when department changes or bundles load
  useEffect(() => {
    if (!selectedDepartment) {
      setSelectedBundle(null);
      setSelectedDate('');
      return;
    }

    // Find active bundle for this department
    const activeBundle = allBundles.find(b => b.department === selectedDepartment && b.status === 'ACTIVE');
    
    if (activeBundle) {
      setSelectedBundle(activeBundle);
    } else if (allBundles.length > 0) {
      // Fallback to first bundle if no active
      setSelectedBundle(allBundles[0]);
    } else {
      setSelectedBundle(null);
    }
  }, [selectedDepartment, allBundles]);

  // Load date from URL params if provided
  useEffect(() => {
    if (urlSelectedDate) {
      setSelectedDate(urlSelectedDate);
    }
  }, [urlSelectedDate]);

  // Fetch scheduled data lines
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['ScheduledData', selectedDepartment],
    queryFn: () => base44.entities.ScheduledData.filter({ department_id: selectedDepartment }),
    enabled: !!selectedDepartment,
    staleTime: 0
  });

  // Fetch day headers
  const { data: dayHeaders = [] } = useQuery({
    queryKey: ['ScheduledDayHeader', selectedDepartment],
    queryFn: () => base44.entities.ScheduledDayHeader.filter({ department_id: selectedDepartment }),
    enabled: !!selectedDepartment,
    staleTime: 0
  });

  // Get current day header (contains source_bundle_id for this day)
  const currentDayHeader = useMemo(() => {
    if (!selectedDate) return null;
    return dayHeaders.find(h => h.date === selectedDate) || null;
  }, [dayHeaders, selectedDate]);

  // Get source bundle for current day:
  // Priority: 1) DailyStandardsAssignment, 2) ScheduledDayHeader.source_bundle_id, 3) ACTIVE bundle
  const sourceBundleForDay = useMemo(() => {
    if (!selectedDate) return selectedBundle;

    // 1. DailyStandardsAssignment
    const dailyAssignment = dailyStandardsAssignments.find(
      a => a.assignment_date === selectedDate && a.department_id === selectedDepartment
    );
    if (dailyAssignment?.standards_bundle_id) {
      const found = allBundles.find(b => String(b.id) === String(dailyAssignment.standards_bundle_id));
      if (found) return found;
    }

    // 2. ScheduledDayHeader
    if (currentDayHeader?.source_bundle_id) {
      const found = allBundles.find(b => String(b.id) === String(currentDayHeader.source_bundle_id));
      if (found) return found;
    }

    // 3. Fallback to active/default bundle
    return selectedBundle;
  }, [selectedDate, selectedDepartment, dailyStandardsAssignments, currentDayHeader, allBundles, selectedBundle]);

  // Fetch item codes from DATA tab of source bundle for selected day (or default to selected bundle)
  const activeBundleIdForCalculations = sourceBundleForDay?.id || selectedBundle?.id;
  
  const { data: dataLines = [], isLoading: dataLinesLoading, isFetched: dataLinesFetched } = useQuery({
    queryKey: ['StdSetLines', activeBundleIdForCalculations],
    queryFn: () => base44.entities.StdSetLines.filter({ bundle_id: activeBundleIdForCalculations }),
    enabled: !!activeBundleIdForCalculations,
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

  const { data: allDepts = [] } = useQuery({ queryKey: ['Department'], queryFn: () => base44.entities.Department.filter({ is_active: true }) });
  const currentDepartmentId = useMemo(() => allDepts.find(d => d.name === selectedDepartment)?.id || null, [allDepts, selectedDepartment]);
  const { data: allQCTypes = [], isLoading: qcTypesLoading } = useQuery({ queryKey: ['QCType'], queryFn: () => base44.entities.QCType.filter({ is_active: true }), staleTime: 0 });
  const qcTypes = useMemo(() => allQCTypes.filter(qt => !qt.department_ids?.length || !currentDepartmentId || qt.department_ids.includes(currentDepartmentId)), [allQCTypes, currentDepartmentId]);
  const { data: allQCLevels = [], isLoading: qcLevelsLoading } = useQuery({ queryKey: ['QCLevel'], queryFn: () => base44.entities.QCLevel.filter({ is_active: true }), staleTime: 0 });
  const qcLevels = useMemo(() => allQCLevels.filter(ql => !ql.department_ids?.length || !currentDepartmentId || ql.department_ids.includes(currentDepartmentId)), [allQCLevels, currentDepartmentId]);

  // Fetch QC Set Lines for QC calculations (use source bundle for day)
  const { data: qcSetLines = [], isFetched: qcSetLinesFetched } = useQuery({
    queryKey: ['QCSetLines', activeBundleIdForCalculations],
    queryFn: () => base44.entities.QCSetLines.filter({ bundle_id: activeBundleIdForCalculations }),
    enabled: !!activeBundleIdForCalculations,
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

  // Fetch persons
  const { data: persons = [] } = useQuery({
    queryKey: ['Person'],
    queryFn: () => base44.entities.Person.filter({ is_active: true }),
    staleTime: 0
  });

  // Fetch daily target lines (template definitions)
  const { data: dailyTargetLines = [] } = useQuery({
    queryKey: ['DailyTargetLines', selectedBundle?.id],
    queryFn: () => base44.entities.DailyTargetLines.filter({ bundle_id: selectedBundle.id }),
    enabled: !!selectedBundle,
    staleTime: 0
  });

  // Fetch actual targets for calendar indicators
  const { data: allTargetDaily = [] } = useQuery({
    queryKey: ['TargetDaily', selectedDepartment],
    queryFn: () => base44.entities.TargetDaily.filter({ department: selectedDepartment }),
    enabled: !!selectedDepartment,
    staleTime: 0
  });

  // Fetch DailyMetricValue TGT_TIME for the selected date/department (for compare display)
  const { data: tgtTimeMetric } = useQuery({
    queryKey: ['DailyMetricValue_TGT_TIME', selectedDepartment, selectedDate],
    queryFn: async () => {
      const results = await base44.entities.DailyMetricValue.filter({
        metric_code: 'TGT_TIME',
        date: selectedDate,
        department: selectedDepartment
      });
      return results[0] || null;
    },
    enabled: !!selectedDepartment && !!selectedDate,
    staleTime: 0
  });

  // Get unique target types from DailyTargetLines
  const targetTypes = useMemo(() => {
    const uniqueTypes = [...new Set(dailyTargetLines.map(t => t.target_type).filter(Boolean))];
    return uniqueTypes.sort();
  }, [dailyTargetLines]);

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

  // State for editing day source bundle
  const [editingDaySourceBundle, setEditingDaySourceBundle] = useState(false);
  const [tempSourceBundleId, setTempSourceBundleId] = useState('');

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

  // Get dates with scheduled records for calendar indicators
  const datesWithRecords = useMemo(() => {
    if (!lines || lines.length === 0) return new Set();
    return new Set(lines.map(l => l.date).filter(Boolean));
  }, [lines]);

  // Get dates with targets for calendar indicators
  const datesWithTargets = useMemo(() => {
    if (!allTargetDaily || allTargetDaily.length === 0) return new Set();
    return new Set(allTargetDaily.map(t => t.date).filter(Boolean));
  }, [allTargetDaily]);

  // Calendar navigation
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  // Handle day click
  const handleDayClick = async (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    
    // Prefill form date
    setFormData(prev => ({
      ...prev,
      date: dateStr
    }));
    
    // Auto-create day header if it doesn't exist
    const existingHeader = dayHeaders.find(h => h.date === dateStr);
    if (!existingHeader && selectedBundle) {
      try {
        await base44.entities.ScheduledDayHeader.create({
          department_id: selectedDepartment,
          date: dateStr,
          source_bundle_id: selectedBundle.id,
          assigned_persons: []
        });
        queryClient.invalidateQueries({ queryKey: ['ScheduledDayHeader'] });
      } catch (error) {
        console.error('Failed to create day header:', error);
      }
    }
  };

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

  // Calculate assigned persons summary
  const assignedPersonsSummary = useMemo(() => {
    if (!selectedDate || !currentDayAssignment) return null;
    
    const persons = currentDayAssignment.assigned_persons || [];
    let totalAvailable = 0;
    
    // Handle both old (strings) and new (objects) formats
    if (persons.length > 0) {
      if (typeof persons[0] === 'string') {
        totalAvailable = persons.length * 480; // Default 8 hours
      } else {
        totalAvailable = persons.reduce((sum, p) => sum + (p.available_minutes || 0), 0);
      }
    }

    return { totalAvailable };
  }, [selectedDate, currentDayAssignment]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (records) => {
      const firstRecord = records[0];
      const date = firstRecord.date;
      
      // Check/create day header first
      let dayHeader = dayHeaders.find(h => h.date === date);
      
      if (!dayHeader) {
        // Create new day header with source_bundle_id
        dayHeader = await base44.entities.ScheduledDayHeader.create({
          department_id: selectedDepartment,
          date: date,
          source_bundle_id: selectedBundle.id,
          assigned_persons: []
        });
      }

      // Validate all item codes exist in source bundle's DATA
      const sourceBundleId = dayHeader.source_bundle_id;
      const sourceBundleData = await base44.entities.StdSetLines.filter({ bundle_id: sourceBundleId });
      const validItemCodes = new Set(sourceBundleData.map(l => l.item_code));
      
      for (const record of records) {
        if (!validItemCodes.has(record.item_code)) {
          throw new Error(`Item "${record.item_code}" does not exist in the source bundle's DATA. Change source bundle or use a different item code.`);
        }
      }

      // Check for duplicates
      for (const record of records) {
        const exists = lines.find(l => 
          l.date === record.date &&
          l.department_id === record.department_id &&
          l.item_code === record.item_code &&
          l.operation_profile_id === record.operation_profile_id
        );
        if (exists) {
          throw new Error(`This item is already scheduled with the same operation profile for this date: ${record.item_code}`);
        }
      }

      // Create all records with scheduled_day_id
      await Promise.all(records.map(r => base44.entities.ScheduledData.create({
        ...r,
        scheduled_day_id: dayHeader.id
      })));
    },
    onSuccess: async () => {
      await saveSCHTimeMetric();
      queryClient.invalidateQueries({ queryKey: ['ScheduledData'] });
      queryClient.invalidateQueries({ queryKey: ['ScheduledDayHeader'] });
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
    onSuccess: async () => {
      await saveSCHTimeMetric();
      queryClient.invalidateQueries({ queryKey: ['ScheduledData'] });
      toast.success('Scheduled data deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  const saveSCHTimeMetric = async () => {
    try {
      if (!selectedDate) return;

      // Fetch fresh ScheduledData for this date and department
      const allScheduled = await base44.entities.ScheduledData.filter({
        date: selectedDate,
        department_id: selectedDepartment
      });

      // Calculate total grand_total_min (Grand Total Scheduled)
      const totalScheduledTime = allScheduled.reduce((sum, sd) => sum + (sd.grand_total_min || 0), 0);

      // Find and update the SCH_TIME metric by date and department
      const existingMetrics = await base44.entities.DailyMetricValue.filter({
        metric_code: 'SCH_TIME',
        date: selectedDate,
        department: selectedDepartment
      });

      if (existingMetrics.length > 0) {
        await base44.entities.DailyMetricValue.update(existingMetrics[0].id, {
          value: totalScheduledTime
        });
      }

      queryClient.invalidateQueries(['DailyMetricValue']);
    } catch (error) {
      console.error('Failed to save SCH_TIME metric:', error);
    }
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.ScheduledData.update(id, data);
    },
    onSuccess: async () => {
      await saveSCHTimeMetric();
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
    mutationFn: async ({ name, scheduledLines, assignedPersonsData }) => {
      await base44.entities.ScheduleTemplate.create({
        bundle_id: selectedBundle.id,
        template_name: name,
        template_data: scheduledLines,
        assigned_persons_data: assignedPersonsData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ScheduleTemplate'] });
      setShowSaveTemplateDialog(false);
      setTemplateName('');
      toast.success('Template saved with assigned persons');
    },
    onError: (error) => {
      toast.error('Failed to save template: ' + error.message);
    }
  });

  // Load template mutation
  const loadTemplateMutation = useMutation({
    mutationFn: async ({ template, targetDate }) => {
      const scheduledLines = template.template_data || [];
      const assignedPersonsData = template.assigned_persons_data;

      // Check/create day header first
      let dayHeader = dayHeaders.find(h => h.date === targetDate);
      
      if (!dayHeader) {
        dayHeader = await base44.entities.ScheduledDayHeader.create({
          department_id: selectedDepartment,
          date: targetDate,
          source_bundle_id: selectedBundle.id,
          assigned_persons: assignedPersonsData?.assigned_persons || []
        });
      }

      // Create scheduled records with scheduled_day_id
      const records = scheduledLines.map(item => ({
        ...item,
        scheduled_day_id: dayHeader.id,
        department_id: selectedDepartment,
        date: targetDate
      }));
      await Promise.all(records.map(r => base44.entities.ScheduledData.create(r)));

      // Load assigned persons if exists
      if (assignedPersonsData && assignedPersonsData.assigned_persons) {
        // Check if day assignment already exists
        const existingAssignment = await base44.entities.ScheduledDayAssignments.filter({
          bundle_id: selectedBundle.id,
          date: targetDate
        });

        if (existingAssignment.length > 0) {
          // Update existing
          await base44.entities.ScheduledDayAssignments.update(existingAssignment[0].id, {
            assigned_persons: assignedPersonsData.assigned_persons,
            notes: assignedPersonsData.day_notes || ''
          });
        } else {
          // Create new
          await base44.entities.ScheduledDayAssignments.create({
            bundle_id: selectedBundle.id,
            date: targetDate,
            assigned_persons: assignedPersonsData.assigned_persons,
            notes: assignedPersonsData.day_notes || ''
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ScheduledData'] });
      queryClient.invalidateQueries({ queryKey: ['ScheduledDayHeader'] });
      queryClient.invalidateQueries({ queryKey: ['ScheduledDayAssignments'] });
      setShowLoadTemplateDialog(false);
      setLoadToDate('');
      toast.success('Template loaded with assigned persons');
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
      // Also update the day header
      if (currentDayHeader) {
        await base44.entities.ScheduledDayHeader.update(currentDayHeader.id, {
          assigned_persons: persons,
          day_notes: notes
        });
      } else {
        // Create day header if doesn't exist
        await base44.entities.ScheduledDayHeader.create({
          department_id: selectedDepartment,
          date: selectedDate,
          source_bundle_id: selectedBundle.id,
          assigned_persons: persons,
          day_notes: notes
        });
      }

      // Also update old ScheduledDayAssignments for backward compatibility
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
      queryClient.invalidateQueries({ queryKey: ['ScheduledDayHeader'] });
      queryClient.invalidateQueries({ queryKey: ['ScheduledDayAssignments'] });
      setShowAssignPersonsDialog(false);
      toast.success('Day assignments saved');
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    }
  });

  const handleAddDialogOpen = () => {
    // Auto-fill date if selected
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: selectedDate
      }));
    }
    setShowAddDialog(true);
  };

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
        department_id: selectedDepartment,
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

    // Include assigned persons if exists
    const assignedPersonsData = currentDayAssignment ? {
      assigned_persons: currentDayAssignment.assigned_persons || [],
      day_notes: currentDayAssignment.notes || ''
    } : null;

    saveTemplateMutation.mutate({
      name: templateName.trim(),
      scheduledLines: templateData,
      assignedPersonsData: assignedPersonsData
    });
  };

  const handleLoadTemplate = (template) => {
    if (!loadToDate) {
      toast.error('Please select target date');
      return;
    }

    loadTemplateMutation.mutate({
      template: template,
      targetDate: loadToDate
    });
  };

  const handleLoadTemplateDialogOpen = () => {
    if (!selectedDate) {
      toast.error('Select a date from the calendar first');
      return;
    }
    setLoadToDate(selectedDate);
    setShowLoadTemplateDialog(true);
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
    setTeamEntries([...teamEntries, { person_name: '', available_minutes: 465, notes: '' }]);
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
      // Convert old format to new format if needed
      const persons = currentDayAssignment.assigned_persons || [];
      if (persons.length > 0 && typeof persons[0] === 'string') {
        // Old format: array of strings
        setDayPersons(persons.map(name => ({ name, available_minutes: 480 })));
      } else {
        // New format: array of objects
        setDayPersons(persons);
      }
      setDayNotes(currentDayAssignment.notes || '');
    } else {
      setDayPersons([]);
      setDayNotes('');
    }
    setNewPersonName('');
    setNewPersonMinutes(465);
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

  if (!selectedDepartment) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          Please select a Department from Step 1 (Reference Data Setup) first.
        </AlertDescription>
      </Alert>
    );
  }

  if (!selectedBundle) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-600">Loading bundle...</p>
        </div>
      </div>
    );
  }

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

      <div className="flex justify-between items-center gap-4">
        <h3 className="text-lg font-semibold">Scheduled Data - {selectedDepartment}</h3>
      </div>

      {/* Calendar Month View */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-slate-600 py-2">
                {day}
              </div>
            ))}
            
            {calendarDays.map((day, index) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const hasRecords = datesWithRecords.has(dateStr);
              const hasTargets = datesWithTargets.has(dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = isSameDay(day, new Date());
              
              return (
                <button
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`
                    relative p-3 text-center rounded-lg border transition-all
                    ${isSelected ? 'bg-blue-100 border-blue-500 font-semibold' : 'border-slate-200 hover:bg-slate-50'}
                    ${isToday ? 'ring-2 ring-blue-300' : ''}
                    ${!isSameMonth(day, currentMonth) ? 'text-slate-300' : 'text-slate-900'}
                  `}
                >
                  <div className="text-sm">{format(day, 'd')}</div>
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                    {hasRecords && (
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    )}
                    {hasTargets && (
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day View - Only show if date selected */}
      {!selectedDate ? (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            Select a date from the calendar to view or add scheduled data.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Source Bundle for Day */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm font-semibold text-amber-900">Source Bundle (for this day):</p>
                {sourceBundleForDay ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      📦 {sourceBundleForDay.version_no} ({sourceBundleForDay.status})
                    </span>
                    {sourceBundleForDay.id !== selectedBundle?.id && (
                      <span className="text-xs text-amber-700">⚠️ Different from default bundle</span>
                    )}
                    <span className="text-xs text-slate-500 ml-1">
                      — To change, use <a href="#" className="underline text-indigo-600" onClick={e => { e.preventDefault(); }}>Daily Standards Assignment</a>
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-red-600">❌ No bundle found for this date</span>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center gap-4">
            <h4 className="text-base font-semibold">Scheduled Data - {selectedDate}</h4>
            
            <div className="flex gap-2">
              <Button
                onClick={() => navigate(createPageUrl("MfgDailyProduction") + `?date=${selectedDate}&department=${encodeURIComponent(selectedDepartment)}`)}
                variant="outline"
                size="sm"
                className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Go to Daily
              </Button>
              <Button 
                onClick={() => exportScheduledDataToExcel(filteredLines, getProfileName, selectedDate, selectedBundle?.name)}
                variant="outline" 
                size="sm"
                disabled={filteredLines.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setShowSaveTemplateDialog(true)} variant="outline" size="sm">
                Save Template
              </Button>
              <Button onClick={handleLoadTemplateDialogOpen} variant="outline" size="sm">
                Load Template
              </Button>
              <Button 
                onClick={handleAddDialogOpen} 
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
          <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-semibold text-purple-900 mb-2">Assigned Persons (Day)</p>
                {currentDayAssignment ? (
                  <>
                    <div className="space-y-1">
                      {(() => {
                        const persons = currentDayAssignment.assigned_persons || [];
                        if (persons.length === 0) return <p className="text-slate-500 italic">None assigned</p>;
                        
                        // Handle both old and new formats
                        if (typeof persons[0] === 'string') {
                          return <p className="text-lg">{persons.join(', ')}</p>;
                        } else {
                          return persons.map((p, i) => {
                            const hours = Math.floor(p.available_minutes / 60);
                            const mins = p.available_minutes % 60;
                            return (
                              <p key={i} className="text-sm">
                                <span className="font-medium">{p.name}</span>: {p.available_minutes} min ({hours}h {mins}m)
                              </p>
                            );
                          });
                        }
                      })()}
                    </div>
                    {currentDayAssignment.notes && (
                      <p className="text-sm text-purple-700 mt-2">{currentDayAssignment.notes}</p>
                    )}
                    {assignedPersonsSummary && (
                      <p className="text-xs text-purple-800 font-semibold mt-2">
                        Total: {assignedPersonsSummary.totalAvailable} min ({Math.floor(assignedPersonsSummary.totalAvailable / 60)}h {assignedPersonsSummary.totalAvailable % 60}m)
                      </p>
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
          {dailySummary && (
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
                <p className="text-sm text-slate-600">Grand Total (Scheduled)</p>
                <p className="text-xl font-bold text-blue-700">{dailySummary.grandTotal.toFixed(2)} min</p>
                {assignedPersonsSummary && (
                  <p className="text-xs text-slate-600 mt-1">
                    Team Available: {assignedPersonsSummary.totalAvailable} min
                    {assignedPersonsSummary.totalAvailable > 0 && (
                      <span className={`ml-2 font-semibold ${
                        dailySummary.grandTotal > assignedPersonsSummary.totalAvailable ? 'text-red-600' : 'text-green-600'
                      }`}>
                        ({((dailySummary.grandTotal / assignedPersonsSummary.totalAvailable) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-sm">Target Type</Label>
                {tgtTimeMetric && (
                  <p className="text-xs text-slate-500 mb-1">
                    Saved TGT_TIME: <span className="font-semibold text-orange-700">{Number(tgtTimeMetric.value).toFixed(2)} min</span>
                  </p>
                )}
                <Select value={selectedTargetType} onValueChange={setSelectedTargetType}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Compare" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {targetTypes.map(tt => (
                      <SelectItem key={tt} value={tt}>{tt}</SelectItem>
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
              filteredLines.filter(l => l.date === selectedDate).map(line => (
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
        </>
      )}

      {/* Dialogs - extracted to ScheduledDataDialogs */}
      <AddDialog open={showAddDialog} onOpenChange={setShowAddDialog} formData={formData} setFormData={setFormData} profiles={profiles} qcTypes={qcTypes} qcLevels={qcLevels} itemCodes={itemCodes} onAdd={handleAdd} isPending={createMutation.isPending} />
      <EditDialog open={showEditDialog} onOpenChange={setShowEditDialog} editingRecord={editingRecord} setEditingRecord={setEditingRecord} onSave={handleUpdateRecord} />
      <DetailsDialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog} selectedRecord={selectedRecord} details={selectedRecord ? getRecordDetails(selectedRecord) : null} />
      <SaveTemplateDialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog} templateName={templateName} setTemplateName={setTemplateName} selectedDate={selectedDate} onSave={handleSaveTemplate} />
      <LoadTemplateDialog open={showLoadTemplateDialog} onOpenChange={setShowLoadTemplateDialog} loadToDate={loadToDate} setLoadToDate={setLoadToDate} templates={templates} onLoad={handleLoadTemplate} />
      <AssignPersonsDialog open={showAssignPersonsDialog} onOpenChange={setShowAssignPersonsDialog} selectedDate={selectedDate} dayPersons={dayPersons} setDayPersons={setDayPersons} dayNotes={dayNotes} setDayNotes={setDayNotes} newPersonName={newPersonName} setNewPersonName={setNewPersonName} newPersonMinutes={newPersonMinutes} setNewPersonMinutes={setNewPersonMinutes} persons={persons} onSave={handleSaveDayAssignments} currentDayAssignment={currentDayAssignment} />

      {/* Edit Day Source Bundle Dialog */}
      <Dialog open={editingDaySourceBundle} onOpenChange={setEditingDaySourceBundle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Source Bundle for {selectedDate}</DialogTitle>
            <DialogDescription>
              Changing the source bundle will recalculate all scheduled data times for this day based on the new bundle's DATA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Source Bundle for {selectedDate}</Label>
              {dataLinesLoading ? (
                <div className="flex items-center h-10 px-3 border border-input rounded-md bg-slate-50">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500 mr-2" />
                  <span className="text-sm text-slate-500">Loading versions...</span>
                </div>
              ) : (
                <Select value={tempSourceBundleId} onValueChange={setTempSourceBundleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bundle" />
                  </SelectTrigger>
                  <SelectContent>
                    {allBundles.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">No bundles found for {selectedDepartment}</div>
                    ) : (
                      allBundles.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {selectedDepartment} – v{b.version || '?'} ({b.status})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              {tempSourceBundleId && (() => {
                const bundle = allBundles.find(b => String(b.id) === String(tempSourceBundleId));
                return bundle ? (
                  <p className="text-sm text-slate-600 mt-2">
                    <span className="font-semibold">v{bundle.version || '?'} - {bundle.name} ({bundle.status})</span>
                  </p>
                ) : (
                  <p className="text-sm text-red-600 mt-2">
                    ❌ Bundle not found (id: {tempSourceBundleId})
                  </p>
                );
              })()}
            </div>
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                If any item codes don't exist in the new bundle's DATA, the save will be blocked.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDaySourceBundle(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                // Get all scheduled lines for this day
                const dayLines = lines.filter(l => l.date === selectedDate);
                
                // Fetch new bundle's DATA
                const newBundleData = await base44.entities.StdSetLines.filter({ bundle_id: tempSourceBundleId });
                const newBundleQCData = await base44.entities.QCSetLines.filter({ bundle_id: tempSourceBundleId });
                const validItemCodes = new Set(newBundleData.map(l => l.item_code));
                
                // Validate all item codes exist
                const missingItems = dayLines.filter(l => !validItemCodes.has(l.item_code));
                if (missingItems.length > 0) {
                  toast.error(`Cannot change bundle: Items not found in new bundle: ${missingItems.map(l => l.item_code).join(', ')}`);
                  return;
                }
                
                // Build new calculation maps
                const newItemOperationMap = buildItemOperationMap(newBundleData);
                
                // Update or create day header
                if (currentDayHeader) {
                  await base44.entities.ScheduledDayHeader.update(currentDayHeader.id, {
                    source_bundle_id: tempSourceBundleId
                  });
                } else {
                  await base44.entities.ScheduledDayHeader.create({
                    department_id: selectedDepartment,
                    date: selectedDate,
                    source_bundle_id: tempSourceBundleId,
                    assigned_persons: []
                  });
                }
                
                // Recalculate and update all lines
                for (const line of dayLines) {
                  // Recalculate with new bundle data
                  const profile = allProfiles.find(p => p.id === line.operation_profile_id);
                  const ops_per_piece_min = computeOpsPerPiece(line.item_code, profile, operations, newItemOperationMap, false);
                  const ops_total_min = ops_per_piece_min * line.ops_qty;
                  
                  // Recalculate QC
                  let qc_per_piece_min = 0;
                  let qc_total_min = 0;
                  
                  if (line.qc_type && line.qc_level && line.qc_qty > 0) {
                    const canonicalOpKey = (name) => {
                      if (!name) return '';
                      return name.toString().trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
                    };
                    
                    const allowedOpsCanonical = profile?.operations_required
                      ?.map(opId => operations.find(o => o.id === opId)?.name)
                      .filter(Boolean)
                      .map(canonicalOpKey) || [];
                    
                    const qcRules = newBundleQCData.filter(qc => 
                      qc.item_code === line.item_code && 
                      qc.qc_type === line.qc_type && 
                      qc.qc_level === line.qc_level &&
                      allowedOpsCanonical.includes(canonicalOpKey(qc.operation))
                    );
                    
                    for (const qc of qcRules) {
                      const baseLine = newBundleData.find(l => 
                        l.item_code === line.item_code && 
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
                    
                    qc_total_min = qc_per_piece_min * line.qc_qty;
                  }
                  
                  const grand_total_min = ops_total_min + qc_total_min;
                  
                  // Update line
                  await base44.entities.ScheduledData.update(line.id, {
                    ops_per_piece_min,
                    ops_total_min,
                    qc_per_piece_min,
                    qc_total_min,
                    grand_total_min
                  });
                }
                
                queryClient.invalidateQueries({ queryKey: ['ScheduledData'] });
                queryClient.invalidateQueries({ queryKey: ['ScheduledDayHeader'] });
                setEditingDaySourceBundle(false);
                toast.success('Source bundle updated and all times recalculated');
              } catch (error) {
                toast.error('Failed to update: ' + error.message);
              }
            }}>
              Update & Recalculate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}