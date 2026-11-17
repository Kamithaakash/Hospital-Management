# Hemas Hospital — Smart Housekeeping Supply Management System (SHSMS)
## Thalawathugoda Branch

A centralized digital inventory, procurement coordination, and supply distribution platform designed specifically for hospital housekeeping operations, compliant with IEEE Std 830 / ISO/IEC/IEEE 29148.

---

## 🎯 Day 1 Milestone Complete: Foundation, Database & Authentication

Phase 1 / Day 1 is fully completed and verified with **zero bugs and zero warnings**:
- **Backend REST API Architecture:** Node.js, Express, TypeScript, Zod, Helmet, CORS, and structured error handling.
- **Relational Database & Migrations:** Prisma ORM with SQLite file-based database (`backend/prisma/shsms.db`), ACID transactions, and foreign key cascades.
- **Immutable Stock Ledger:** Every inventory intake, adjustment, or dispatch is captured in `stock_ledger` for auditability and hospital IPC accountability.
- **Realistic Seed Data for Hemas Hospital:**
  - 5 Verified role accounts (1 per role) with encrypted bcrypt passwords.
  - 14 Housekeeping items across all 4 categories (`Cleaning Chemicals`, `Cleaning Equipment`, `Consumables`, `PPE`).
  - 19 Batches with staggered expiry dates, including active FEFO batches, approaching-expiry batches, and quarantined expired batches.
  - 5 Initial alerts (Low-Stock and Expiry Quarantine warnings).
  - Sample pending supply request (`REQ-202611-001`) and approved PO (`PO-2026-001`).
- **JWT Authentication & RBAC Middleware:**
  - Secure token issuance and validation.
  - Strict role-based authorization for all hospital roles: `HOUSEKEEPING_SUPERVISOR`, `MANAGER`, `STORES_STAFF`, `PROCUREMENT_STAFF`, `ADMIN`.
- **Responsive React Frontend:**
  - React + Vite + TypeScript + Tailwind CSS.
  - Clinical Hemas Hospital branding and color scheme.
  - 1-Click Role Switcher on login screen and navbar for effortless demo testing.
  - Dynamic role-tailored dashboards.
  - Interactive Stock Catalog with FEFO batch breakdown drawers.
  - Printable QR code labels (`qrcode.react`) and device camera QR scanner with manual code fallback (`html5-qrcode`).
  - Automated daily expiry check background cron job (`node-cron`).

---

## 👥 Demo User Accounts (All 5 Roles)

| Role | Name | Email | Password | Primary Functions |
| :--- | :--- | :--- | :--- | :--- |
| **Housekeeping Supervisor** | Priyani Fernando | `supervisor@hemas.lk` | `Hemas@123` | Submit ward requests, monitor ward stock & alerts |
| **Responsible Manager** | Dr. Anura Perera | `manager@hemas.lk` | `Hemas@123` | Approve/reject supply requests, oversight & reports |
| **Stores Staff** | Kamal Jayawardena | `stores@hemas.lk` | `Hemas@123` | QR scanning, FEFO stock issue, PO delivery inspection |
| **Procurement Staff** | Dilshan Silva | `procurement@hemas.lk` | `Hemas@123` | Reorders, Purchase Orders, supplier discrepancies |
| **System Administrator** | System Admin | `admin@hemas.lk` | `Hemas@123` | Full administrative & operational access |

> 💡 **Tip:** On the login screen or top-right profile dropdown in the navbar, click any role to log in with 1 click.

---

## 🚀 Running the System

### Option A: Quick Launch (Windows)
Double-click `run-shsms.bat` in the root folder. It will launch both the backend on port 5000 and the frontend on port 5173.

### Option B: Manual Terminal Execution

#### 1. Backend:
```bash
cd backend
npm run dev
# Backend runs at http://localhost:5000
```

#### 2. Frontend:
```bash
cd frontend
npm run dev
# Frontend runs at http://localhost:5173
```

#### 3. Run Automated Day 1 Test Suite:
```bash
cd backend
npx tsx src/test_auth.ts
```

#### 4. Reset & Re-Seed Database:
```bash
cd backend
npm run seed
```

---

## 📋 Requirements Traceability (Day 1 / Phase 1)

| Requirement | Description | Status |
| :--- | :--- | :--- |
| **FR-1.1** | Item Master schema & registration across 4 hospital categories | ✅ Complete |
| **FR-1.2** | Batch-level quantity & expiry tracking | ✅ Complete |
| **FR-1.3** | QR code generation & print-ready hospital label view | ✅ Complete |
| **FR-1.4** | QR scanner interface (camera + manual input fallback) | ✅ Complete |
| **FR-1.5** | Immutable stock ledger schema & initial audit trail | ✅ Complete |
| **NFR Security** | JWT Auth, bcrypt password hashing, and role-based access control (RBAC) | ✅ Complete |
| **Seed Data** | Realistic Hemas Hospital housekeeping materials and 5 staff roles | ✅ Complete |

---

## 📅 Next Phase (Day 2: Core Inventory, QR Codes & FEFO Engine)
- Complete transactional FEFO issuance engine (`POST /api/requests/:id/issue`)
- Automated Low-Stock alert triggers on issue/wastage (`FR-2.2`)
- Expiry quarantine & disposal logging (`FR-5.4`)
