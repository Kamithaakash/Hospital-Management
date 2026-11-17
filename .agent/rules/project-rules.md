# SHSMS Workspace Rules for Antigravity

1. **SRS Traceability:** Do not invent unrequested features or skip any of the 6 core modules in `docs/SRS.md` (`FR-1` to `FR-6`).
2. **Zero Silent Failures:** All stock mutations (receipt, issue, wastage) must be atomic and logged in `stock_ledger`.
3. **FEFO Enforcement:** Never issue from a newer batch if an older, non-expired batch has remaining quantity, unless explicitly overridden with a logged reason. Expired batches cannot be issued.
4. **No Hardcoded Secrets:** Use `.env` / `.env.example` for database URLs, JWT secrets, and SMTP config.
5. **Demo-Ready Seed Data:** Include realistic Hemas Hospital housekeeping items across all 4 categories (`Cleaning Chemicals`, `Cleaning Equipment`, `Consumables`, `PPE`) plus one user account per role for immediate testing.
