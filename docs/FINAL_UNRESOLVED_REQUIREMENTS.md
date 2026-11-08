# SSVM ERP Platform — Final Unresolved Requirements & Blocker Register
**Document Version:** 1.0.0  
**Status:** Active  
**Component:** External Dependencies, Physical Hardware & Operational Readiness

---

## 1. Executive Summary

This register provides a complete and transparent accounting of all requirements, external blockers, physical hardware dependencies, and operational prerequisites that remain unresolved for public production deployment.

None of these items prevent the execution of a **Controlled Multi-School Pilot**, as all software logic, simulated interfaces, and safety boundaries are 100% operational in software.

---

## 2. Unresolved Requirements & External Blockers

| Blocker ID | Requirement / Dependency | Classification | Root Cause / Rationale | Impact on Pilot | Next Action for Production |
|:---:|:---|:---:|:---|:---|:---|
| **BLK-01** | **Physical Biometric Terminal Hardware** | `BLOCKED_EXTERNAL` | Zero-investment constraint; physical standalone scanner hardware (ZKTeco/eSSL) was not purchased or attached. | None. Software ingestion API, badge mapping, idempotency, and shift rules are fully tested via simulated punch contracts. | Procure 1-2 evaluation terminals and point ADMS cloud push URL to the ERP sync endpoint. |
| **BLK-02** | **Physical Vehicle GPS Trackers** | `BLOCKED_EXTERNAL` | Zero-investment constraint; physical AIS-140 GPS hardware units not wired to physical vehicles. | None. Telemetry gateway, HMAC-SHA256 tokens, bound validation, and live Parent map tracking are fully verified via software simulator. | Flash HMAC tokens into physical tracker firmware for school bus fleet. |
| **BLK-03** | **Commercial SMS Gateway** | `BLOCKED_EXTERNAL` | Commercial paid account with Twilio / MSG91 not provisioned. | None. In-app notifications and logger mocks handle OTP and notification routing locally. | Procure commercial SMS account, complete DLT template registration, and configure API credentials. |
| **BLK-04** | **Production Cloud Storage (S3/GCS)** | `BLOCKED_EXTERNAL` | Paid cloud object storage bucket not provisioned. | None. Local disk storage provider (`uploads/`) with strict MIME validation is active. | Provision AWS S3 or Cloudflare R2 bucket and set bucket credentials in `.env.production`. |
| **BLK-05** | **Live Merchant Payment Keys** | `BLOCKED_EXTERNAL` | Live Razorpay merchant KYC credentials not provisioned. | None. Offline cash counter collection, PDF receipts, advance credits, and test sandbox payments are fully verified. | Complete Razorpay business KYC and provide live production API keys and webhook secrets. |
| **BLK-06** | **Native Android Parent Application** | `DEFERRED_BY_OWNER`| Standalone native Android APK was explicitly deferred per project specifications. | None. Parent Web Portal is fully mobile-responsive and accessible on all smartphone browsers. | Build React Native / Flutter mobile wrapper if native app store presence is required. |

---

## 3. Readiness Stratification

```
[Level 1: Technical & Software Architecture]  ──>  100% Complete & Verified (Zero TS Errors)
[Level 2: Controlled Multi-School Pilot]      ──>  100% Ready (Deployable Today on Local / VPS Docker)
[Level 3: Public Commercial Production]       ──>  Awaiting External Cloud Credentials (BLK-01 to BLK-05)
```

---

## 4. Owner Decisions Required

1. **Biometric Terminal Selection:** Choose between ZKTeco ADMS push protocol or eSSL web service integration for physical hardware procurement.
2. **SMS vs Push Policy:** Decide whether to fund transactional SMS for daily attendance notifications or rely on Parent Web in-app alerts and email.
3. **Storage Strategy:** Choose between managed cloud object storage (AWS S3) or self-hosted S3-compatible MinIO for student documents and receipts.

