---
name: shsms-db-architect
description: Designs, migrates, and seeds the relational database for the Hemas Hospital Smart Housekeeping Supply Management System (SHSMS) with FEFO batch tracking, QR payloads, PO verification, and immutable stock ledger.
---

# SHSMS Database Architect Skill

Use this skill whenever creating or modifying database schemas, migrations, or seed data for SHSMS.

## Required Reference
Always read `docs/DATABASE_DESIGN.md` and `docs/SRS.md` (Section 3.4) before writing any schema or migration.

## Execution Instructions
1. **Tables to Include:**
   - `users` (with `role` enum: `HOUSEKEEPING_SUPERVISOR`, `MANAGER`, `STORES_STAFF`, `PROCUREMENT_STAFF`, `ADMIN`)
   - `items` (with `category` enum: `CHEMICAL`, `EQUIPMENT`, `CONSUMABLE`, `PPE`, `min_stock_level`, `reorder_point`, `tracks_expiry`, `qr_code_value`)
   - `stock_batches` (batch-level `remaining_qty`, `expiry_date`, `received_date`, `status`)
   - `supply_requests` and `request_items`
   - `purchase_orders`, `po_items`, and `delivery_verifications`
   - `stock_ledger` (immutable movement log)
   - `alerts` (`LOW_STOCK`, `EXPIRY_WARNING`, `EXPIRED`, `DISCREPANCY`, `APPROVAL_NEEDED`)
2. **Constraints & Integrity:**
   - Enforce `remaining_qty >= 0` on `stock_batches`.
   - Enforce unique `sku` and `qr_code_value` on `items`.
   - Enforce unique `po_number` on `purchase_orders`.
   - Index `stock_batches(item_id, expiry_date, status)` for fast FEFO queries.
3. **Realistic Seed Data (Hemas Hospital, Thalawathugoda):**
   - Seed 1 user per role with documented demo credentials.
   - Seed at least 8–12 realistic housekeeping items across all 4 categories (e.g., Disinfectant Floor Cleaner, Sodium Hypochlorite 5%, Heavy-Duty Mop Set, Microfiber Cloths, Nitrile Examination Gloves, N95 Masks, Biohazard Waste Bags, Hand Sanitizer 500ml).
   - Seed multiple batches for chemicals/PPE with staggered expiry dates (including 1 expiring within 10 days and 1 already expired) so FEFO and expiry alerts are immediately testable.
