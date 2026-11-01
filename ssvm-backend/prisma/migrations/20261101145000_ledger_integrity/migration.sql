-- Database-enforced double-entry balance and posted-ledger immutability.

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ledger_entry_strict_double_entry_check'
      AND conrelid = '"LedgerEntry"'::regclass
  ) THEN
    ALTER TABLE "LedgerEntry"
      ADD CONSTRAINT ledger_entry_strict_double_entry_check
      CHECK (
        ("debitAmount" > 0 AND "creditAmount" = 0)
        OR ("creditAmount" > 0 AND "debitAmount" = 0)
      );
  END IF;
END
$constraint$;

CREATE OR REPLACE FUNCTION enforce_posted_ledger_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $immutability$
DECLARE
  transaction_status TEXT;
BEGIN
  IF TG_TABLE_NAME = 'LedgerTransaction' THEN
    transaction_status := OLD.status::TEXT;
  ELSIF TG_TABLE_NAME = 'LedgerEntry' THEN
    SELECT status::TEXT
      INTO transaction_status
      FROM "LedgerTransaction"
      WHERE id = OLD."transactionId";
  ELSE
    RAISE EXCEPTION 'Ledger events are append-only.';
  END IF;

  IF transaction_status = 'POSTED' THEN
    RAISE EXCEPTION 'Posted ledger records are immutable; create a reversal transaction.';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$immutability$;

CREATE OR REPLACE FUNCTION assert_posted_ledger_transaction_balanced()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $balance$
DECLARE
  target_transaction_id TEXT;
  transaction_status TEXT;
  entry_count BIGINT;
  debit_total NUMERIC(18, 2);
  credit_total NUMERIC(18, 2);
BEGIN
  IF TG_TABLE_NAME = 'LedgerTransaction' THEN
    target_transaction_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    target_transaction_id := OLD."transactionId";
  ELSE
    target_transaction_id := NEW."transactionId";
  END IF;

  SELECT status::TEXT
    INTO transaction_status
    FROM "LedgerTransaction"
    WHERE id = target_transaction_id;

  IF NOT FOUND OR transaction_status <> 'POSTED' THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*), COALESCE(SUM("debitAmount"), 0), COALESCE(SUM("creditAmount"), 0)
    INTO entry_count, debit_total, credit_total
    FROM "LedgerEntry"
    WHERE "transactionId" = target_transaction_id;

  IF entry_count < 2 OR debit_total <= 0 OR debit_total <> credit_total THEN
    RAISE EXCEPTION
      'Posted ledger transaction % is unbalanced (entries %, debit %, credit %).',
      target_transaction_id, entry_count, debit_total, credit_total;
  END IF;
  RETURN NULL;
END
$balance$;

CREATE TRIGGER prevent_posted_ledger_transaction_update
BEFORE UPDATE ON "LedgerTransaction"
FOR EACH ROW EXECUTE FUNCTION enforce_posted_ledger_immutability();

CREATE TRIGGER prevent_posted_ledger_transaction_delete
BEFORE DELETE ON "LedgerTransaction"
FOR EACH ROW EXECUTE FUNCTION enforce_posted_ledger_immutability();

CREATE TRIGGER prevent_posted_ledger_entry_update
BEFORE UPDATE ON "LedgerEntry"
FOR EACH ROW EXECUTE FUNCTION enforce_posted_ledger_immutability();

CREATE TRIGGER prevent_posted_ledger_entry_delete
BEFORE DELETE ON "LedgerEntry"
FOR EACH ROW EXECUTE FUNCTION enforce_posted_ledger_immutability();

CREATE TRIGGER prevent_ledger_event_update
BEFORE UPDATE ON "LedgerEvent"
FOR EACH ROW EXECUTE FUNCTION enforce_posted_ledger_immutability();

CREATE TRIGGER prevent_ledger_event_delete
BEFORE DELETE ON "LedgerEvent"
FOR EACH ROW EXECUTE FUNCTION enforce_posted_ledger_immutability();

CREATE CONSTRAINT TRIGGER assert_ledger_transaction_balance_on_post
AFTER INSERT OR UPDATE ON "LedgerTransaction"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION assert_posted_ledger_transaction_balanced();

CREATE CONSTRAINT TRIGGER assert_ledger_entry_balance
AFTER INSERT OR UPDATE OR DELETE ON "LedgerEntry"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION assert_posted_ledger_transaction_balanced();
