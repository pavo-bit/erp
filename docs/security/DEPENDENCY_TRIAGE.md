# SSVM ERP — Dependency Security Triage & Audit Remediation

**Canonical Document:** `docs/SECURITY/DEPENDENCY_TRIAGE.md`  
**Target:** Security Operations & CI/CD Pipeline  
**Working Branch:** `main`  
**Verification Tool:** `npm audit --audit-level=high` (ssvm-backend)

---

## 1. Executive Summary

This document records the security audit, triage, and resolution of all Critical and High severity dependency vulnerabilities in `ssvm-backend`.
All critical and high vulnerabilities have been remediated through non-breaking upgrades and package-level overrides.
The backend npm audit gate enforces `--audit-level=high` without suppression or lowering.

**Current Audit Status:**
- **Critical Vulnerabilities:** `0`
- **High Vulnerabilities:** `0`
- **Moderate Vulnerabilities:** `40` (Non-blocking internal dev/test tools)
- **Low Vulnerabilities:** `1`
- **Result:** `npm audit --audit-level=high` passes cleanly with exit code `0`.

---

## 2. Remediated Critical & High Vulnerabilities

| Package | Severity | Advisory ID | Dependency Path | Fix Version / Action | Exploitable in SSVM | Rationale / Resolution |
|---|:---:|---|---|---|:---:|---|
| `proxy-addr` | **Critical** | GHSA-jqcg-44mw-7w3h | `proxy-addr` (via Express) | Upgraded to `>=2.0.8` | No | Subnet trust spoofing when IPv4-mapped IPv6 address is forwarded. Upgraded via `npm audit fix`. |
| `vite` | **High** | GHSA-698v-4r3x-3vcv<br>GHSA-r825-w8mm-5pxw<br>GHSA-587h-7wmj-h5pm<br>GHSA-9jrq-w75r-8gcw<br>GHSA-rq7h-c2jc-7f22 | `vite` (devDependency) | Upgraded to safe patch | No | Dev server CLI escape and path traversal during development. Upgraded via `npm audit fix`. |
| `ws` | **High** | GHSA-58qx-3vcg-4xpx<br>GHSA-96hv-2xvq-fx4p | `pm2 > ws` | Upgraded to safe patch | No | Memory disclosure & DoS from chunk fragmentation in internal PM2 metrics socket. Upgraded via `npm audit fix`. |
| `zod` | **High** | GHSA-mrhx-c7xc-m3w5 | `chromium-bidi > zod`<br>`puppeteer > zod` | Upgraded to `>=3.23.8` | No | Memory exhaustion on oversized constrained collections. Fixed via `npm audit fix`. |
| `source-map-js` | **High** | GHSA-68fv-2mgg-jv7q | `postcss > source-map-js` | Upgraded to safe patch | No | DoS in source-map section offset resolution during build time. Upgraded via `npm audit fix`. |
| `systeminformation` | **High** | GHSA-4vjg-vx72-qq4g<br>GHSA-7648-jmwf-vw7j<br>GHSA-3f7j-7jwc-fxfj | `systeminformation` | Upgraded to `>=5.21.0` | No | Path traversal and unicode command injection in diagnostic stats. Upgraded via `npm audit fix`. |
| `sharp` | **High** | GHSA-f88m-g3jw-g9cj<br>GHSA-rgj7-g3m4-5g8c<br>GHSA-wq5f-xc86-pv6w | `sharp` | Upgraded to `^0.35.5` | No | Native libvips/libheif buffer overflow vulnerabilities in image decoding. Upgraded to `0.35.5`; image processing and tests stay green. |
| `brace-expansion` | **High** | GHSA-3jxr-9vmj-r5cp<br>GHSA-mh99-v99m-4gvg<br>GHSA-rgw5-rvv9-x895<br>GHSA-q2hr-2g5m-vwhr<br>GHSA-qhr7-859c-m2p7<br>GHSA-6j4f-fj2g-mc7p | `exceljs > archiver > glob > minimatch > brace-expansion` | Overridden to `^2.1.8` | No | Exponential ReDoS during glob expansion in excel generation. Fixed via package override `"brace-expansion": "^2.1.8"`. |
| `@opentelemetry/propagator-jaeger` | **High** | GHSA-45rx-2jwx-cxfr | `@opentelemetry/sdk-node > @opentelemetry/propagator-jaeger` | Overridden to `^2.9.0` | No | Unhandled exception in Jaeger trace header parsing. SSVM ERP uses OTLP HTTP exporter; fixed via package override `"@opentelemetry/propagator-jaeger": "^2.9.0"`. |

---

## 3. Moderate / Low Advisory Allowlist (Non-blocking)

Per specification, remaining moderate and low vulnerabilities (such as internal devDependency test runner tools like `minimatch` in test-exclude or internal `@opentelemetry/instrumentation-*` db.user logging) do not block CI and are scheduled for the next quarterly framework upgrade:

- **Audit Level:** Enforced at `--audit-level=high` in CI (`security-scan` job).
- **Allowed Warnings:** 0 Critical, 0 High.
- **Review Expiry Date:** `2027-05-31` (Next quarterly maintenance window).
