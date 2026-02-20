import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Edit2, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState("week"); // "day" | "week" | "month"
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editDialog, setEditDialog] = useState(null); // { date, department_id, assignment? }
  const [selectedBundleId, setSelectedBundleId] = useState("");

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

  const openEdit = (date, department_id) => {
    const key = `${date}|${department_id}`;
    const existing = assignmentMap[key];
    // Pre-select the dept's active bundle or existing assignment
    const activeBundleForDept = allBundles.find(b => b.department === department_id && b.status === "ACTIVE");
    setSelectedBundleId(existing?.standards_bundle_id || activeBundleForDept?.id || "");
    setEditDialog({ date, department_id, assignment: existing || null });
  };

  const saveMutation = useMutation({
    mutationFn: async ({ date, department_id, assignment, bundleId }) => {
      if (assignment) {
        await base44.entities.DailyStandardsAssignment.update(assignment.id, {
          standards_bundle_id: bundleId
        });
      } else {
        await base44.entities.DailyStandardsAssignment.create({
          assignment_date: date,
          department_id,
          standards_bundle_id: bundleId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["DailyStandardsAssignment"]);
      toast.success("Assignment saved");
      setEditDialog(null);
    }
  });

  const handleSave = () => {
    if (!selectedBundleId) { toast.error("Please select a bundle"); return; }
    saveMutation.mutate({
      date: editDialog.date,
      department_id: editDialog.department_id,
      assignment: editDialog.assignment,
      bundleId: selectedBundleId
    });
  };

  // Bundles for the department in the edit dialog
  const bundlesForEditDept = useMemo(() => {
    if (!editDialog) return [];
    return allBundles.filter(b => b.department === editDialog.department_id);
  }, [allBundles, editDialog]);

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

                        return (
                          <TableCell key={dateStr} className="text-center p-2">
                            <div className="flex flex-col items-center gap-1">
                              {bundle ? (
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
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-slate-400 hover:text-indigo-600"
                                onClick={() => openEdit(dateStr, dept.name)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs text-slate-500">
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

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-indigo-600" />
              Assign Standards Bundle
            </DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Date:</span>
                  <p className="font-semibold">{editDialog.date}</p>
                </div>
                <div>
                  <span className="text-slate-500">Department:</span>
                  <p className="font-semibold">{editDialog.department_id}</p>
                </div>
              </div>
              <div>
                <Label>Standards Bundle</Label>
                <Select value={selectedBundleId} onValueChange={setSelectedBundleId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a bundle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bundlesForEditDept.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        v{b.version_no}
                        <span className={`ml-2 text-xs font-medium ${b.status === "ACTIVE" ? "text-green-600" : "text-amber-600"}`}>
                          ({b.status})
                        </span>
                      </SelectItem>
                    ))}
                    {bundlesForEditDept.length === 0 && (
                      <SelectItem value="_none" disabled>No bundles for this department</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {editDialog.assignment && (
                <p className="text-xs text-slate-500">
                  This will update the existing assignment for this date/department.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !selectedBundleId}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saveMutation.isPending ? "Saving..." : "Save Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}