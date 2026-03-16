import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronRight, Layers, Zap, Target, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  eachDayOfInterval,
  addDays, addWeeks, addMonths,
  subDays, subWeeks, subMonths,
  parseISO
} from "date-fns";

export default function MfgDailyStandardsAssignment() {
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date());



  // Inline editing state
  const [inlineEditKey, setInlineEditKey] = useState(null); // "date|dept"
  const [inlineEditBundleId, setInlineEditBundleId] = useState("");
  const [inlineEditTargetType, setInlineEditTargetType] = useState("");
  const [isInlineSaving, setIsInlineSaving] = useState(false);

  // Bulk assignment state
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bulkEndDate, setBulkEndDate] = useState(format(addDays(new Date(), 6), "yyyy-MM-dd"));
  const [bulkSelections, setBulkSelections] = useState({}); // { dept_name: bundle_id }
  const [bulkDeptEnabled, setBulkDeptEnabled] = useState({}); // { dept_name: bool }
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Target assignment state
  const [targetDialog, setTargetDialog] = useState(false);
  const [targetDate, setTargetDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [targetDept, setTargetDept] = useState("");
  const [targetBundleId, setTargetBundleId] = useState("");
  const [isSavingTargets, setIsSavingTargets] = useState(false);

  // Bulk target assignment state
  const [bulkTargetDialog, setBulkTargetDialog] = useState(false);
  const [bulkTargetStartDate, setBulkTargetStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bulkTargetEndDate, setBulkTargetEndDate] = useState(format(addDays(new Date(), 6), "yyyy-MM-dd"));
  const [bulkTargetSelections, setBulkTargetSelections] = useState({}); // { dept_name: bundle_id }
  const [bulkTargetTypeSelections, setBulkTargetTypeSelections] = useState({}); // { dept_name: target_type }
  const [bulkTargetDeptEnabled, setBulkTargetDeptEnabled] = useState({}); // { dept_name: bool }
  const [isSavingBulkTargets, setIsSavingBulkTargets] = useState(false);

  // Conflict confirmation state
  const [conflictDialog, setConflictDialog] = useState(false);
  const [conflictDates, setConflictDates] = useState([]); // list of "date - dept" strings with existing targets
  const [pendingBulkPayload, setPendingBulkPayload] = useState(null); // store the validated payload to run after confirm

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["Department"],
    queryFn: () => base44.entities.Department.filter({ is_active: true }),
    staleTime: Infinity
  });

  // Fetch all bundles
  const { data: allBundles = [] } = useQuery({
    queryKey: ["StandardsBundle-All"],
    queryFn: () => base44.entities.StandardsBundle.list(),
    staleTime: 0
  });

  // Fetch all assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ["DailyStandardsAssignment"],
    queryFn: () => base44.entities.DailyStandardsAssignment.list(),
    staleTime: 0
  });

  // Fetch daily target lines for target dialog
  const { data: allDailyTargetLines = [] } = useQuery({
    queryKey: ["DailyTargetLines"],
    queryFn: () => base44.entities.DailyTargetLines.list(),
    staleTime: 0
  });



  // Compute visible days based on view mode
  const visibleDays = useMemo(() => {
    if (viewMode === "day") {
      return [currentDate];
    } else if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    }
  }, [viewMode, currentDate]);

  // Build lookup: "date|department_id" => assignment
  const assignmentMap = useMemo(() => {
    const map = {};
    assignments.forEach(a => {
      map[`${a.assignment_date}|${a.department_id}`] = a;
    });
    return map;
  }, [assignments]);

  // Bundle lookup by id
  const bundleById = useMemo(() => {
    const map = {};
    allBundles.forEach(b => { map[b.id] = b; });
    return map;
  }, [allBundles]);



  const navigate_period = (dir) => {
    if (viewMode === "day") setCurrentDate(prev => dir > 0 ? addDays(prev, 1) : subDays(prev, 1));
    else if (viewMode === "week") setCurrentDate(prev => dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    else setCurrentDate(prev => dir > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const periodLabel = useMemo(() => {
    if (viewMode === "day") return format(currentDate, "dd MMM yyyy");
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "dd MMM")} – ${format(end, "dd MMM yyyy")}`;
    }
    return format(currentDate, "MMMM yyyy");
  }, [viewMode, currentDate]);

  const openInlineEdit = (date, department_id) => {
    const key = `${date}|${department_id}`;
    const existing = assignmentMap[key];
    setInlineEditKey(key);
    setInlineEditBundleId(existing?.standards_bundle_id || "");
    setInlineEditTargetType(existing?.target_type || "");
  };

  const closeInlineEdit = () => {
    setInlineEditKey(null);
    setInlineEditBundleId("");
    setInlineEditTargetType("");
  };

  const handleInlineSave = async (date, department_id, bundleId, targetType) => {
    if (!bundleId) { toast.error("Please select a bundle"); return; }
    if (!targetType) { toast.error("Please select a target type"); return; }
    setIsInlineSaving(true);
    try {
      const key = `${date}|${department_id}`;
      const existing = assignmentMap[key];
      const updateData = {
        standards_bundle_id: bundleId,
        target_type: targetType
      };
      if (existing) {
        await base44.entities.DailyStandardsAssignment.update(existing.id, updateData);
      } else {
        await base44.entities.DailyStandardsAssignment.create({
          assignment_date: date,
          department_id,
          ...updateData
        });
      }
      queryClient.invalidateQueries(["DailyStandardsAssignment"]);
      toast.success("Assignment saved");
      closeInlineEdit();
    } catch (e) {
      toast.error("Error saving assignment");
    } finally {
      setIsInlineSaving(false);
    }
  };



  // Bulk save handler
  const handleBulkSave = async () => {
    if (!bulkStartDate || !bulkEndDate) { toast.error("Select start and end dates"); return; }
    const enabledDepts = Object.entries(bulkDeptEnabled).filter(([, v]) => v).map(([k]) => k);
    if (enabledDepts.length === 0) { toast.error("Select at least one department"); return; }

    const start = parseISO(bulkStartDate);
    const end = parseISO(bulkEndDate);
    const days = eachDayOfInterval({ start, end });

    setIsBulkSaving(true);
    try {
      for (const dept of enabledDepts) {
        const bundleId = bulkSelections[dept];
        if (!bundleId) continue;
        for (const day of days) {
          const dateStr = format(day, "yyyy-MM-dd");
          const key = `${dateStr}|${dept}`;
          const existing = assignmentMap[key];
          if (existing) {
            await base44.entities.DailyStandardsAssignment.update(existing.id, { standards_bundle_id: bundleId });
          } else {
            await base44.entities.DailyStandardsAssignment.create({
              assignment_date: dateStr,
              department_id: dept,
              standards_bundle_id: bundleId
            });
          }
        }
      }
      queryClient.invalidateQueries(["DailyStandardsAssignment"]);
      toast.success("Bulk assignment saved");
      setBulkDialog(false);
    } catch (e) {
      toast.error("Error saving bulk assignment");
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Target lines for the selected bundle in target dialog
  const targetLinesForBundle = useMemo(() => {
    if (!targetBundleId) return [];
    return allDailyTargetLines.filter(l => l.bundle_id === targetBundleId);
  }, [targetBundleId, allDailyTargetLines]);

  // Helper: save TGT_TIME metric for a date+dept
  const saveTGTTimeMetric = async (date, dept, bundleId, targetLines) => {
    const total = targetLines.reduce((s, t) => s + (t.target_time_min || t.item_total_min || 0), 0);
    const existing = await base44.entities.DailyMetricValue.filter({ metric_code: 'TGT_TIME', date, department: dept });
    if (existing.length > 0) {
      await base44.entities.DailyMetricValue.update(existing[0].id, { value: total });
    } else {
      await base44.entities.DailyMetricValue.create({ metric_code: 'TGT_TIME', date, department: dept, bundle_id: bundleId, value: total, calculated_at: new Date().toISOString() });
    }
    queryClient.invalidateQueries(["DailyMetricValue"]);
  };

  // Save targets handler
  const handleSaveTargets = async () => {
    if (!targetDate || !targetDept || !targetBundleId) { toast.error("Fill all fields"); return; }
    if (targetLinesForBundle.length === 0) { toast.error("No target lines found for this bundle"); return; }

    setIsSavingTargets(true);
    try {
      // Delete existing targets for this date+dept
      const existing = await base44.entities.TargetDaily.filter({ date: targetDate, department: targetDept });
      for (const t of existing) {
        await base44.entities.TargetDaily.delete(t.id);
      }
      // Create new ones from DailyTargetLines
      const toCreate = targetLinesForBundle.map(l => ({
        bundle_id: targetBundleId,
        date: targetDate,
        department: targetDept,
        item_code: l.item_code,
        target_profile: l.target_type,
        operation_profile: l.operation_profile_id,
        target_qty: l.target_qty,
        profile_time_min_pc: l.per_piece_total_min,
        target_time_min: l.item_total_min
      }));
      await base44.entities.TargetDaily.bulkCreate(toCreate);
      // Update TGT_TIME metric
      await saveTGTTimeMetric(targetDate, targetDept, targetBundleId, toCreate);
      // Update DailyStandardsAssignment
      const assignmentKey = `${targetDate}|${targetDept}`;
      const existingAssignment = assignmentMap[assignmentKey];
      const targetType = targetLinesForBundle[0]?.target_type || "";
      if (existingAssignment) {
        await base44.entities.DailyStandardsAssignment.update(existingAssignment.id, {
          standards_bundle_id: targetBundleId,
          target_type: targetType
        });
      } else {
        await base44.entities.DailyStandardsAssignment.create({
          assignment_date: targetDate,
          department_id: targetDept,
          standards_bundle_id: targetBundleId,
          target_type: targetType
        });
      }
      queryClient.invalidateQueries(["TargetDaily"]);
      queryClient.invalidateQueries(["DailyStandardsAssignment"]);
      toast.success(`${toCreate.length} target lines saved for ${targetDate}`);
      setTargetDialog(false);
    } catch (e) {
      toast.error("Error saving targets");
    } finally {
      setIsSavingTargets(false);
    }
  };

  const bundlesForTargetDept = useMemo(() => {
    if (!targetDept) return [];
    return allBundles.filter(b => b.department === targetDept);
  }, [allBundles, targetDept]);

  // Bulk target save handler - first checks for conflicts
  const handleBulkSaveTargets = async () => {
    if (!bulkTargetStartDate || !bulkTargetEndDate) { toast.error("Select start and end dates"); return; }
    const enabledDepts = Object.entries(bulkTargetDeptEnabled).filter(([, v]) => v).map(([k]) => k);
    if (enabledDepts.length === 0) { toast.error("Select at least one department"); return; }
    const deptsMissingBundle = enabledDepts.filter(d => !bulkTargetSelections[d]);
    if (deptsMissingBundle.length > 0) { toast.error("Select bundle for all enabled departments"); return; }
    const deptsMissingTargetType = enabledDepts.filter(d => !bulkTargetTypeSelections[d]);
    if (deptsMissingTargetType.length > 0) { toast.error("Select Target Type for all enabled departments"); return; }

    // Validate target lines exist for all depts
    for (const deptName of enabledDepts) {
      const bundleId = bulkTargetSelections[deptName];
      const targetType = bulkTargetTypeSelections[deptName];
      const lines = allDailyTargetLines.filter(l => l.bundle_id === bundleId && l.target_type === targetType);
      if (lines.length === 0) {
        toast.error(`No target lines found for bundle/target type in ${deptName}`);
        return;
      }
    }

    const start = parseISO(bulkTargetStartDate);
    const end = parseISO(bulkTargetEndDate);
    const days = eachDayOfInterval({ start, end });

    const payload = { enabledDepts, days };
    await executeBulkSaveTargets(payload);
  };

  // The actual execution after conflict confirmation
  const executeBulkSaveTargets = async (payload) => {
    const { enabledDepts, days } = payload;
    setConflictDialog(false);
    setIsSavingBulkTargets(true);
    try {
      for (const deptName of enabledDepts) {
        const bundleId = bulkTargetSelections[deptName];
        const targetType = bulkTargetTypeSelections[deptName];
        const targetLines = allDailyTargetLines.filter(l => l.bundle_id === bundleId && l.target_type === targetType);

        for (const day of days) {
          const dateStr = format(day, "yyyy-MM-dd");

          // Delete existing targets
          const existing = await base44.entities.TargetDaily.filter({ date: dateStr, department: deptName });
          for (const t of existing) {
            await base44.entities.TargetDaily.delete(t.id);
          }

          // Create new targets
          const toCreate = targetLines.map(l => ({
            bundle_id: bundleId,
            date: dateStr,
            department: deptName,
            item_code: l.item_code,
            target_profile: l.target_type,
            operation_profile: l.operation_profile_id,
            target_qty: l.target_qty,
            profile_time_min_pc: l.per_piece_total_min,
            target_time_min: l.item_total_min
          }));
          if (toCreate.length > 0) {
            await base44.entities.TargetDaily.bulkCreate(toCreate);
          }

          // Update TGT_TIME metric
          await saveTGTTimeMetric(dateStr, deptName, bundleId, toCreate);

          // Update DailyStandardsAssignment with bundle and target_type
          const assignmentKey = `${dateStr}|${deptName}`;
          const existingAssignment = assignmentMap[assignmentKey];
          if (existingAssignment) {
            await base44.entities.DailyStandardsAssignment.update(existingAssignment.id, { standards_bundle_id: bundleId, target_type: targetType });
          } else {
            await base44.entities.DailyStandardsAssignment.create({
              assignment_date: dateStr,
              department_id: deptName,
              standards_bundle_id: bundleId,
              target_type: targetType
            });
          }
        }
      }
      queryClient.invalidateQueries(["TargetDaily"]);
      queryClient.invalidateQueries(["DailyStandardsAssignment"]);
      queryClient.invalidateQueries(["DailyMetricValue"]);
      toast.success("Bulk targets saved successfully");
      setBulkTargetDialog(false);
      setBulkTargetSelections({});
      setBulkTargetTypeSelections({});
      setBulkTargetDeptEnabled({});
      setPendingBulkPayload(null);
    } catch (e) {
      toast.error("Error saving bulk targets: " + e.message);
    } finally {
      setIsSavingBulkTargets(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-full mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Layers className="w-6 h-6 text-indigo-600" />
                  Daily Standards Assignment
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  View and manage which Standards Bundle is active per department per day.
                  Changes here are the only way to override the bundle for a given date.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setBulkTargetDialog(true)} className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
                    <Target className="w-4 h-4" />
                    Set Daily Targets
                  </Button>
                <Button onClick={() => setBulkDialog(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Zap className="w-4 h-4" />
                  Bulk Assign
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Period Toggle */}
              <div className="flex rounded-lg border overflow-hidden">
                {["day", "week", "month"].map(m => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      viewMode === m ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigate_period(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-semibold text-slate-700 min-w-[200px] text-center">{periodLabel}</span>
                <Button variant="outline" size="icon" onClick={() => navigate_period(1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold text-slate-700 min-w-[160px] sticky left-0 bg-slate-50 z-10">
                      Department
                    </TableHead>
                    {visibleDays.map(day => (
                      <TableHead key={day.toISOString()} className="text-center font-semibold text-slate-700 min-w-[140px]">
                        <div>{format(day, "EEE")}</div>
                        <div className="text-xs font-normal text-slate-500">{format(day, "dd MMM")}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map(dept => (
                    <TableRow key={dept.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-800 sticky left-0 bg-white z-10 border-r">
                        {dept.name}
                      </TableCell>
                      {visibleDays.map(day => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const key = `${dateStr}|${dept.name}`;
                        const assignment = assignmentMap[key];
                        const bundle = assignment ? bundleById[assignment.standards_bundle_id] : null;
                        const isEditing = inlineEditKey === key;
                        const deptBundles = allBundles.filter(b => b.department === dept.name);
                        const targetTypesForBundle = inlineEditBundleId 
                          ? [...new Set(allDailyTargetLines.filter(l => l.bundle_id === inlineEditBundleId).map(l => l.target_type))]
                          : [];

                        return (
                          <TableCell key={dateStr} className="text-center p-2">
                            {isEditing ? (
                              <div className="flex flex-col gap-2 items-center">
                                <Select value={inlineEditBundleId} onValueChange={v => { setInlineEditBundleId(v); setInlineEditTargetType(""); }}>
                                  <SelectTrigger className="h-7 text-xs min-w-[120px]">
                                    <SelectValue placeholder="Bundle..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {deptBundles.map(b => (
                                      <SelectItem key={b.id} value={b.id}>
                                        v{b.version_no}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {inlineEditBundleId && (
                                  <Select value={inlineEditTargetType} onValueChange={setInlineEditTargetType}>
                                    <SelectTrigger className="h-7 text-xs min-w-[120px]">
                                      <SelectValue placeholder="Type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {targetTypesForBundle.map(t => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                                <div className="flex gap-1 justify-center">
                                  <Button
                                    size="sm"
                                    className="h-5 px-2 text-xs"
                                    onClick={() => handleInlineSave(dateStr, dept.name, inlineEditBundleId, inlineEditTargetType)}
                                    disabled={isInlineSaving}
                                  >
                                    {isInlineSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-5 px-2 text-xs"
                                    onClick={closeInlineEdit}
                                    disabled={isInlineSaving}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                {bundle ? (
                                  <>
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${
                                        bundle.status === "ACTIVE"
                                          ? "bg-green-50 text-green-700 border-green-200"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                      }`}
                                    >
                                      v{bundle.version_no}
                                    </Badge>
                                    {assignment?.target_type && (
                                      <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        {assignment.target_type}
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-indigo-600"
                                  onClick={() => openInlineEdit(dateStr, dept.name)}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" />
                ACTIVE bundle
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />
                Other status bundle
              </span>
              <span className="flex items-center gap-1 text-slate-400">— = No assignment (will use department's ACTIVE bundle)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600" />
              Bulk Standards Assignment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={bulkStartDate} onChange={e => setBulkStartDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={bulkEndDate} onChange={e => setBulkEndDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Departments & Bundles</Label>
              <div className="border rounded-lg divide-y max-h-[320px] overflow-y-auto">
                {departments.map(dept => {
                  const enabled = !!bulkDeptEnabled[dept.name];
                  const deptBundles = allBundles.filter(b => b.department === dept.name);
                  return (
                    <div key={dept.id} className={`p-3 flex items-center gap-3 ${enabled ? "bg-indigo-50" : "bg-white"}`}>
                      <Checkbox
                        checked={enabled}
                        onCheckedChange={v => setBulkDeptEnabled(prev => ({ ...prev, [dept.name]: !!v }))}
                      />
                      <span className="font-medium text-sm w-32 flex-shrink-0">{dept.name}</span>
                      <Select
                        value={bulkSelections[dept.name] || ""}
                        onValueChange={v => setBulkSelections(prev => ({ ...prev, [dept.name]: v }))}
                        disabled={!enabled}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select bundle..." />
                        </SelectTrigger>
                        <SelectContent>
                          {deptBundles.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              v{b.version_no} ({b.status})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              This will assign the selected bundle to every day in the date range for each checked department (overwriting existing assignments).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkSave} disabled={isBulkSaving} className="bg-indigo-600 hover:bg-indigo-700">
              {isBulkSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Bulk Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Set Daily Targets Dialog */}
       <Dialog open={bulkTargetDialog} onOpenChange={setBulkTargetDialog}>
         <DialogContent className="sm:max-w-[600px]">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <Target className="w-4 h-4 text-amber-600" />
               Bulk Set Daily Targets
             </DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-2">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label>Start Date</Label>
                 <Input type="date" value={bulkTargetStartDate} onChange={e => setBulkTargetStartDate(e.target.value)} className="mt-1" />
               </div>
               <div>
                 <Label>End Date</Label>
                 <Input type="date" value={bulkTargetEndDate} onChange={e => setBulkTargetEndDate(e.target.value)} className="mt-1" />
               </div>
             </div>
             <div>
               <Label className="mb-2 block">Departments & Target Bundles</Label>
               <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                 {departments.map(dept => {
                   const enabled = !!bulkTargetDeptEnabled[dept.name];
                   const deptBundles = allBundles.filter(b => b.department === dept.name);
                   const selectedBundleId = bulkTargetSelections[dept.name];
                   const targetTypesForBundle = selectedBundleId 
                     ? [...new Set(allDailyTargetLines.filter(l => l.bundle_id === selectedBundleId).map(l => l.target_type))]
                     : [];
                   return (
                     <div key={dept.id} className={`p-3 space-y-2 ${enabled ? "bg-amber-50" : "bg-white"}`}>
                       <div className="flex items-center gap-3">
                         <Checkbox
                           checked={enabled}
                           onCheckedChange={v => setBulkTargetDeptEnabled(prev => ({ ...prev, [dept.name]: !!v }))}
                         />
                         <span className="font-medium text-sm w-32 flex-shrink-0">{dept.name}</span>
                       </div>
                       <div className="flex gap-2 ml-6">
                         <Select
                           value={bulkTargetSelections[dept.name] || ""}
                           onValueChange={v => {
                             setBulkTargetSelections(prev => ({ ...prev, [dept.name]: v }));
                             setBulkTargetTypeSelections(prev => ({ ...prev, [dept.name]: "" }));
                           }}
                           disabled={!enabled}
                         >
                           <SelectTrigger className="flex-1">
                             <SelectValue placeholder="Select bundle..." />
                           </SelectTrigger>
                           <SelectContent>
                             {deptBundles.map(b => (
                               <SelectItem key={b.id} value={b.id}>
                                 v{b.version_no} ({b.status})
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                         {selectedBundleId && (
                           <Select
                             value={bulkTargetTypeSelections[dept.name] || ""}
                             onValueChange={v => setBulkTargetTypeSelections(prev => ({ ...prev, [dept.name]: v }))}
                             disabled={!enabled || targetTypesForBundle.length === 0}
                           >
                             <SelectTrigger className="flex-1">
                               <SelectValue placeholder="Select type..." />
                             </SelectTrigger>
                             <SelectContent>
                               {targetTypesForBundle.map(t => (
                                 <SelectItem key={t} value={t}>
                                   {t}
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         )}
                       </div>
                     </div>
                   );
                 })}
               </div>
               </div>

               {/* Preview target lines for each selected bundle & target type */}
               {Object.entries(bulkTargetSelections).filter(([dept, bundleId]) => bundleId && bulkTargetDeptEnabled[dept] && bulkTargetTypeSelections[dept]).map(([dept, bundleId]) => {
                 const targetType = bulkTargetTypeSelections[dept];
                 const targetLines = allDailyTargetLines.filter(l => l.bundle_id === bundleId && l.target_type === targetType);
                 return (
                   <div key={dept} className="border-t pt-3 mt-3">
                     <p className="text-xs font-semibold text-slate-700 mb-2">{dept} - {targetType} - Target Lines Preview</p>
                     {targetLines.length === 0 ? (
                       <p className="text-xs text-slate-400">No target lines for this bundle and type</p>
                     ) : (
                       <div className="border rounded-lg overflow-hidden max-h-[150px] overflow-y-auto">
                         <Table className="text-xs">
                           <TableHeader>
                             <TableRow className="bg-slate-50">
                               <TableHead className="text-xs">Item Code</TableHead>
                               <TableHead className="text-xs">Target Type</TableHead>
                               <TableHead className="text-right text-xs">Qty</TableHead>
                               <TableHead className="text-right text-xs">Time (min)</TableHead>
                             </TableRow>
                           </TableHeader>
                           <TableBody>
                             {targetLines.map(l => (
                               <TableRow key={l.id}>
                                 <TableCell className="text-xs">{l.item_code}</TableCell>
                                 <TableCell className="text-xs">{l.target_type}</TableCell>
                                 <TableCell className="text-right text-xs">{l.target_qty}</TableCell>
                                 <TableCell className="text-right text-xs">{l.item_total_min?.toFixed(1)}</TableCell>
                               </TableRow>
                             ))}
                           </TableBody>
                         </Table>
                       </div>
                     )}
                   </div>
                 );
               })}

               <p className="text-xs text-slate-500">
                 This will import and apply target lines from the selected bundles to every day in the date range for each checked department (overwriting existing targets).
               </p>
               </div>
               <DialogFooter>
               <Button variant="outline" onClick={() => setBulkTargetDialog(false)}>Cancel</Button>
               <Button onClick={handleBulkSaveTargets} disabled={isSavingBulkTargets} className="bg-amber-600 hover:bg-amber-700">
                 {isSavingBulkTargets ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Apply Targets"}
               </Button>
               </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Set Daily Targets Dialog (single date) */}
       <Dialog open={targetDialog} onOpenChange={setTargetDialog}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-600" />
              Set Daily Targets
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Department</Label>
                <Select value={targetDept} onValueChange={v => { setTargetDept(v); setTargetBundleId(""); }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {targetDept && (
              <div>
                <Label>Standards Bundle (source of target lines)</Label>
                <Select value={targetBundleId} onValueChange={setTargetBundleId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select bundle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bundlesForTargetDept.map(b => (
                      <SelectItem key={b.id} value={b.id}>v{b.version_no} ({b.status})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {targetBundleId && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Item Code</TableHead>
                      <TableHead>Target Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Time (min)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targetLinesForBundle.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-slate-400 py-4">No target lines in this bundle</TableCell></TableRow>
                    ) : targetLinesForBundle.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.item_code}</TableCell>
                        <TableCell>{l.target_type}</TableCell>
                        <TableCell className="text-right">{l.target_qty}</TableCell>
                        <TableCell className="text-right">{l.item_total_min?.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="text-xs text-slate-500">
              This will replace existing targets for the selected date & department with the lines from the chosen bundle.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTargetDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTargets} disabled={isSavingTargets || !targetBundleId} className="bg-amber-600 hover:bg-amber-700">
              {isSavingTargets ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Apply Targets"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Confirmation Dialog */}
      <Dialog open={conflictDialog} onOpenChange={setConflictDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              ⚠️ Existing Targets Found
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              The following dates already have targets recorded. Do you want to overwrite them?
            </p>
            <div className="border rounded-lg bg-amber-50 p-3 max-h-[220px] overflow-y-auto space-y-1">
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-amber-900 mb-2 border-b border-amber-200 pb-1">
                <span>Date — Dept</span>
                <span>Current Bundle</span>
                <span>Current Target Type</span>
              </div>
              {conflictDates.map((c, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 text-xs font-mono text-amber-800">
                  <span>{c.label}</span>
                  <span>{c.existingBundle}</span>
                  <span>{c.existingTargetType}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Clicking "Overwrite" will delete existing targets for these dates and replace them with the new ones.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConflictDialog(false); setPendingBulkPayload(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => executeBulkSaveTargets(pendingBulkPayload)}
              disabled={isSavingBulkTargets}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSavingBulkTargets ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Overwrite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}