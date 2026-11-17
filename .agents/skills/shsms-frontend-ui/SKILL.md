---
name: shsms-frontend-ui
description: Builds the responsive React UI, role-specific dashboards, QR code label printing and camera scanning, FEFO batch selection prompts, and management reports for SHSMS.
---

# SHSMS Frontend UI Builder Skill

Use this skill when designing or implementing frontend pages, components, QR workflows, and report views.

## Required Reference
Read `docs/SRS.md` (Section 2.3 User Classes and Section 3.2.1 User Interfaces).

## UI & UX Standards
1. **Role-Specific Dashboards:**
   - **Housekeeping Supervisor:** Quick Supply Request form, My Requests status table, Low-Stock & Expiry alert banner.
   - **Responsible Manager:** Pending Approvals queue (1-click Approve / Reject with mandatory reason), KPI summary cards, Reports & Analytics tab.
   - **Stores Staff:** Prominent "Scan QR Code" button, Approved Requests ready for FEFO issue, Pending PO Deliveries to inspect, Item Registration & Print QR Labels.
   - **Procurement Staff:** Low-Stock Replenishment queue, Purchase Order creation & tracking, Delivery Discrepancy alerts.
2. **QR Code Experience (`FR-1.3`, `FR-1.4`):**
   - Provide both camera-based QR scanning (`html5-qrcode`) and a manual SKU/QR text input fallback for desktop testing.
   - Provide a clean, print-ready QR Label view (`window.print()`) showing Item Name, SKU, Storage Location, and QR Code.
3. **FEFO Visual Guidance (`FR-5.3`):**
   - On the Stores Issuance screen, display batches sorted by earliest expiry date with a clear **"Recommended (FEFO)"** badge on the top batch and red/amber badges for `EXPIRED` / `EXPIRING_SOON` batches.
4. **Reports & Export (`FR-6`):**
   - Implement all 5 required reports (Stock Availability, Monthly Consumption, Stock Shortages, Procurement & Delivery Performance, Material Wastage) with date-range & category filters and a working **Export CSV** button.
