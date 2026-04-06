# Bulk OCR Enhancement - Implementation Guide

## Overview
The bulk OCR system is now controllable, stoppable, and selective with detailed tracking and progress reporting.

---

## 1. Attachment-Level Missing OCR List

### Where it's built:
**File**: `components/manufacturing/daily/hooks/useBulkOCRControl.js`  
**Function**: `detectMissingOCR()`

```javascript
const { grouped, details } = detectMissingOCR(
  allBatchHeaders,
  allBatchAttachments,
  allOCRCacheRecords,
  filterDept,
  filterMonth
);
```

**Returns**:
- `details[]`: Attachment-level list
  ```javascript
  [
    {
      attachmentId: "att-123",
      fileName: "report.pdf",
      date: "2026-04-06",
      department: "Dept A",
      batchHeaderId: "batch-456",
      missingProduction: true,
      missingTeamsTime: false
    }
  ]
  ```

- `grouped[]`: Grouped by date + department
  ```javascript
  [
    {
      date: "2026-04-06",
      department: "Dept A",
      attachmentsWithoutOCRCount: 3
    }
  ]
  ```

---

## 2. Grouped Summary

### Mechanism:
The `detectMissingOCR()` function builds a grouped object by iterating attachments and using a key `${batch.date}__${batch.department}` to aggregate counts.

**Cache lookup strategy** (memory-efficient):
1. Build single-pass lookup: `cacheByAttId[att.id] = { production: bool, teams_time: bool }`
2. For each attachment, check if EITHER production OR teams_time is missing
3. Automatically group by date + department while iterating

**Result**: Both attachment-level detail AND grouped summary in a single pass (O(n)).

---

## 3. Stop Logic

### Implementation:
**File**: `components/manufacturing/daily/hooks/useBulkOCRControl.js`  
**Variable**: `bulkOcrStopRequestedRef` (persists across re-renders)

```javascript
const stopBulkOCR = useCallback(() => {
  bulkOcrStopRequestedRef.current = true;
  addMsg("bot", "⏹ Stopping bulk OCR... (current operations will finish)");
}, [addMsg]);
```

**Execution**: In `executeSelectedBulkOCR()`, before processing each batch:
```javascript
if (bulkOcrStopRequestedRef.current) {
  // Remaining items marked as "skipped"
  break;
}
```

**Behavior**:
- ✅ Stops scheduling new OCR jobs
- ❌ Does NOT kill running promises (graceful shutdown)
- ✅ Currently running items finish normally
- ✅ Remaining pending items marked as `skipped`
- ✅ UI updates immediately (no modal blocking)

---

## 4. Selective Execution

### Implementation:
**UI Component**: `components/manufacturing/daily/BulkOCRPanel.jsx`

**Selection Management**:
- `selectedAttachmentIds`: `Set<attachmentId>` (toggled per click)
- "Select All" button toggles entire set
- Clicking attachment row toggles its selection

**Execution**:
```javascript
const selected = missingOcrAttachmentDetails.filter(
  d => selectedAttachmentIds.has(d.attachmentId)
);
executeSelectedBulkOCR(selected);
```

**Validation**:
```javascript
if (selectedCount === 0) {
  onAddMsg("bot", "⚠️ No attachments selected. Select at least one.");
  return;
}
```

**UI Shows**:
- Checkbox per attachment
- Attachment details: fileName, date, department, missing form types
- "Select All" / "Deselect All" button
- Run button with count: "⚡ Run OCR (5 selected)"

---

## 5. Concurrency Limit (3 at a time)

### Mechanism:
**File**: `components/manufacturing/daily/hooks/useBulkOCRControl.js`  
**Function**: `executeSelectedBulkOCR()`

```javascript
const concurrency = 3;
for (let i = 0; i < attachmentsToProcess.length; i += concurrency) {
  const batch = attachmentsToProcess.slice(i, i + concurrency);
  const promises = batch.map(async (att) => {
    // OCR for this attachment
    await performOCRInBackground(att);
  });
  
  await Promise.allSettled(promises); // Wait for all 3 to finish
}
```

**Properties**:
- ✅ Non-blocking UI (state updates via setState)
- ✅ No modal dialogs opened automatically
- ✅ Reuses existing `performOCRInBackground()` logic (no duplication)
- ✅ Progress tracked per attachment (detailed results collected)

---

## 6. Detailed Results Tracking

### Structure:
```javascript
const result = {
  attachmentId: "att-123",
  fileName: "report.pdf",
  date: "2026-04-06",
  department: "Dept A",
  status: "pending | processing | completed | failed | skipped",
  error: "Optional error message if failed"
};
```

### Lifecycle:
1. **pending** → created on init (none currently use this)
2. **processing** → set before `performOCRInBackground()`
3. **completed** → after successful OCR
4. **failed** → on error (stores error message)
5. **skipped** → if stop signal received before processing

### Display:
- Progress bar: `${processed} / ${total}`
- Counters: ✅ completed | ❌ failed | ⏳ remaining
- Result list (after OCR completes):
  - Green: completed
  - Red: failed (shows error message)
  - Gray: skipped

---

## 7. Chat Messages

### Examples:

**Detection**:
```
✅ Found 12 attachments missing OCR.

📋 Grouped by date + department:
• 2026-04-06 | Dept A | 5
• 2026-04-05 | Dept B | 7
```

**During execution**:
```
⏳ Started bulk OCR for 12 attachments (3 concurrent)...
✅ report_01.pdf
❌ form_02.pdf — detectFormType failed
...
```

**On stop**:
```
⏹ Stopped bulk OCR. 5 completed, 2 failed, 5 skipped.
```

---

## 8. Usage Flow

### User Perspective:

1. **Detect missing OCR**:
   - Set filters (department, month)
   - Click "Find Missing OCR"
   - See attachment list with checkboxes

2. **Select attachments**:
   - Click individual rows to toggle
   - OR "Select All" / "Deselect All"

3. **Run OCR**:
   - Click "⚡ Run OCR (N selected)"
   - Watch progress bar in real-time
   - See "✅ Completed" and "❌ Failed" messages

4. **Stop (if needed)**:
   - Click "⏹ Stop OCR"
   - Current operations finish gracefully
   - Remaining items marked as skipped

---

## 9. Key Files

| File | Purpose |
|------|---------|
| `hooks/useBulkOCRControl.js` | Bulk OCR hook with detection, execution, and stop |
| `BulkOCRPanel.jsx` | UI component (filters, selection, buttons, results) |
| `DailyProductionChatbot.jsx` | Main chatbot (integration point) |
| `chatbot/BulkOCRExecutor.js` | Legacy bulk OCR runner (kept for reference) |

---

## 10. Performance Notes

- **Cache lookup**: O(n) single-pass build
- **Grouping**: O(n) inline during detection
- **Concurrency**: 3 at a time to avoid rate-limiting
- **Memory**: Minimal (attachment-level list + Set of IDs)
- **UI**: Non-blocking (all setState calls are async)
- **State persists**: Stop signal via `useRef` (survives re-renders)

---

## 11. Integration with Existing Code

- ✅ Reuses `performOCRInBackground()` (no duplication)
- ✅ Maintains existing single-OCR flow (unchanged)
- ✅ Preserves all modals (production form, teams time form)
- ✅ Extends `useQuery` for bulk data loads (all attachments, all cache records)
- ✅ Backward compatible (all existing features still work)