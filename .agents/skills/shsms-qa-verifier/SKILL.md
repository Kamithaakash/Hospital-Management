---
name: shsms-qa-verifier
description: Verifies the completed SHSMS application against every requirement in docs/SRS.md, testing RBAC, FEFO batch deduction, low-stock alerts, PO delivery discrepancies, and report exports.
---

# SHSMS QA & SRS Verification Skill

Use this skill on Day 4 (or after implementing any module) to verify full compliance with `docs/SRS.md`.

## Verification Checklist
1. **Traceability Audit (`FR-1` to `FR-6`):**
   - `FR-1`: Register an item, generate/print its QR code, scan/lookup via QR, confirm `stock_ledger` logs every movement.
   - `FR-2`: Issue stock until `total_qty <= reorder_point`; verify `LOW_STOCK` alert appears for Housekeeping Supervisor and Procurement Staff without duplicate spam.
   - `FR-3`: Submit request as Housekeeping Supervisor -> Approve/Reject as Manager -> Route to Stores (if in stock) or Procurement (if out of stock).
   - `FR-4`: Create PO as Procurement -> Verify delivery as Stores with a shortage or damaged item -> Confirm `DISCREPANCY` alert is created and damaged units are NOT added to usable stock.
   - `FR-5`: Attempt to issue an item with multiple batches -> Confirm earliest-expiring batch is selected first (FEFO) and expired batches are blocked.
   - `FR-6`: Generate all 5 reports, apply category/date filters, and verify CSV export downloads valid data.
2. **Security & RBAC Audit:**
   - Confirm Housekeeping Supervisors cannot approve their own requests or verify PO deliveries.
   - Confirm Stores Staff cannot approve purchase requests.
   - Confirm unauthenticated API calls return `401 Unauthorized` and unauthorized roles return `403 Forbidden`.
3. **4-Day Demo Readiness:**
   - Confirm seed script runs cleanly from scratch (`npm run seed` or equivalent) and all demo flows work without console errors or broken UI states.
