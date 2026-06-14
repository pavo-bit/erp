-- ==============================================================================
-- PHASE 1: IMMUTABLE FINANCIAL LEDGER
-- DATABASE-LEVEL IMMUTABILITY & INTEGRITY ENFORCEMENT
-- ==============================================================================

-- 1. STRICT DOUBLE-ENTRY ENFORCEMENT (XOR ON DEBIT/CREDIT)
-- A ledger entry can either be a debit OR a credit. It cannot be both.
-- It also cannot be negative.
ALTER TABLE "LedgerEntry" ADD CONSTRAINT check_strict_double_entry 
CHECK (
  (
    ("debitAmount" > 0 AND "creditAmount" = 0) OR 
    ("creditAmount" > 0 AND "debitAmount" = 0)
  ) 
  AND "debitAmount" >= 0 
  AND "creditAmount" >= 0
);

-- ==============================================================================
-- 2. IMMUTABILITY ENFORCEMENT (PREVENT UPDATE & DELETE)
-- Bank-grade ledger systems do not allow historical records to be altered.
-- Any correction must be done via a Reversal Transaction.
-- ==============================================================================

-- Trigger Function: Block Updates
CREATE OR REPLACE FUNCTION prevent_ledger_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Enterprise Ledger Violation: Ledger records are IMMUTABLE. Updates are strictly forbidden. Use reversal transactions to correct errors.';
END;
$$ LANGUAGE plpgsql;

-- Trigger Function: Block Deletions
CREATE OR REPLACE FUNCTION prevent_ledger_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Enterprise Ledger Violation: Ledger records are IMMUTABLE. Deletions are strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

-- Attach Triggers to LedgerTransaction
CREATE TRIGGER prevent_ledger_transaction_update
BEFORE UPDATE ON "LedgerTransaction"
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_update();

CREATE TRIGGER prevent_ledger_transaction_delete
BEFORE DELETE ON "LedgerTransaction"
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_delete();

-- Attach Triggers to LedgerEntry
CREATE TRIGGER prevent_ledger_entry_update
BEFORE UPDATE ON "LedgerEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_update();

CREATE TRIGGER prevent_ledger_entry_delete
BEFORE DELETE ON "LedgerEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_delete();

-- ==============================================================================
-- 3. APPEND-ONLY EVENT STORE ENFORCEMENT
-- The Domain Event Store must also be strictly append-only.
-- ==============================================================================
CREATE TRIGGER prevent_ledger_event_update
BEFORE UPDATE ON "LedgerEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_update();

CREATE TRIGGER prevent_ledger_event_delete
BEFORE DELETE ON "LedgerEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_delete();
