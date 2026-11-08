# Operational Runbook: Security Incident Response & Forensics
**Document ID:** RB-SEC-004  
**Target Architecture:** Multi-Tenant SaaS with Row-Level Security (RLS) & DPDP Compliance  
**Audience:** Application Security Engineers, Security Operations, Incident Commanders  
**Classification:** Restricted / Confidential  

---

## 1. Overview & Threat Vectors
The multi-school ERP processes sensitive student, financial, parental, and transport records. This runbook establishes immediate containment, forensics, and remediation protocols for:
1. **Cross-Tenant Data Leakage or RLS Violations.**
2. **DPDP Compliance Breaches & PII Exposure.**
3. **Compromised Transport IoT Hardware Tokens (`X-Device-Token`).**
4. **Brute Force / Credential Stuffing / Session Hijacking.**

---

## 2. Emergency Containment Playbooks

### Threat Vector 1: Potential Cross-Tenant Boundary Violation
**Indicator:** Postgres error `42501 (new row violates row-level security policy)` in application logs, or an unexpected tenant ID in an API payload.

**Containment Steps:**
1. **Quarantine Tenant:** Immediately freeze tenant operations from Super Admin:
   ```bash
   curl -X PATCH http://localhost:5000/api/v1/super-admin/schools/<compromised-school-id> \
     -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"status": "SUSPENDED"}'
   ```
2. **Execute RLS Verification Audit:**
   Verify forced RLS status on all 177 tenant tables:
   ```bash
   docker exec ssvm-database psql -U postgres -d ssvm_platform -c "
     SELECT relname, relrowsecurity, relforcerowsecurity 
     FROM pg_class 
     WHERE relnamespace = 'public'::regnamespace 
       AND relkind = 'r' 
       AND (relrowsecurity = false OR relforcerowsecurity = false);
   "
   ```
   *Expect 0 rows returned for tenant tables.*

---

### Threat Vector 2: Compromised Vehicle IoT Hardware Device Token
**Indicator:** Anomalous GPS telemetry reported from distant coordinates, extreme speed bounds (>180 km/h), or erratic timestamps.

**Containment Steps:**
1. **Identify Compromised Vehicle:**
   Query vehicle details:
   ```sql
   SELECT id, "schoolId", "registrationNumber", "updatedAt" 
   FROM transport_vehicles 
   WHERE id = '<vehicle-id>';
   ```
2. **Invalidate Hardware Secret:**
   Hardware tokens use HMAC SHA-256 derived from `JWT_SECRET` and `schoolId:vehicleId`.
   - To immediately revoke access for a single vehicle, change the vehicle's `registrationNumber` or temporary deactivate the vehicle status:
     ```sql
     UPDATE transport_vehicles SET status = 'MAINTENANCE' WHERE id = '<vehicle-id>';
     ```
   - Flush the telemetry cache in Redis:
     ```bash
     docker exec ssvm-redis redis-cli del "transport:vehicle:<vehicle-id>:telemetry"
     ```
3. **Re-key IoT Device Hardware Token:**
   Generate a new hardware token via backend utility and flash it onto the physical bus tracking unit.

---

### Threat Vector 3: Credential Stuffing / Session Hijacking
**Indicator:** High volume of failed login attempts on `/api/v1/auth/login` across different admission/email identifiers.

**Containment Steps:**
1. **Trigger Global Rate Limiting:**
   Inspect and tighten Redis-backed rate limiter keys:
   ```bash
   docker exec ssvm-redis redis-cli keys "rl:auth:*"
   ```
2. **Invalidate Active User Sessions:**
   To force immediate re-authentication across all active tokens:
   - Clear session tokens in Redis:
     ```bash
     docker exec ssvm-redis redis-cli eval "return redis.call('del', unpack(redis.call('keys', 'auth:session:*')))" 0
     ```
   - If token signing key itself is compromised, rotate `JWT_SECRET` or Asymmetric Private/Public Key pair in `.env` and restart `ssvm-backend`.

---

## 3. Forensic Investigation Queries

### Query 1: Audit Log Examination for Targeted Tenant
```sql
SELECT "createdAt", level, module, message, "userId", metadata 
FROM system_logs 
WHERE "schoolId" = '<target-school-id>' 
  AND "createdAt" >= NOW() - INTERVAL '24 hours' 
ORDER BY "createdAt" DESC;
```

### Query 2: Inspecting Super Admin Impersonation Audit Trail
```sql
SELECT "createdAt", level, module, message, metadata 
FROM system_logs 
WHERE message LIKE '%impersonation%' 
   OR message LIKE '%trusted_purpose%' 
ORDER BY "createdAt" DESC LIMIT 50;
```

---

## 4. DPDP Statutory Incident Reporting
Under the Digital Personal Data Protection (DPDP) Act, personal data breaches impacting student or guardian information must be notified within statutory timelines.

- **Incident Record:** Maintain full forensic export of `system_logs` and affected database LSNs.
- **Root-Cause Classification:** Record whether breach occurred via endpoint authentication, configuration error, or hardware compromise.
- **Remediation Sign-off:** Super Admin and Chief Information Security Officer sign-off prior to unfreezing suspended school accounts.

