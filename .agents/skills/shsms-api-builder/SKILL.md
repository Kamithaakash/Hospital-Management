---
name: shsms-api-builder
description: Implements backend REST APIs, RBAC middleware, transactional FEFO stock deduction, automatic low-stock/expiry alerts, supply request routing, and PO delivery verification for SHSMS.
---

# SHSMS Backend API Builder Skill

Use this skill when building or updating backend endpoints, business logic, and scheduled jobs for SHSMS.

## Required Reference
Read `docs/SRS.md` (Section 3.1 `FR-1` to `FR-6`) and `docs/ARCHITECTURE.md` (Section 3).

## Core Business Logic Rules
1. **Transactional Stock Mutations:**
   - Wrap every stock receipt, FEFO issuance, and wastage disposal in a database transaction.
   - Insert an immutable row into `stock_ledger` for every quantity change.
2. **FEFO Issuance (`FR-5.3`):**
   - Query active, non-expired batches (`expiry_date IS NULL OR expiry_date >= TODAY`, `remaining_qty > 0`) ordered by `expiry_date ASC, received_date ASC`.
   - Deduct from the earliest-expiring batch first; if requested quantity spans multiple batches, deduct sequentially across batches.
   - Reject issuance of `EXPIRED` batches.
3. **Automatic Low-Stock Alerting (`FR-2`):**
   - After every `ISSUE` or `WASTAGE` transaction, compute the item's total available quantity.
   - If `total_qty <= reorder_point` and no unresolved `LOW_STOCK` alert exists for that item, create alerts targeting `HOUSEKEEPING_SUPERVISOR` and `PROCUREMENT_STAFF`.
   - When stock is replenished above `reorder_point`, mark active `LOW_STOCK` alerts for that item as resolved.
4. **Delivery Verification (`FR-4`):**
   - Stores Staff submit received quantities, condition (`GOOD`, `DAMAGED`, `DEFECTIVE`, `WRONG_ITEM`), batch number, and expiry date against a PO.
   - Only `GOOD` units create/increment `stock_batches` and `stock_ledger`.
   - Any shortage (`received_qty < ordered_qty`) or non-`GOOD` condition creates a `DISCREPANCY` alert targeting `PROCUREMENT_STAFF` and `MANAGER`.
5. **Daily Expiry Check Job (`FR-5.2`, `FR-5.4`):**
   - Mark batches with `expiry_date < TODAY` as `EXPIRED` and generate `EXPIRED` alerts.
   - Mark batches within 30 days of expiry as `EXPIRING_SOON` and generate `EXPIRY_WARNING` alerts (deduplicated).
