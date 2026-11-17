# AGENTS.md — Antigravity Master Project Instructions

## 1. Project Identity
- **System:** Smart Housekeeping Supply Management System (SHSMS)
- **Target Organization:** Hemas Hospital, Thalawathugoda
- **Timeline:** **4-Day Rapid Delivery Sprint**
- **Primary Source of Truth:** `docs/SRS.md`

## 2. How Antigravity Should Work on This Repo
This repository is initialized with **zero application code** intentionally. You (Antigravity) are responsible for implementing the full system cleanly, module by module, strictly following `docs/SRS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_DESIGN.md`, and `docs/FOUR_DAY_SPRINT_PLAN.md`.

### Mandatory Rules for Every Task
1. **Read `docs/SRS.md` before designing or coding any feature.** Every table, API endpoint, and UI screen must map to a Requirement ID (`FR-1` to `FR-6`, `NFR`).
2. **Use the project skills in `.agents/skills/`:**
   - `shsms-db-architect` — when creating or modifying database schemas, migrations, or seed data.
   - `shsms-api-builder` — when implementing backend routes, RBAC middleware, FEFO stock deduction, alerts, or PO verification.
   - `shsms-frontend-ui` — when building dashboards, forms, QR scanning/label printing, or reports.
   - `shsms-qa-verifier` — when testing flows, checking edge cases, and validating 4-day MVP readiness.
3. **Never compromise core hospital business logic:**
   - **FEFO (First Expired, First Out):** Stock issuance must always prioritize active batches with the earliest `expiry_date`. Expired batches (`expiry_date < today`) must be blocked from normal issuance.
   - **Transactional Integrity:** All stock receipts, issues, and wastage adjustments must run inside database transactions and write an immutable record to the `stock_ledger` table.
   - **Strict RBAC:** Enforce role permissions on both backend APIs and frontend routes (`HOUSEKEEPING_SUPERVISOR`, `MANAGER`, `STORES_STAFF`, `PROCUREMENT_STAFF`, `ADMIN`).
   - **Delivery Verification:** Received deliveries must be checked against a Purchase Order (PO); discrepancies (shortages/damages) must trigger alerts to Procurement and Management without adding damaged units to usable stock.
4. **Keep the 4-Day Scope Focused:** Prioritize working end-to-end flows over over-engineering. Use clean, modular code and seed realistic Hemas Hospital housekeeping sample data (chemicals, equipment, consumables, PPE) so every workflow can be demonstrated immediately.
