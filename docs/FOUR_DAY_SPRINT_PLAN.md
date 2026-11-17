# 4-Day Rapid Sprint Plan & Antigravity Playbook

**Goal:** Deliver a complete, demo-ready Smart Housekeeping Supply Management System (SHSMS) for Hemas Hospital, Thalawathugoda in **4 days**, strictly matching `docs/SRS.md`.

---

## Day 1: Foundation, Database & Authentication
- **Objective:** Scaffold backend + frontend projects, initialize database schema, seed Hemas Hospital sample data, and implement JWT Auth + RBAC.
- **Antigravity Skills Used:** `shsms-db-architect`, `shsms-api-builder`
- **Prompt to Paste in Antigravity:**
  > "Read `AGENTS.md`, `docs/SRS.md`, `docs/ARCHITECTURE.md`, and `docs/DATABASE_DESIGN.md`. Using the `shsms-db-architect` skill, initialize the backend and frontend project folders, set up the database schema with migrations, and create a seed script with realistic Hemas Hospital housekeeping items (Cleaning Chemicals, Equipment, Consumables, PPE) and 1 user per role. Then implement JWT authentication and RBAC middleware."
- **End-of-Day Milestone:** Database migrated & seeded; login works for all 5 roles.

## Day 2: Core Inventory, QR Codes & FEFO Engine
- **Objective:** Build Item Master CRUD, QR code generation & printable labels, QR scan lookup, FEFO batch issuance logic, and automatic Low-Stock + Expiry alert triggers.
- **Antigravity Skills Used:** `shsms-api-builder`, `shsms-frontend-ui`
- **Prompt to Paste in Antigravity:**
  > "Using `shsms-api-builder` and `shsms-frontend-ui`, implement Module 1 (Digital Inventory Monitoring + QR code generation & camera/manual scanning), Module 2 (Automatic Low-Stock Notifications), and Module 5 (Expiry-Date & FEFO Stock Rotation). Ensure every stock movement writes an immutable `stock_ledger` entry inside a DB transaction."
- **End-of-Day Milestone:** Stores Staff can register items, print/scan QR codes, and see FEFO-sorted batches and automated alerts.

## Day 3: Supply Requests, Approvals & PO Delivery Verification
- **Objective:** Build Housekeeping Supervisor request submission, Manager approval/rejection workflow, Stores FEFO issuance against approved requests, and Procurement PO + Delivery Verification with discrepancy logging.
- **Antigravity Skills Used:** `shsms-api-builder`, `shsms-frontend-ui`
- **Prompt to Paste in Antigravity:**
  > "Implement Module 3 (Digital Supply Request & Approval System) and Module 4 (Delivery Verification System) per `docs/SRS.md`. Include automatic stock availability checks on requests, Manager approve/reject with remarks, Stores FEFO fulfillment, and Stores delivery inspection against POs that flags shortages/damages to Procurement."
- **End-of-Day Milestone:** Full 7-step operational workflow (Section 2.4 of SRS) works end-to-end.

## Day 4: Reporting, Polish & Full QA Verification
- **Objective:** Build the 5 management reports + CSV/Print export, polish role-specific dashboards, and run full SRS verification.
- **Antigravity Skills Used:** `shsms-frontend-ui`, `shsms-qa-verifier`
- **Prompt to Paste in Antigravity:**
  > "Implement Module 6 (Stock Usage & Performance Reporting: Availability, Monthly Consumption, Shortages, Procurement Performance, and Wastage with CSV/print export). Then run `shsms-qa-verifier` to test all 6 SRS modules, RBAC boundaries, FEFO edge cases, and prepare the demo walkthrough."
- **End-of-Day Milestone:** All `FR-1` to `FR-6` requirements verified and ready for presentation.
