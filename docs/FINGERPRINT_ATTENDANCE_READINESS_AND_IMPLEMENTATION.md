# SSVM ERP Platform — Biometric Fingerprint Attendance Readiness & Implementation
**Document Version:** 1.0.0  
**Status:** Software Foundation Complete & Hardware Contract Standardized  
**Component:** Biometric Attendance Ingestion, Idempotency, On-Device Matching & HR Linkage

---

## 1. Executive Summary & Hardware Status

The Biometric Fingerprint Attendance software foundation provides a secure, privacy-preserving ingestion pipeline for biometric staff attendance terminals (e.g., ZKTeco, eSSL, Realtime).

> [!IMPORTANT]
> **Hardware Boundary & Blocker Disclosure:**  
> In accordance with zero-investment local-first principles, physical standalone fingerprint scanning terminals are marked **`BLOCKED_EXTERNAL`**.  
> The complete software ingestion contract, device token authentication, idempotency deduplication, on-device template privacy rules, and Teacher Attendance linkage are fully implemented and verified via automated API simulation suites.

---

## 2. Privacy-Preserving Architecture (On-Device Matching)

To comply with data privacy standards (such as GDPR, India DPDP Act), raw biometric fingerprint images or minutiae templates are **never transmitted, exported, or stored** in the central cloud database:

1. **Local Enrollment:** Fingerprints are enrolled locally onto physical terminal hardware.
2. **On-Device 1:N Matching:** When staff punch in/out, matching occurs strictly on the terminal's internal cryptographic secure element.
3. **Punches Ingestion Only:** Only the anonymized event metadata is transmitted to the ERP:
   - Terminal Device ID (`deviceId`)
   - Employee ID (`employeeId`)
   - Event Timestamp (`timestamp`)
   - Event Type (`CHECK_IN` or `CHECK_OUT`)
   - Verification Certification (`FINGERPRINT_ON_DEVICE`)

---

## 3. Software Contract & Ingestion API

### Endpoint: `POST /api/v1/attendance/biometric/event` (and `/sync`)

#### Request Header
- `X-Device-Token`: Device HMAC signature or Staff JWT.
- `X-School-Id`: Tenant ID.

#### Request Payload
```json
{
  "deviceId": "ZKT-ECO-TERMINAL-01",
  "schoolId": "school_cuid_123",
  "events": [
    {
      "eventId": "evt-550e8400-e29b-41d4-a716-446655440000",
      "employeeId": "EMP-1001",
      "timestamp": "2026-11-08T08:45:00.000Z",
      "eventType": "CHECK_IN",
      "verificationMethod": "FINGERPRINT_ON_DEVICE"
    }
  ]
}
```

#### Idempotency & Deduplication
- Every punch includes a unique `eventId` UUID.
- Processed events are recorded in Redis (`bio:evt:<eventId>`) with a 7-day TTL and an in-memory set fallback.
- If a terminal retries due to intermittent Wi-Fi connectivity, the ERP skips duplicate creation and returns:
  `{ "eventId": "...", "status": "DUPLICATE_IGNORED" }`.

#### HR Linkage & Shift Rules
- Resolves teacher records by `employeeId` within the calling school.
- Normalizes date to midnight UTC.
- Evaluates check-in time against the school shift cutoff (e.g. arrivals after 09:15 are marked `LATE`, otherwise `PRESENT`).
- Upserts into `TeacherAttendance` with audit remarks recording punch time, device ID, and verification method.

---

## 4. Hardware Readiness & Status Verification

### Endpoint: `GET /api/v1/attendance/biometric/status`

```json
{
  "success": true,
  "data": {
    "module": "BIOMETRIC_ATTENDANCE",
    "status": "ENABLED",
    "hardwareIntegrationStatus": "BLOCKED_EXTERNAL",
    "externalBlockerReason": "Physical ZKTeco / eSSL biometric scanner hardware not physically attached; software contract fully simulated and ready for terminal sync",
    "supportedProtocols": ["REST_JSON_PUSH", "REST_JSON_PULL", "SOAP_ZKTECO_ADMS"],
    "privacyCompliance": "ON_DEVICE_TEMPLATE_MATCHING"
  }
}
```

---

## 5. Verification Test Matrix

| Verification Aspect | Test Action | Expected Result | Status |
|:---|:---|:---|:---:|
| **Device Authentication** | Ingest punch with valid `X-Device-Token` | Accepted (HTTP 200) | **PASS** |
| **Invalid Device Token** | Ingest punch with invalid token | Rejected (HTTP 401) | **PASS** |
| **Attendance Creation** | First punch submission | `TeacherAttendance` upserted with `PRESENT`/`LATE` | **PASS** |
| **Idempotency Deduplication** | Re-submit identical event ID | Returned `DUPLICATE_IGNORED`, no duplicate records | **PASS** |
| **Modular Entitlement** | Call from school with Biometrics disabled | Rejected (HTTP 403 `MODULE_DISABLED`) | **PASS** |
| **Readiness Probe** | Call `/biometric/status` | Reports `BLOCKED_EXTERNAL` and on-device privacy | **PASS** |

