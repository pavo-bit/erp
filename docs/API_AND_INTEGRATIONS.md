# SSVM ERP — API Architecture & Integrations Specification

**Canonical Document:** `docs/API_AND_INTEGRATIONS.md`  
**Working Branch:** `lane/d-portals`  
**Classification:** Complete API Contracts, Route Matrix & External Integrations

---

## 1. API Architecture & Conventions

### 1.1 Organization & Versioning
The backend API exposes **428 endpoint declarations across 36 route files** mounted in `ssvm-backend/src/app.ts`:
- Primary prefix: `/api/v1/`
- Legacy alias prefix: `/api/` (maintained for backward compatibility with frontend clients)
- Content-Type: `application/json` (with standard `multipart/form-data` for file uploads)

### 1.2 Unified Response Envelope
All API endpoints adhere to standard response envelopes:
```typescript
// Standard Success Response (HTTP 200 / 201)
{
  "success": true,
  "data": { ... },
  "message"?: "Optional user-facing notification"
}

// Standard Error Response (HTTP 4xx / 5xx)
{
  "success": false,
  "error": "Short human-readable error description",
  "details"?: { ... } // Optional validation field errors
}
```

### 1.3 Pagination & Sorting
Standard query parameters: `?page=1&limit=20&sortBy=createdAt&sortOrder=desc&search=term`.
```typescript
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 150,
    "totalPages": 8
  }
}
```

---

## 2. API Security Tiers & Route Matrix Summary

All 428 endpoints are classified into five security tiers:

| Tier | Name | Endpoints | Security Enforcement & Middleware |
| :---: | :--- | :---: | :--- |
| **Tier 1** | **Session Authenticated** | **400** | `authenticate` + `requireSchoolAccess()` + `requireRole(...)` + `requireModule(...)`. Validates session JWT, injects tenant context. |
| **Tier 2** | **Independent Machine Auth** | **3** | Dedicated API keys: `POST /api/v1/attendance/biometric/event` (`x-device-token`), `POST /api/v1/admin/transport/vehicles/:id/telemetry` (`x-vehicle-token`). |
| **Tier 3** | **Token / Challenge Lifecycle** | **5** | Session initiation and 2FA tokens: `POST /api/v1/auth/login`, `POST /api/v1/auth/verify-2fa`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`. |
| **Tier 4** | **Public Anonymous Ingestion** | **14** | Public lead capture: `POST /api/v1/admissions/apply`, `POST /api/v1/auth/alumni/register`, `POST /api/v1/payments/create-order` (public invoice query), `GET /api/v1/notices/public`. Protected by Cloudflare Turnstile bot verification and rate limiters. |
| **Tier 5** | **Internal Diagnostics** | **6** | Diagnostic probes: `GET /api/health`, `GET /api/v1/health/liveness`, `GET /api/v1/health/readiness`, `GET /api/v1/health/deep`, `GET /api/v1/health/database-identity`, `GET /metrics`. Restricted to cluster loopback or `SUPER_ADMIN`. |

---

## 3. External Integrations

### 3.1 Payment Gateway Integration (Razorpay)
- **Order Creation (`POST /api/v1/payments/create-order`):**
  - Accepts `invoiceId` or `studentId`.
  - Creates a Razorpay Order via `razorpay.orders.create({ amount: amountInPaise, currency: "INR", receipt: ... })`.
  - Returns `orderId`, `amount`, and `currency`.
- **Payment Verification (`POST /api/v1/payments/verify`):**
  - Accepts `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
  - Verifies HMAC-SHA256 signature using `RAZORPAY_KEY_SECRET`.
  - Updates invoice status to `PAID`, posts double-entry ledger entries.
- **Webhook Ingestion (`POST /api/v1/payments/webhook`):**
  - Validates `x-razorpay-signature` against raw request body using HMAC-SHA256.
  - Implements distributed Redis locking (`redlock:pay:<paymentId>`) for replay protection.
  - Gracefully handles `payment.captured` and `payment.failed`.

### 3.2 SMS & Communications Gateway Adapter
- **Architecture:** Interface-driven adapter pattern (`src/services/sms.service.ts`).
- **Active Adapters:**
  - `MockSmsProvider`: Active in development and automated testing; records sent SMS to memory and outbox table.
  - `Msg91Provider` / `Fast2SmsProvider`: Production cellular delivery with DLT template ID support.
- **Fail-Closed Fallback:** If SMS provider credentials are absent, notifications queue cleanly in `OutboxEvent` with status `QUEUED` without breaking student transactions.

### 3.3 File & Object Storage Adapter
- **Architecture:** Unified storage interface (`src/lib/storage.ts`).
- **Active Adapters:**
  - `LocalStorageAdapter`: Active in local environment; writes to secure local disk directories with path traversal protection.
  - `S3StorageAdapter`: AWS S3 / MinIO client using `@aws-sdk/client-s3` with presigned upload and download URLs.

### 3.4 IoT Biometric Hardware Integration
- **Endpoint:** `POST /api/v1/attendance/biometric/event`
- **Supported Verification Modes:** `FINGERPRINT_ON_DEVICE`, `RFID_CARD`, `FACE_ON_DEVICE`.
- **Deduplication:** Events checked against Redis key `bio:evt:<eventId>` with 24-hour TTL to prevent hardware resend duplicates.

### 3.5 IoT GPS Fleet Telemetry Integration
- **Endpoint:** `POST /api/v1/admin/transport/vehicles/:id/telemetry`
- **Payload:** Latitude, longitude, speed, fuel level, ignition status, timestamp.
- **Geofencing:** Evaluates vehicle distance against defined stop coordinates and triggers automated arrival notifications.

