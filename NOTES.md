# Engineering Delivery Notes: FFC Reclamation Mobile Android Application

## 1. Quick Start: Install & Run on Mobile Phone

The optimized native Android debug APK has been compiled and is ready for immediate installation:

- **Root APK File:** [`ffc-reclamation-debug.apk`](file:///c:/WASIQ/FFC%20WORK%20PAPA/ffc-reclamation-debug.apk) (4.12 MB)
- **Gradle Output Location:** [`frontend/android/app/build/outputs/apk/debug/app-debug.apk`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/android/app/build/outputs/apk/debug/app-debug.apk)

### Option A: Install via ADB (Fastest for Developers)
Connect your Android phone via USB with USB Debugging enabled:
```powershell
# Using the installed Android platform-tools:
& "C:\Users\wasiq\AppData\Local\Android\Sdk\platform-tools\adb.exe" install -r "c:\WASIQ\FFC WORK PAPA\ffc-reclamation-debug.apk"
```

### Option B: Wireless Install / Direct Download on Phone
1. Ensure your phone is connected to the same Wi-Fi network as this PC (`192.168.100.x`).
2. Transfer `ffc-reclamation-debug.apk` to your phone via WhatsApp, Google Drive, Bluetooth, or USB cable.
3. Open the APK on your phone and tap **Install** (allow "Install from Unknown Sources" if prompted).

### Option C: Test Live Web App Directly in Mobile Chrome / Edge
Open the mobile browser on your phone and browse to:
```
http://192.168.100.180:3000
```
*(The UI will automatically render the exact same Careem/Netflix-style bottom navigation and touch-optimized layout).*

---

## 2. Server Prerequisites for Live Testing

To test live data operations (Register Valve, OCR Scanning, Pressure Testing):

1. **FastAPI Backend Service:**
   Must be running and bound to `0.0.0.0:8000`:
   ```powershell
   .\backend\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
   ```
2. **Next.js Frontend Service:**
   Must be running and bound to `0.0.0.0:3000`:
   ```powershell
   cd frontend
   npm run dev -- -H 0.0.0.0 -p 3000
   ```

---

## 3. How to Rebuild the Android Debug APK

If you make further changes to the frontend and want to recompile the APK:

```powershell
# Step 1: Build & Export Next.js Web Assets
cd "c:\WASIQ\FFC WORK PAPA\frontend"
npm run build

# Step 2: Sync Web Assets to Android Capacitor Project
npx cap sync android

# Step 3: Compile Debug APK with Gradle
cd android
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
$env:ANDROID_HOME = "C:\Users\wasiq\AppData\Local\Android\Sdk"
.\gradlew.bat assembleDebug

# Output APK will be at:
# frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Key UI/UX & Architecture Changes

### A. Viewport & Scaling Engine
- **Fluid Dynamic Viewport:** Updated `layout.tsx` with `viewportFit: "cover"` and `100dvh` (prevents address bar clipping).
- **Auto-Zoom Elimination:** Configured `text-size-adjust: 100%` and locked all form inputs on `<md:` viewports to a minimum of 16px font-size with 44–48px touch heights.
- **Safe Area Insets:** Applied `pt-safe` and `pb-safe` so camera modals, bottom navigation, and sticky buttons never collide with notches or gesture navigation bars.

### B. Hardware Back Button State Machine (`MobileBackHandler.tsx` + `modalRegistry.ts`)
A 4-tier hierarchical handler eliminates unexpected app exits:
1. **Tier 1 (Active Modals/Drawers):** If a camera preview, lightbox, search dialog, or bottom drawer is open, pressing the hardware back button cleanly closes it without navigating away.
2. **Tier 2 (Router History):** If no modal is active and previous page history exists, it navigates back one screen (`router.back()`).
3. **Tier 3 (Tab Return):** If the user is on a secondary route (e.g., `/jobs`, `/financials`, `/photos`), pressing back returns them to the Dashboard (`/`).
4. **Tier 4 (Exit Protection):** If on the Dashboard (`/`), the first press displays a native-style toast: *"Press back again to exit FFC App"*. Only a second press within 2000ms calls `App.exitApp()`.

### C. Modern Mobile Navigation (Careem / inDrive / Netflix Style)
- **Bottom Navigation Bar:** 5 thumb-friendly tabs (`Dashboard`, `Master Register`, `AI Scan` elevated pill, `New Valve`, and `More` menu).
- **Mobile Drawer:** Slide-up bottom sheet provides 1-tap access to all 12 operational modules (Certificates, Records, Inspections, Photos, Workflow, Organizations, Reports, Settings, User profile, and Sign Out).
- **Desktop Preservation:** The desktop sidebar (`w-64`/`w-16`) is cleanly hidden on mobile (`hidden md:flex`) and remains 100% functional on PC/laptop browsers.

### D. Responsive Stacked Cards
- Replaced 10-column tables in `/jobs` (Master Register), `/financials` (Reclamation Records), and `/certificates` with mobile card lists on `<md:` screens while keeping the dense engineering tables on `>=md:`.
- Added sticky bottom action bars on large forms (`/jobs/new` and `/jobs/scan`) for quick thumb submission.

### E. Android Native Layer Polish
- `android:windowSoftInputMode="adjustResize"` in `AndroidManifest.xml` ensures inputs scroll smoothly above the keyboard.
- `android:hardwareAccelerated="true"` enabled for 60fps animations.
- Brand status bar color `#061020` and emerald accent `#059669` configured in `colors.xml`.
- Real-time offline detection banner alerts operators when network connectivity drops.

---

## 5. Modified Files Summary

| File Path | Description of Changes |
|---|---|
| [`AUDIT.md`](file:///c:/WASIQ/FFC%20WORK%20PAPA/AUDIT.md) | Comprehensive 5-viewport audit matrix, before/after comparison, and architecture plan. |
| [`NOTES.md`](file:///c:/WASIQ/FFC%20WORK%20PAPA/NOTES.md) | Build instructions, ADB installation guide, and architectural summary. |
| [`frontend/src/app/layout.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/app/layout.tsx) | Added Next.js `Viewport` export (`viewportFit: "cover"`, `100dvh`). |
| [`frontend/src/app/globals.css`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/app/globals.css) | Safe-area utilities (`pt-safe`, `pb-safe`), `100%` text-size adjust, active tap feedback, mobile input 16px rule. |
| [`frontend/src/lib/modalRegistry.ts`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/lib/modalRegistry.ts) | Centralized overlay dismissal registry for Capacitor hardware back button. |
| [`frontend/src/components/MobileBackHandler.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/components/MobileBackHandler.tsx) | 4-tier Android back button state machine with double-tap exit toast. |
| [`frontend/src/components/BottomNav.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/components/BottomNav.tsx) | Careem/Netflix style bottom navigation bar with elevated center scan button. |
| [`frontend/src/components/MobileDrawer.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/components/MobileDrawer.tsx) | Native slide-up bottom sheet for secondary navigation and user profile. |
| [`frontend/src/components/Navigation.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/components/Navigation.tsx) | Hidden on mobile (`hidden md:flex`), preserved on desktop. |
| [`frontend/src/components/AppLayoutShell.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/components/AppLayoutShell.tsx) | Integrated `BottomNav`, `MobileBackHandler`, dynamic `100dvh`, and offline connectivity banner. |
| [`frontend/src/components/GlobalSearchModal.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/components/GlobalSearchModal.tsx) | Registered with `modalRegistry` for back button dismissal. |
| [`frontend/src/components/ConfirmModal.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/components/ConfirmModal.tsx) | Registered with `modalRegistry` for back button dismissal. |
| [`frontend/src/app/page.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/app/page.tsx) | Fluid padding, responsive metric strip, and thumb-friendly header actions. |
| [`frontend/src/app/jobs/page.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/app/jobs/page.tsx) | Responsive stacked cards on `<md:` and 10-column table on `>=md:`, 44px touch targets. |
| [`frontend/src/app/financials/page.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/app/financials/page.tsx) | Responsive cards for reclamation records on `<md:`, 44px tap targets. |
| [`frontend/src/app/certificates/page.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/app/certificates/page.tsx) | Responsive certificate cards on `<md:`, dynamic PDF URLs, 44px buttons. |
| [`frontend/src/app/jobs/new/page.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/app/jobs/new/page.tsx) | Sticky bottom action bar, camera modal back-button integration, 48px buttons. |
| [`frontend/src/app/jobs/scan/page.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/app/jobs/scan/page.tsx) | Sticky bottom action bar, camera back-button integration, 48px auto-register button. |
| [`frontend/src/app/photos/page.tsx`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/src/app/photos/page.tsx) | Registered lightbox and camera modals with `modalRegistry`. |
| [`frontend/capacitor.config.ts`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/capacitor.config.ts) | Configured live Wi-Fi host `http://192.168.100.180:3000` with cleartext traffic. |
| [`frontend/android/app/src/main/AndroidManifest.xml`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/android/app/src/main/AndroidManifest.xml) | Added `android:windowSoftInputMode="adjustResize"` and `android:hardwareAccelerated="true"`. |
| [`frontend/android/app/src/main/res/values/colors.xml`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/android/app/src/main/res/values/colors.xml) | Defined FFC brand colors for Android native status bar. |
| [`frontend/android/local.properties`](file:///c:/WASIQ/FFC%20WORK%20PAPA/frontend/android/local.properties) | Configured Android SDK directory path. |
| [`ffc-reclamation-debug.apk`](file:///c:/WASIQ/FFC%20WORK%20PAPA/ffc-reclamation-debug.apk) | Compiled standalone debug APK binary (4.12 MB). |
