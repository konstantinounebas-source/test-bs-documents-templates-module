# QA Checklist — DailyProductionChatbot
> Manual end-to-end test scenarios. Run in both **floating** and **split** layout unless noted.

---

## 1. File Upload Flow

**Scenario:** User uploads a valid file from the file_upload step.

**Steps:**
1. Open chatbot (floating: click Bot button / split: open page)
2. On the `file_upload` step, drag a valid PDF onto the drop zone
3. Observe the file card appear with department/date detection
4. Confirm department & date on the card
5. Click "Save to Batch"

**Expected:**
- File uploads without error
- AI parses filename and pre-fills department + date
- Bot message confirms file saved to batch
- Chatbot transitions to `attachments` step with the correct batch selected

---

## 2. Duplicate File Flow

**Scenario:** User uploads a file with the same name as an existing attachment.

**Steps:**
1. Navigate to `attachments` step with an existing batch that has attachments
2. Upload a file whose name matches an existing attachment

**Expected:**
- Duplicate confirmation dialog appears ("Αρχείο υπάρχει ήδη")
- Clicking "Ακύρωση" dismisses the dialog, no upload occurs
- Clicking "Ναι, ανέβασέ το" uploads the file and adds a second attachment with the same name
- Bot confirms the upload

---

## 3. Batch Auto-Create Flow

**Scenario:** User selects a department + date with no existing batch but a valid standards bundle.

**Steps:**
1. From `file_upload` step, click "Επίλεξε τμήμα"
2. Select a department
3. Select a date that has no existing batch for that department
4. Confirm batch creation if prompted

**Expected:**
- Bot shows "Δημιουργία batch…" message with spinner in chat
- Batch is created in DB
- If scheduled data exists → batch lines pre-populated, bot confirms
- If no scheduled data → bot warns and proceeds
- Step advances to `attachments`

---

## 4. Existing Batch Flow

**Scenario:** User selects a department + date that already has a batch.

**Steps:**
1. Select department
2. Select a date that has an existing batch

**Expected:**
- Bot message: "Βρέθηκε batch για [date] – [dept]"
- Bundle info shown if applicable
- No new batch created in DB
- Step jumps directly to `attachments`

---

## 5. Attachments Modal

**Scenario:** User opens the Attachments modal from a step after `attachments`.

**Steps:**
1. Navigate past `attachments` to any of: `batch_lines_review`, `batch_lines_add`, `qc`, etc.
2. Click the "Attachments" button (top-right of step panel)

