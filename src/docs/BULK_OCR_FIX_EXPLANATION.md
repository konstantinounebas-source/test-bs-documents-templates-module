# Bulk OCR Error Tracking Fix

## Problem

Bulk OCR was reporting `completed` even when OCR actually failed with errors like `400 Bad Request`. The root causes were:

1. **Wrong object shape passed**: `executeSelectedBulkOCR` received lightweight "detail" objects with only `attachmentId`, `fileName`, `date`, `department` — but `performOCRInBackground` expects full attachment records with `id`, `file_url`, `file_name`, `batch_header_id`, `department`.

2. **Error not rethrown**: `performOCRInBackground` caught errors, logged/messaged them, but did NOT rethrow. So bulk OCR saw `await performOCRInBackground(att)` complete without error and marked it successful.

## Solution

### 1. **Fixed Object Mapping** (`DailyProductionChatbot` line ~1455)

When bulk OCR is triggered, map selected detail items to full attachment objects:

```js
onRunSelected={(selectedDetails) => {
  // Map selected detail items to full attachment objects from database
  const fullAttachments = selectedDetails
    .map(detail => allBatchAttachments.find(att => att.id === detail.attachmentId))
    .filter(Boolean); // Remove unfound entries
  executeSelectedBulkOCR(fullAttachments);
}}
```

**Why**: Full attachment objects contain all fields needed by `performOCRInBackground`:
- `id` (not `attachmentId`)
- `file_url` 
- `file_name` (not `fileName`)
- `batch_header_id`
- `department`

### 2. **Added Error Rethrow** (`performOCRInBackground`, line ~525)

In the catch block, after logging the error:

```js
} catch (err) {
  if (!isMountedRef.current) return;
  addMsg("bot", `❌ OCR αποτυχία: ${err?.message || "Network error"}`);
  setAttachmentOcrStatus(prev => { ... });
  // RETHROW so bulk OCR can catch and mark as failed
  throw err;
}
```

**Why**: Now when an OCR request fails (e.g., 400 error), the error propagates up to `executeSelectedBulkOCR`, which catches it and correctly marks the attachment as `failed`.

### 3. **Updated Bulk OCR Logic** (`useBulkOCRControl`, line ~82)

- Accepts `fullAttachments` (full database objects) instead of detail items
- References `att.id` and `att.file_name` (correct keys)
- Catches thrown errors → marks as failed
- Success is only set when `performOCRInBackground` completes WITHOUT throwing
- Final summary shows real counts: `✅ completed, ❌ failed`

## Result

**Before**:
```
❌ OCR αποτυχία: Request failed with status code 400
✅ filename.pdf
✅ Bulk OCR complete. 6 completed, 0 failed.
```
← Fake success despite error

**After**:
```
❌ OCR αποτυχία: Request failed with status code 400
❌ filename.pdf — Request failed with status code 400
✅ Bulk OCR complete. 5 ✅ completed, 1 ❌ failed.
```
← Accurate tracking

## Files Changed

1. **`components/manufacturing/daily/hooks/useBulkOCRControl`**: Updated `executeSelectedBulkOCR` to accept full attachments and handle errors correctly
2. **`components/manufacturing/daily/DailyProductionChatbot`**: 
   - Added error rethrow in `performOCRInBackground` catch block
   - Mapped selected detail items → full attachments before calling `executeSelectedBulkOCR`
3. **`components/manufacturing/daily/BulkOCRPanel`**: Added clarifying comment on object shape