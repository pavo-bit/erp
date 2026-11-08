# Phase 14 External Blockers & Owner Decisions Register

## 1. Overview
Under strict local-first, zero-investment engineering rules, all platform features that require physical hardware procurement or paid commercial cloud subscriptions are classified either as `BLOCKED_EXTERNAL` or `DEFERRED_BY_OWNER`.

For all blocked items, complete software interfaces, payload schemas, security tokens, and simulated fixtures have been implemented and verified in software.

---

## 2. External Blockers (`BLOCKED_EXTERNAL`)

### 1. Physical Biometric Fingerprint Terminals (`REQ-46`)
- **Blocker Type:** External Hardware Procurement.
- **Hardware Units:** Standalone biometric fingerprint scanner terminals (e.g. ZKTeco SilkBio, Realtime T52).
- **Software State:** Complete. Device registry, badge-to-teacher mappings, shift timing rules, leave conflict resolution, and Redis 7-day deduplication are implemented and pass 100% of integration tests.
- **Privacy Guarantee:** Enforces `ON_DEVICE_TEMPLATE_MATCHING`. Raw templates never traverse the network.

### 2. Vehicle GPS Tracker Units (`REQ-31`)
- **Blocker Type:** External Hardware Procurement.
- **Hardware Units:** Physical OBD-II / AIS-140 automotive GPS tracking devices.
- **Software State:** Complete. Telemetry ingestion endpoint (`POST /vehicles/:id/telemetry`), HMAC device authentication, Haversine proximity detection (< 50m), dwell time calculation, and Parent Portal live tracking polling are fully verified.

### 3. Commercial Live Payment Gateway Merchant Accounts (`REQ-24`)
- **Blocker Type:** External Financial / Banking Credentials.
- **Requirement:** Live production credentials for Razorpay or Stripe.
- **Software State:** Complete. Counter cash fee collection, official receipts, payment allocations, advance credit balances, ledger posting, and webhook handlers are fully verified in software.

### 4. Commercial SMS / WhatsApp Telephony Gateways (`REQ-52`)
- **Blocker Type:** Paid Cloud API Subscription.
- **Requirement:** Paid messaging credits for Twilio, Gupshup, or MSG91.
- **Software State:** Complete. Outbox event table, message templating, and reliable sweep dispatcher are fully verified in software.

---

## 3. Owner Decisions (`DEFERRED_BY_OWNER`)

### 1. Standalone Parent Android App (`REQ-53`)
- **Owner Directive:** Deferred to post-pilot release cycle.
- **Alternative in Place:** Responsive **Parent Web Portal** (`parent-portal`) is 100% operational with dynamic modular navigation, responsive mobile UI, attendance views, fee invoice history, and 5-second live bus tracking.

