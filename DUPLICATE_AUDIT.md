# Duplicate "Operation Categories" & AI Brand Audit

## 1. Audit of "Operation Categories"

### Occurrence 1: Valve Intake Registration Form (EARLIER IN USER FLOW - TO BE REMOVED)
- **File**: `frontend/src/app/jobs/new/page.tsx`
- **Component**: `NewJobPage`
- **Route**: `/jobs/new`
- **Position in Flow**: **Earlier** — At initial valve receipt into the shop floor.
- **Section in Page**: **Section 3** (between Section 2: Technical Valve Details and Section 4: Initial Condition & Scope).
- **Heading**: `3. Operation Categories (Multi-Select)`
- **Helper text**: `Select all applicable shop operations and add custom categories if required.`
- **UI Elements**:
  - Multi-select interactive chips for predefined operations:
    - *Seat Reclamation*, *Machining*, *Lapping*, *Stelliting*, *Stem Work*, *Gland Packing Replacement*, *Gasket Fabrication*, *Gate / Disc / Plug Work*, *Back-seat Work*, *Ends Repair*.
  - Rendered tags for dynamically added custom operations.
  - "+ + Custom Operation" toggle and inline text input.
- **State & Submission**:
  - State: `selectedOperationCategories`, `customOperationInput`, `showCustomOpInput`.
  - Submission payload: `payload.operation_categories = selectedOperationCategories.join(", ")`.
- **Reason for Removal**:
  During initial valve intake registration, the valve has merely arrived at the shop and has not yet been dismantled or inspected. Asking the user to specify completed or active shop operation categories at intake clutters the intake form and prematurely duplicates the execution stage. Removing this section streamlines the intake form while preserving clean sequential numbering.

---

### Occurrence 2: Job Execution & Detail Page (LATER IN USER FLOW - TO BE KEPT)
- **File**: `frontend/src/app/jobs/[id]/page.tsx`
- **Component**: `JobDetailPage`
- **Route**: `/jobs/[id]`
- **Position in Flow**: **Later** — During actual shop-floor valve reclamation and testing execution.
- **Location in Page**:
  - Allocated operations summary strip (`job.operation_categories`).
  - Shop-floor modal: `Record Reclamation Work Operation` (`showWorkModal`).
- **UI Elements**:
  - Multi-select checkbox grid for shop operations:
    - *Seat reclamation*, *Body / Seat Machining*, *Precision Lapping*, *Stelliting Hardfacing*, *Stem Polish / Built-up*, *Gland Packing Replacement*, *Bonnet Gasket Fabrication / Replacement*, *Gate / Disc / Plug Refurbishment*, *Back-seat Machining*, *Flange Ends Repair*.
  - Dynamic "Other / Custom Operation" field.
  - Technician selector, duration (hours), work description notes.
- **State & Submission**:
  - Saved directly to job work logs and updates job operation categories.
- **Reason to Keep**:
  This is the true operational source of truth where shop technicians log the actual reclamation work performed on the valve.

---

### Occurrence 3: Existing Job Edit Page (LATER IN USER FLOW - TO BE KEPT)
- **File**: `frontend/src/app/jobs/edit/[id]/page.tsx`
- **Component**: `EditJobPage`
- **Route**: `/jobs/edit/[id]`
- **Position in Flow**: **Later** — Administrative or engineering modification of an existing registered valve order.
- **Section in Page**: Section 3 (`3. Operation Categories (Multi-Select)`).
- **Reason to Keep**:
  Allows updating or re-allocating categories for existing job records.

---

## 2. Audit of AI Icons and Visible "AI" Wording

