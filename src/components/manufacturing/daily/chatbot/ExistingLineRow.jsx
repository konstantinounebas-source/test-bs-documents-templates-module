import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2 } from "lucide-react";

export default function ExistingLineRow({ bl, onSave, onDelete }) {
  const [vals, setVals] = useState({
    qty_processed: bl.qty_processed ?? 0,
    qty_out_good:  bl.qty_out_good  ?? 0,
    qty_scrap:     bl.qty_scrap     ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // debounced save
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(async () => {
      setSaving(true);
      await onSave(bl.id, vals);
      setSaving(false);
      setDirty(false);
    }, 800);
    return () => clearTimeout(t);
  }, [vals, dirty]);

  const handleChange = (field, value) => {
    setVals(v => ({ ...v, [field]: parseFloat(value) || 0 }));
    setDirty(true);
  };

  return (
    <div className="grid gap-1 items-center px-1" style={{ gridTemplateColumns: "1fr auto auto auto auto auto" }}>
      <span className="text-[10px] font-medium text-slate-700 truncate" title={bl.item_code}>{bl.item_code}</span>
      {/* Scheduled - read only */}
      <div className="text-center">
        <span className="text-[10px] text-slate-400">{bl.scheduled_qty ?? 0}</span>
      </div>
      {/* Processed */}
      <input
        type="number" min="0"
        value={vals.qty_processed}
        onChange={e => handleChange("qty_processed", e.target.value)}
        className="text-[11px] border border-slate-200 rounded px-1 py-0.5 outline-none focus:border-blue-400 text-center w-full"
      />
      {/* Out Good */}
      <input
        type="number" min="0"
        value={vals.qty_out_good}
        onChange={e => handleChange("qty_out_good", e.target.value)}
        className="text-[11px] border border-slate-200 rounded px-1 py-0.5 outline-none focus:border-blue-400 text-center w-full"
      />
      {/* Scrap */}
      <div className="relative">
        <input
          type="number" min="0"
          value={vals.qty_scrap}
          onChange={e => handleChange("qty_scrap", e.target.value)}
          className="text-[11px] border border-slate-200 rounded px-1 py-0.5 outline-none focus:border-blue-400 text-center w-full"
        />
        {saving && <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-400 absolute -top-1 -right-1" />}
      </div>
    </div>
  );
}