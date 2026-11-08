# Operational Runbook: Environment Configuration & Deployment Engineering
**Document ID:** RB-DEP-005  
**Target Environments:** Development, Test, Pilot, Production  
**Audience:** DevOps Engineers, Release Engineers, SREs  
**Classification:** Operational Procedure  

---

## 1. Multi-Profile Environment Matrix

| Parameter | Development | Test | Pilot (Single School) | Production (Multi-Tenant SaaS) |
| :--- | :--- | :--- | :--- | :--- |
| **`NODE_ENV`** | `development` | `test` | `production` | `production` |
| **Profile Flag** | `--profile=development` | `--profile=test` | `--profile=pilot` | `--profile=production` |
| **Database Pool** | Single connection URL | Dedicated test DB (`ssvm_test`) | Separate Auth & Trusted roles | PgBouncer pooling + separate Auth & Trusted roles |
| **Token Signing** | HS256 (32+ char secret) | Fixed test keys | RS256 / EdDSA or 64-char HS256 | RS256 Asymmetric PEM Keypair required |
| **CORS Origins** | `http://localhost:*` | Any / disabled | `https://pilot.school.edu` | Specific white-listed tenant domains (no wildcard `*`) |
| **Redis** | Optional (memory fallback) | Required (`localhost:6379/1`) | Dedicated Redis instance | High-availability Redis Cluster |
| **DPDP Key** | Optional | Optional | 64-character Hex Key (AES-256-GCM) | Mandatory 64-character Hex Key |

---

## 2. Pre-Flight Environment Validation

Before starting containers or promoting an image to staging/pilot/production, run the multi-profile environment validator:

```bash
# Validate local development
node scripts/validate-env.js --profile=development

# Validate CI / Test environment
node scripts/validate-env.js --profile=test

# Validate Pilot deployment
node scripts/validate-env.js --profile=pilot --env-file=/path/to/.env.pilot

# Validate Production deployment (Fails closed on any security risk)
node scripts/validate-env.js --profile=production --env-file=/path/to/.env.production
```

The script exits with code `0` on success and code `1` on failure, preventing misconfigured services from booting.

---

## 3. Cryptographic Secret Generation Guide

Never use placeholder or predictable secrets. Use standard Node.js crypto primitives to generate cryptographically random secrets:

### 3.1 DPDP Field Encryption Key (AES-256-GCM - exactly 64 hex characters)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.2 High-Entropy JWT Secret (HS256 fallback - 64 hex characters)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.3 Asymmetric RSA Keypair (RS256 - recommended for production)
```bash
# Generate 2048-bit Private Key
openssl genrsa -out access_private.pem 2048

# Extract Public Key
openssl rsa -in access_private.pem -pubout -out access_public.pem
```
Encode into `.env` escaping newlines:
```bash
node -e "console.log(JSON.stringify(require('fs').readFileSync('access_private.pem', 'utf8')))"
```

---

## 4. Port Allocation & Network Architecture

| Container Name | Internal Port | Host Port Binding | Protocol | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ssvm-backend` | 5000 | `0.0.0.0:5000` | HTTP | Express Core API & SSE |
| `ssvm-erp-admin` | 3000 | `0.0.0.0:3000` | HTTP | Next.js ERP Admin & Super Admin |
| `ssvm-database` | 5432 | `0.0.0.0:5433` | TCP | PostgreSQL 16 Primary Database |
| `ssvm-pgbouncer` | 5432 | `0.0.0.0:6432` | TCP | PgBouncer Connection Pooler |
| `ssvm-redis` | 6379 | `0.0.0.0:6379` | TCP | Redis Cache & BullMQ Queue |
| `ssvm-prometheus` | 9090 | `0.0.0.0:9090` | HTTP | Prometheus Metrics Scraper |
| `ssvm-grafana` | 3000 | `0.0.0.0:3004` | HTTP | Grafana Visual Dashboards |
| `ssvm-alertmanager` | 9093 | `0.0.0.0:9093` | HTTP | Alertmanager Notification Router |

---

## 5. Deployment Step-by-Step Procedure

1. **Step 1:** Prepare host environment and verify Docker engine status.
2. **Step 2:** Place verified `.env` file in root directory.
3. **Step 3:** Run `node scripts/validate-env.js --profile=pilot` (or `--profile=production`).
4. **Step 4:** Build and start containers:
   ```bash
   docker compose build
   docker compose up -d
   ```
5. **Step 5:** Verify container health:
   ```bash
   docker compose ps
   curl -f http://localhost:5000/api/v1/health/readiness
   ```
6. **Step 6:** Run smoke tests to confirm end-to-end functionality.

