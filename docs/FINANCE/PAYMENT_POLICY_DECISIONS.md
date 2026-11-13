# Payment processing safeguards pending owner approval

Status: UNAPPROVED SAFE DEFAULTS. These rules preserve existing INR payment
behavior while preventing payment rows from overstating invoice balances. The
school finance owner must review them before enabling online collection in
production.

1. **Order amount** — derive the payable balance from invoice face amount plus
   recorded fine amount less already recorded payments. Use integer paise for the
   provider amount. Do not create an order when the result is zero or negative, or
   the invoice is voided/paid.
2. **Partial payments** — honor only the amount stored on the verified provider
   order. A captured amount may be less than the current balance and then leaves the
   invoice `PARTIAL`; it may not exceed the current balance. This does not add a
   new partial-payment collection feature: the user interface only requests the
   outstanding amount. The owner must approve whether partial collection should be
   allowed and how it should be presented to families.
3. **Rounding** — INR is converted to paise with `Math.round(amount * 100)` at the
   gateway boundary. Values are kept to two decimal places when returned to the
   existing Float schema. No discount, late-fine, or allocation rounding rule is
   inferred here.
4. **Ledger account mapping** — preserve the existing payment mapping to `1010-BANK`
   and `4000-TUIT` until the finance owner approves a chart-of-accounts mapping.
   Missing accounts cause the payment/invoice update transaction to roll back; no
   successful payment may be returned while its ledger entry is absent.
5. **State changes** — only a valid provider capture bound to the stored order may
   mark the payment `SUCCESS`. Invalid browser signatures do not mutate payment
   state. A successfully captured payment and invoice balance update commit in the
   same database transaction as the balanced ledger entry.

No school-specific policy for partial collection, refund/reversal, or account
mapping was found in the current schema or finance docs. Owner approval is still
required; this document records a reversible implementation default, not a finance
policy decision.