**Expected:**
- Dialog opens showing current batch's attachments
- Drop zone is functional (can upload new files)
- Each attachment shows Preview / Download / Delete / OCR buttons
- Delete removes the attachment (confirmation not needed, instant)
- OCR button triggers OCR flow (see #6)
- Dialog closes cleanly without losing wizard state

---

## 6. OCR Production-Only Flow

**Scenario:** File contains only a production form.

**Steps:**
1. In `attachments` step, click the Scan (OCR) button on a production-form file
2. Wait for detection and OCR to complete

**Expected:**
- Bot message: "Σάρωση αρχείου…" then detection details (pages, form types)
- Bot shows page count and detected form types
- Only `OCRVerificationModal` opens (no Teams Time modal)
- User can edit production lines in the modal
- Clicking "Επιβεβαίωση" saves data to DB and closes modal
- Bot confirms: "OCR δεδομένα αποθηκεύτηκαν"
- No Teams Time modal appears after

---

## 7. OCR Teams Time-Only Flow

**Scenario:** File contains only a teams_time form.

**Steps:**
1. Click OCR on a teams_time-only file

**Expected:**
- Detection shows only `teams_time` form type
- `OCRVerificationModal` (production) does NOT open
- `OCRTeamsTimeVerificationModal` opens directly
- User confirms → data saved → bot confirms
- No production modal appears at any point

---

## 8. Dual-Form OCR Flow

**Scenario:** File contains both a production form and a teams_time form.

**Steps:**
1. Click OCR on a multi-page file with both form types

**Expected:**
- Detection message shows both form types (e.g. "Σελ.1=production, Σελ.2=teams_time")
- `OCRVerificationModal` (production) opens first
- After confirming production → `OCRTeamsTimeVerificationModal` opens automatically
- Bot message bridges the two: "Τώρα επιβεβαίωσε τα δεδομένα Teams Time…"
- After confirming teams time → both datasets saved, bot confirms each
- Order is always: production first, teams_time second

---

## 9. OCR Skip Flow

**Scenario:** User skips one or both OCR modals.

**Steps (production-only):**
1. Click OCR on a production-only file
2. Click "Skip" / "Παράλειψη" in `OCRVerificationModal`

**Expected:**
- Modal closes, no data saved for production
- Bot: "Φόρμα παραλείφθηκε"
- No Teams Time modal opens (since it was production-only)

**Steps (dual-form, skip production):**
1. Click OCR on dual-form file
2. Skip `OCRVerificationModal`

**Expected:**
- Bot: "Παραλείφθηκε η αποθήκευση της πρώτης φόρμας. Συνέχεια με Teams Time…"
- `OCRTeamsTimeVerificationModal` opens automatically

**Steps (dual-form, skip both):**
1. Skip production modal → Teams Time modal opens → skip that too

**Expected:**
- Both modals close, no data saved, bot message after each skip

---

## 10. Batch Lines Review Flow

**Scenario:** Existing batch has pre-populated batch lines from scheduled data.

**Steps:**
1. Reach `attachments` step on a batch with existing lines
2. Click "Συνέχεια → Batch Lines"
3. Step enters `batch_lines_review`
4. For each item, modify values in the 3 number inputs
5. Click "Επιβεβαίωση" for each item

**Expected:**
- Bot shows item prompt: "Item X/N: [code] Scheduled: Y"
- Each confirmation saves to DB and advances to next item
- Bot confirms each save: "Item [code] - Processed: X | Good: Y | Scrap: Z"
- After last item → step moves to `batch_lines_add`
- Bot: "Όλα τα items καταχωρήθηκαν!"

**Also check:**
- "Skip" button skips the current item without saving
- "Skip All" jumps directly to `batch_lines_add`

---

## 11. Confirm All Flow

**Scenario:** User wants to save all batch lines at once without reviewing individually.

**Steps:**
1. In `batch_lines_review`, modify some values in the inputs
2. Click "Επιβεβαίωση Όλων & Συνέχεια"

**Expected:**
- Spinner shown on button while saving
- All lines saved to DB in sequence
- Step moves to `batch_lines_add`
- Bot: "Όλα τα [N] items αποθηκεύτηκαν."
- No crash if component unmounts during save (unmount guard active)

---

## 12. Batch Lines Add Flow

**Scenario:** User adds extra item codes not in the scheduled lines.

**Steps:**
1. Reach `batch_lines_add`
2. Use the ItemCodeMultiSelect to pick one or more item codes
3. Enter values for Processed / Out Good / Scrap
4. Click "Προσθήκη Line(s)"

**Expected:**
- New batch lines created in DB
- Bot confirms: "Προστέθηκαν: [codes] | Processed=X | Good=Y | Scrap=Z"
- Form resets (item_codes cleared, quantities cleared)
- Existing lines list refreshes to show new lines

**Also check:**
- Warning banner appears for any existing line whose item code is NOT in the bundle standards
- "Συνέχεια → QC" button advances to `qc` step

---

## 13. Step Navigation — Forward / Back / Skip

**Steps:**
1. From `batch_lines_add`, click "Συνέχεια → QC"
2. In `qc`, click Back button
3. In `qc`, click Skip
4. In `operations`, type "next" in chat input

**Expected:**
- Forward: step advances in sequence (batch_lines_add → qc → operations → team_persons → team_extra → help_in → consumables → done)
- Back: returns to previous step in STEP_SEQUENCE
- Skip: advances without saving, bot says "Παράλειψη"
- Chat shortcut "next" / "συνέχεια" advances from any STEP_SEQUENCE step
- "finish" / "τέλος" in chat jumps directly to `done`
- At `done` step, "Νέα Καταχώριση" button resets fully

---

## 14. Split Layout vs Floating Layout Parity

**Steps:**
1. Run the full wizard in floating mode (Bot button → panel)
2. Run the same wizard in split layout (SplitLayoutWithChatbot page)

**Expected for both:**
- Same steps render (renderSharedSteps is shared)
- Same chat input renders (renderChatInput is shared)
- Bot messages appear identically
- OCR modals open correctly from both
- Attachments modal opens from both
- Reset works in both
- In split layout: fullscreen toggle expands to fill viewport below header
- In floating: minimize/maximize/fullscreen/close all work
- Dragging the floating panel by the header works; input/buttons inside do NOT trigger drag

---

## 15. Reset Flow

**Scenario:** User resets mid-wizard.

**Steps:**
1. Advance to any step (e.g. `batch_lines_add`)
2. Click "↩ Νέα αναζήτηση" or "↩ Αρχή" or type "reset" in chat

**Expected:**
- step resets to `file_upload`
- `selDept`, `selDate`, `selBatch` all cleared
- `blReviewItems`, `blCurrentIdx` and their refs reset to empty/0
- `blAddForm` cleared
- Chat log resets to single welcome message
- No stale batch data visible

---

## 16. Error Handling Cases

### 16a. Upload fails
- Disconnect network, upload a file
- **Expected:** Bot message "❌ Αποτυχία ανεβάσματος…", no crash, uploadingCount returns to 0

### 16b. Batch creation fails
- Simulate a DB error during batch creation
- **Expected:** `toast.error` shown, bot message "❌ Σφάλμα κατά τη δημιουργία batch…", wizard stays on current step

### 16c. OCR backend fails
- Point to an unreadable/corrupt file, trigger OCR
- **Expected:** Bot message "❌ OCR αποτυχία: [message]", `ocrLoading` clears, no modal opens

### 16d. No bundle found
- Select a department with no active bundle, select a date with no existing batch
- **Expected:** Bot warns "⚠️ Δεν βρέθηκε ενεργό bundle για αυτό το τμήμα", step moves to `batch` but no creation is attempted. "Δημιούργησε batch" button also shows error if clicked.

### 16e. Batch lines save fails
- In `batch_lines_review`, simulate a DB update failure
- **Expected:** `isSavingLine` clears, wizard does not hang on the failed item

### 16f. OCR already processing (cache status = isProcessing)
- Trigger OCR twice rapidly on the same file
- **Expected:** Second invocation is blocked by `if (ocrLoading) return` guard. Bot shows "⏳ OCR για … ήδη σε εξέλιξη."

### 16g. OCR cache hit
- Re-trigger OCR on a file that was already scanned successfully
- **Expected:** Bot message "✅ Χρήση cached δεδομένων για…", no backend call, modal opens with cached data

---

## Regression Notes
- After any OCR confirm, verify `queryClient.invalidateQueries` fires for the correct batch ID keys
- After reset, verify no stale `selBatch` causes ghost queries
- In split fullscreen mode, verify the panel does not overflow behind the top nav (top offset = 64px)