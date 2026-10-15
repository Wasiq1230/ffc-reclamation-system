# Fauji Fertilizer Company (FFC) Valve Reclamation Management System
## Fabrication Shop — Goth Machhi, Sadiqabad, District Rahim Yar Khan, Punjab, Pakistan

Production-grade industrial web application digitizing the end-to-end valve reclamation workflow, maintaining immutable backend ledgers, generating real SQL-aggregated reports, and reproducing the official **FFC Valve Reclamation Test Certificate (Form QF-003-05-307, ANNEXURE-III)** as a precision vector A4 PDF.

---

## 1. Architectural Highlights

- **Backend**: Python 3.11+ / FastAPI, SQLAlchemy ORM, Pydantic v2 schemas, ReportLab vector graphics engine, and JWT authentication with bcrypt password hashing.
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, and Lucide industrial icons.
- **Database**: PostgreSQL in production; SQLite supported out of the box with WAL mode and foreign key enforcement enabled.
- **Document Engine**: Exact server-side vector A4 portrait ReportLab reproduction of FFC Form QF-003-05-307 with live browser print and PDF export.
- **Workflow State Machine**: 13 controlled status phases with mandatory authorization, state history tracking, and atomic sequence IDs (`VR-YYYY-XXXXXX`).

---

## 2. Organizational Boundaries (Strict Rule)

- **FFC Plant 1**:
  - Ammonia (`P1_AMM`)
  - Urea (`P1_UREA`)
  - Utilities (`P1_UTL`)
  - Machinery (`P1_MACH`)
- **FFC Plant 2**:
  - Ammonia (`P2_AMM`)
  - Urea (`P2_UREA`)
  - Machinery (`P2_MACH`)
  *(Note: Utilities belongs strictly to Plant 1; Plant 2 does not have a Utilities department).*
- **Miscellaneous / External**:
  - External industrial clients (e.g. Engro, Fatima Fertilizer, etc.) with dedicated company records, plants, and operating areas.
  - External jobs are never forced into an FFC plant or department.

---

## 3. Quick Start (Local Development)

### 3.1 Backend Setup
1. Open PowerShell and navigate to the project directory:
   ```powershell
   cd "c:\WASIQ\FFC WORK PAPA"
   ```
2. Activate the Python virtual environment and run the seeder:
   ```powershell
   .\backend\venv\Scripts\python -m backend.app.seed
   ```
3. Start the FastAPI backend server:
   ```powershell
   .\backend\venv\Scripts\python .\backend\run.py
   ```
   Backend will be accessible at: `http://127.0.0.1:8000`
   Interactive Swagger API Documentation: `http://127.0.0.1:8000/docs`

### 3.2 Frontend Setup
1. In a separate terminal, navigate to the frontend folder:
   ```powershell
   cd "c:\WASIQ\FFC WORK PAPA\frontend"
   ```
2. Start the development server:
   ```powershell
   npm run dev
   ```
   Frontend will be accessible at: `http://localhost:3000`

---

## 4. Default Credentials (Seeded for Operational Verification)

| Role | Username | Password | Personnel No. | Permitted Actions |
|---|---|---|---|---|
| **System Admin** | `admin` | `Admin@FFC2026!` | `P-0001` | Full system access, users, settings, financial records |
| **FAB Shop Staff** | `fab_staff` | `FabShop@2026!` | `P-1042` | Register reclamation jobs, create certificate drafts, print |
| **Machinist / Tech**| `technician1`| `Tech@2026!` | `P-2055` | Log reclamation operations, hours, material parts |
| **QA Inspector** | `inspector1` | `Insp@2026!` | `P-3088` | Record pressure tests, approve & issue certificates |
| **Management** | `viewer1` | `View@2026!` | `P-4012` | Read-only executive dashboards, totals, reports |

---

## 5. Running Automated Backend Test Suite

The test suite validates organizational isolation, collision-safe ID generation, workflow state machine transitions, exact ReportLab PDF output, and decimal monetary calculations.

```powershell
.\backend\venv\Scripts\pytest .\backend\tests\ -v
```

Expected result: `12 passed in 9.06s` (100% pass rate).

---

## 6. Production Deployment with Docker Compose

To deploy with PostgreSQL 16:
```bash
docker compose up -d --build
```
This automatically initializes:
- PostgreSQL on port 5432 with health check
- FastAPI backend on port 8000
- Next.js frontend on port 3000
- Persistent Docker volumes for database and certificates storage

---

## 7. Official Quality Certificate Specifications

- **Document Title**: `VALVE RECLAMATION TEST CERTIFICATE`
- **Annexure**: `ANNEXURE-III`
- **Form Reference**: `QF-003-05-307`
- **Form Reference Date**: `13-05-2025`
- **Sections**:
  - `01. Body Seat`: Stellited, Machined, Lapped
  - `02. Gate / Disc / Plug`: Warehouse Code
  - `03. Back Seat (Stem Bushing)`: Stellited, Machined, Lapped
  - `04. Back Seat (Stem)`: Stellited, Machined, Lapped
  - `05. Stem`: Built-up, Machined, Polish
  - `06. Gland Packing`: Warehouse Code, Material: Comp. Rpr, Part'l Rpr
  - `07. Bonnet Gasket`: Warehouse Code, New, Old, Shop Fabricated
  - `08. PRESSURE TESTING`:
    - Seat Test U/S (Hydraulic, Pneumatic, Test Pressure, Result)
    - Seat Test D/S (Hydraulic, Pneumatic, Test Pressure, Result)
    - Body Test (Hydraulic, Pneumatic, Test Pressure, Result)
  - `09. Ends`: Distance, Built-up, Machined
  - `Personnel Records`: RECLAIMED BY (Name, P.No), CHECKED BY (Name, P.No), WITNESS from Inspection Section (Comments, Sign, Date).
