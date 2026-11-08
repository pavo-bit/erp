# SSVM ERP Platform — Remaining Blockers & Owner Decisions Register
**Document Version:** 1.0.0  
**Status:** Active  
**Component:** External Integrations, Physical Hardware & Owner Decisions

---

## 1. Purpose

This register enumerates all external dependencies, commercial subscriptions, physical hardware requirements, and owner policy decisions that remain outside local software execution boundaries.

---

## 2. External Blockers Register (`BLOCKED_EXTERNAL`)

| Blocker ID | Dependency | Description | Local Workaround / Status | Decision Required from Owner |
|:---:|:---|:---|:---|:---|
| **BLK-01** | **Physical Biometric Terminal Hardware** | Standalone fingerprint scanner terminals (ZKTeco, eSSL). | Marked `BLOCKED_EXTERNAL`. Complete software ingestion contract, device authentication, and idempotency deduplication verified via simulated punches. | Select hardware vendor (ZKTeco ADMS vs eSSL push) and supply test terminal unit for physical sync verification. |
| **BLK-02** | **Commercial SMS Gateway** | Provider for transactional SMS (Twilio, MSG91, Gupshup) for parent OTP and attendance alerts. | Local development uses logger mock and in-app notifications. | Contract with commercial SMS vendor and provide production API credentials. |
| **BLK-03** | **Production Cloud Storage (AWS S3 / GCP Storage)** | Object store for student photos, staff documents, and generated PDF receipts. | Local disk storage provider (`uploads/`) configured with MIME validation. | Provision S3/GCS bucket and IAM credentials or approve self-hosted MinIO instance. |
| **BLK-04** | **Production Payment Gateway Credentials** | Live Razorpay / Stripe merchant keys for processing parent credit card / UPI fee payments. | Razorpay test sandbox keys and simulated order flows verified. | Complete merchant KYC and provide live production gateway keys and webhook secrets. |
| **BLK-05** | **Native Android Parent Application** | Standalone React Native / Flutter Android APK for parents. | Deferred per project specifications; Parent Web Portal is fully mobile-responsive and operational. | Decide timeline for native mobile wrapper versus progressive web app (PWA) deployment. |

---

## 3. Owner Policy Decisions

1. **Default Module Subscription Tiers:**
   - Owner must define the commercial pricing tiers (e.g., *Basic Academic*, *Standard School*, *Enterprise Campus*) mapping to the 10 Central Module Registry definitions.
2. **Offline Receipt Stamp Customization:**
   - Review and approve the official PDF receipt layout, legal school registration number, and cashier signature requirements.
3. **Biometric Data Retention Policy:**
   - Affirm the platform's privacy policy mandating that biometric minutiae stay 100% on terminal hardware (`ON_DEVICE_TEMPLATE_MATCHING`).

