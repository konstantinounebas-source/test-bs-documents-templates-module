import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";

export default function ItemCodeMultiSelect({ available = [], selected = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = available.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  const toggle = (code) => {
    if (selected.includes(code)) {
      onChange(selected.filter(c => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        className="w-full min-h-[30px] border border-slate-200 rounded px-2 py-1 bg-white cursor-pointer flex flex-wrap gap-1 items-center"
      >
        {selected.length === 0 ? (
          <span className="text-xs text-slate-400">-- Επέλεξε item code(s) --</span>
        ) : (
          selected.map(code => (
            <span key={code}
              className="flex items-center gap-0.5 bg-blue-100 text-blue-700 text-[10px] rounded px-1.5 py-0.5 font-medium">
              {code}
              <X className="w-2.5 h-2.5 cursor-pointer hover:text-blue-900"
                onClick={e => { e.stopPropagation(); toggle(code); }} />
            </span>
          ))
        )}
        <ChevronDown className={`w-3 h-3 text-slate-400 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 flex flex-col">
          <div className="p-1.5 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              placeholder="Αναζήτηση..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">Δεν βρέθηκαν αποτελέσματα</p>
            ) : (
              filtered.map(code => (
                <div key={code}
                  onClick={() => toggle(code)}
                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50 text-xs
                    ${selected.includes(code) ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"}`}>
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0
                    ${selected.includes(code) ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                    {selected.includes(code) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  {code}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}