import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { calculateMetrics } from "@/functions/calculateMetrics";

export default function DailyMetricsTab({ selDate, departments }) {
  const [calculating, setCalculating] = useState(false);
  const [lastCalcDate, setLastCalcDate] = useState(null);

  const { data: allBatches = [] } = useQuery({
    queryKey: ["BatchHeader-All"],
    queryFn: () => base44.entities.BatchHeader.list(),
    staleTime: 0
  });

  const { data: metricDefs = [] } = useQuery({
    queryKey: ["MetricDefinition-All"],
    queryFn: () => base44.entities.MetricDefinition.list(),
    staleTime: Infinity
  });

  const { data: metricValues = [], refetch: refetchMetrics, isFetching } = useQuery({
    queryKey: ["DailyMetricValue", selDate],
    queryFn: () => base44.entities.DailyMetricValue.filter({ date: selDate }),
    enabled: !!selDate,
    staleTime: 0
  });

  const dateBatches = useMemo(() => {
    if (!selDate) return [];
    return allBatches.filter(b => b.date === selDate);
  }, [allBatches, selDate]);

  const metricsByDept = useMemo(() => {
    const grouped = {};
    for (const mv of metricValues) {
      if (!grouped[mv.department]) grouped[mv.department] = {};
      grouped[mv.department][mv.metric_code] = mv.value;
    }
    return grouped;
  }, [metricValues]);

  const getMetricName = (code) => {
    const def = metricDefs.find(d => d.metric_code === code);
    return def?.metric_name || code;
  };

  const handleCalculateAll = async () => {
    if (!selDate) { toast.error("Επέλεξε ημερομηνία πρώτα."); return; }
    if (dateBatches.length === 0) { toast.error("Δεν υπάρχουν batches για αυτή την ημερομηνία."); return; }

    setCalculating(true);
    let success = 0;
    let failed = 0;

    for (const batch of dateBatches) {
      try {
        await calculateMetrics({
          date: batch.date,
          department: batch.department,
          batch_header_id: batch.id,
          bundle_id: batch.bundle_id
        });
        success++;
      } catch (err) {
        console.error(`Failed for ${batch.department}:`, err);
        failed++;
      }
    }

    setCalculating(false);
    setLastCalcDate(new Date().toLocaleTimeString("el-GR"));
    await refetchMetrics();

    if (failed === 0) {
      toast.success(`Υπολογίστηκαν metrics για ${success} τμήμα(τα).`);
    } else {
      toast.warning(`${success} επιτυχία, ${failed} αποτυχία.`);
    }
  };

  const KEY_METRICS = [
    { code: "GT_TIME",      label: "Gross Team Time (min)" },
    { code: "OD_TIME",      label: "Other Dept Time (min)" },
    { code: "HELP_TIME",    label: "Help In Time (min)" },
    { code: "NAT_TIME",     label: "Net Avail Time (min)" },
    { code: "SUP_TIME",     label: "Support Time (min)" },
    { code: "NON_EXEC_TIME",label: "Non-Exec Time (min)" },
    { code: "OP_TIME",      label: "Op Time (min)" },
    { code: "SBP_TIME",     label: "Std Proc Time (min)" },
  ];

  const formatValue = (val) => {
    if (val === undefined || val === null) return "—";
    const num = parseFloat(val);
    if (isNaN(num)) return "—";
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(1);
  };

  const deptOrder = ["Pre-paint", "Paint", "Sub-assembly", "Assembly", "Refurbishment", "Delivery"];
  const sortedDepts = Object.keys(metricsByDept).sort((a, b) => {
    const ai = deptOrder.indexOf(a);
    const bi = deptOrder.indexOf(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Daily Metrics</h3>
          {selDate && <p className="text-xs text-slate-500 mt-0.5">{selDate}</p>}
        </div>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
          onClick={handleCalculateAll}
          disabled={calculating || !selDate || dateBatches.length === 0}
        >
          {calculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {calculating ? "Υπολογισμός..." : "Υπολόγισε Metrics"}
        </Button>
      </div>

      {dateBatches.length === 0 && selDate && (
        <div className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          Δεν υπάρχουν batches για {selDate}
        </div>
      )}

      {lastCalcDate && <p className="text-xs text-green-600">✓ Τελευταίος υπολογισμός: {lastCalcDate}</p>}

      {isFetching && !calculating && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        </div>
      )}

      {sortedDepts.length === 0 && !isFetching && selDate && dateBatches.length > 0 && (
        <div className="text-center py-8 text-sm text-slate-400">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Πάτα "Υπολόγισε Metrics" για να δεις τα αποτελέσματα.
        </div>
      )}

      {sortedDepts.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-3 py-2 font-semibold w-40">Metric</th>
                {sortedDepts.map(dept => (
                  <th key={dept} className="text-center px-3 py-2 font-semibold whitespace-nowrap">{dept}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KEY_METRICS.map(({ code, label }, idx) => (
                <tr key={code} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-3 py-2 text-slate-600 font-medium whitespace-nowrap">{label}</td>
                  {sortedDepts.map(dept => {
                    const val = metricsByDept[dept]?.[code];
                    const hasValue = val !== undefined && val !== null && !isNaN(parseFloat(val));
                    return (
                      <td key={dept} className="px-3 py-2 text-center tabular-nums">
                        <span className={hasValue ? "text-slate-900 font-semibold" : "text-slate-300"}>
                          {formatValue(val)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}