| # | File | Line(s) | Current Content | Proposed Neutral Change |
|---|---|---|---|---|
| 1 | `frontend/src/app/jobs/new/page.tsx` | 18 | `import { Sparkles, ... }` | Remove `Sparkles` import |
| 2 | `frontend/src/app/jobs/new/page.tsx` | 135 | `// Pre-fill query parameters if navigated from AI Scanner` | `// Pre-fill query parameters if navigated from Certificate Scanner` |
| 3 | `frontend/src/app/jobs/new/page.tsx` | 372 | `{/* AI Scanner Banner */}` | `{/* Certificate Scanner Banner */}` |
| 4 | `frontend/src/app/jobs/new/page.tsx` | 394-395 | `<Sparkles className="w-3.5 h-3.5" /><span>Launch AI Scanner</span>` | `<ScanLine className="w-3.5 h-3.5" /><span>Launch Certificate Scanner</span>` |
| 5 | `frontend/src/app/jobs/scan/page.tsx` | 17 | `import { Sparkles, ... }` | Remove `Sparkles` import |
| 6 | `frontend/src/app/jobs/scan/page.tsx` | 371 | `title="AI Certificate & Slip Scanner"` | `title="Certificate & Slip Scanner"` |
| 7 | `frontend/src/app/jobs/scan/page.tsx` | 739 | `<Sparkles className="w-4 h-4 text-emerald-600" />` | `<FileCheck2 className="w-4 h-4 text-emerald-600" />` |
| 8 | `frontend/src/app/page.tsx` | 101 | `<span>AI Scanner</span>` | `<span>Certificate Scanner</span>` |
| 9 | `frontend/src/components/BottomNav.tsx` | 24 | `{ label: "AI Scan", href: "/jobs/scan", ... }` | `{ label: "Scan", href: "/jobs/scan", ... }` |
| 10 | `frontend/src/components/GlobalSearchModal.tsx` | 36 | `label: "AI Certificate Scanner"` | `label: "Certificate Scanner"` |
| 11 | `frontend/src/components/Navigation.tsx` | 58 | `label: "AI Certificate Scanner"` | `label: "Certificate Scanner"` |
| 12 | `frontend/src/components/TopBar.tsx` | 12, 27 | `Sparkles`, `scan: "AI Certificate Scanner"` | Remove `Sparkles`, `scan: "Certificate Scanner"` |
| 13 | `frontend/src/app/jobs/[id]/page.tsx` | 28, 751, 1598 | `Sparkles` in "+ After Reclamation" & "AFTER Reclamation" | Replace with `Camera` / `CheckCircle2`, remove unused import |
| 14 | `frontend/src/app/photos/page.tsx` | 21 | Unused `Sparkles` import | Remove `Sparkles` import |
| 15 | `frontend/src/app/settings/page.tsx` | 23 | Unused `Sparkles` import | Remove `Sparkles` import |
| 16 | `frontend/src/components/MobileDrawer.tsx` | 21 | Unused `Sparkles` import | Remove `Sparkles` import |

---

## 3. Plan of Execution

1. **Step 2 (Remove Earlier Operation Categories Section)**:
   - In `frontend/src/app/jobs/new/page.tsx`, completely remove Section 3 UI (`3. Operation Categories (Multi-Select)`).
   - Renumber Section 4 (`Initial Condition & Scope of Work`) to **Section 3**.
   - Renumber Section 5 (`Before Work Photo`) to **Section 4**.
   - Keep data flow: If `operation_categories` is passed via URL query params (from Scanner), store it in `operationCategoriesFromQuery` state and submit it in `payload.operation_categories`, ensuring OCR-extracted operations still seamlessly flow to the job record without requiring manual chips on Page 1.
   - Clean up dead state and handlers (`customOperationInput`, `showCustomOpInput`, `toggleOperationCategory`, `handleAddCustomOperation`).

2. **Step 3 (Remove AI Icons & Wording)**:
   - Remove all `Sparkles` icons and imports across the audited files.
   - Replace user-facing "AI Scanner", "AI Certificate Scanner", "AI Scan" with "Certificate Scanner" and "Scan".
   - Keep all OCR and scanner capabilities 100% functional.

3. **Step 4 (Verification & Build)**:
   - Run `npx tsc --noEmit`.
   - Verify layout on mobile (360px) and desktop (1366px).
   - Sync Capacitor with `npx cap sync android`.
   - Build debug APK with `./gradlew assembleDebug`.
