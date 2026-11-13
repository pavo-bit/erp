# SSVM ERP — Deployment & Operations Specification

**Canonical Document:** `docs/DEPLOYMENT_AND_OPERATIONS.md`  
**Working Branch:** `lane/d-portals`  
**Classification:** Infrastructure, Orchestration, Observability & Disaster Recovery

---

## 1. Containerized Infrastructure & Topology

The platform is orchestrated via Docker Compose, provisioning 12 container services:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DOCKER COMPOSE TOPOLOGY                                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Frontend Applications (Next.js 16 / React 19):                                        │
│  - ssvm-erp-admin        (:3000 -> 3000 / :3005)                                       │
│  - ssvm-super-admin      (:3001 -> 3001)                                               │
│  - ssvm-teacher-portal   (:3002 -> 3002)                                               │
│  - ssvm-student-portal   (:3003 -> 3000)                                               │
│  - ssvm-parent-portal    (:3006 -> 3006)                                               │
│  - ssvm-payment-portal   (:3007 -> 3007)                                               │
│  - ssvm-saas-frontend    (:3008 -> 3008)                                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Backend Core & Processing:                                                            │
│  - ssvm-backend          (:5000 -> 5000) - Express.js REST API & BullMQ workers        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Data Layer & Connection Pooling:                                                      │
│  - ssvm-database         (:5433 -> 5432) - PostgreSQL 16 Alpine with RLS               │
│  - ssvm-pgbouncer        (:6432 -> 5432) - Transaction Connection Pooler               │
│  - ssvm-redis            (:6379 -> 6379) - Redis 7 Alpine In-Memory Cache & Queues     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Observability & Telemetry:                                                            │
│  - ssvm-prometheus       (:9090 -> 9090) - Metrics Scraper                             │
│  - ssvm-grafana          (:3004 -> 3000) - Monitoring Dashboards                       │
│  - ssvm-alertmanager     (:9093 -> 9093) - Alerting Rules & Notifications              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Health Probes & Monitoring

The backend exposes five dedicated diagnostic probes:

| Endpoint | Purpose | Checks Performed | Expected Response |
| :--- | :--- | :--- | :---: |
| `GET /api/health` | Fast L4 load-balancer probe | Server process responsiveness | `HTTP 200 { status: "ok" }` |
| `GET /api/v1/health/liveness` | Kubernetes/Docker liveness | Basic loopback health | `HTTP 200 { status: "healthy" }` |
| `GET /api/v1/health/readiness`| Traffic routing readiness | Validates PostgreSQL and Redis connection pools | `HTTP 200 { status: "ready", db: "connected", redis: "connected" }` |
| `GET /api/v1/health/deep` | Deep system diagnostics | Disk space, memory usage, BullMQ queue backlog | `HTTP 200 { status: "ok", memory: { ... }, storage: { ... } }` |
| `GET /api/v1/health/database-identity` | Security role verification | Returns connected Postgres role, superuser, and active RLS policy count | `HTTP 200 { currentUser: "ssvm_app", isSuperuser: false, policyCount: 188 }` |

---

## 3. Backup, Restore & Disaster Recovery

### 3.1 Automated PostgreSQL Backup
Backups are performed using `pg_dump` targeting the platform database:
```bash
# Automated cron backup command
docker exec ssvm-database pg_dump -U postgres -F c ssvm_platform > /var/backups/ssvm_$(date +%Y%m%d_%H%M%S).dump
```

### 3.2 Recovery & Restore Procedure
In the event of database failure or corrupted state:
```bash
# 1. Stop backend traffic
docker compose stop ssvm-backend

# 2. Restore database from dump
docker exec -i ssvm-database pg_restore -U postgres -d ssvm_platform --clean /var/backups/<backup-file>.dump

# 3. Verify schema migrations
npx --prefix ssvm-backend prisma migrate status

# 4. Restart backend
docker compose start ssvm-backend
```

---

## 4. Edge Layer & Cloudflare Configuration

Public lead-capture and registration endpoints are protected at the edge:
1. **Cloudflare Turnstile:** Invisible bot detection enabled on `POST /api/v1/admissions/apply` and `POST /api/v1/auth/alumni/register`.
2. **WAF Rate Limiting:**
   - Admissions Apply: 10 requests / hour / IP.
   - Student/Staff Login: 5 requests / minute / IP.
3. **Honeypot Protection:** Public forms include hidden field `website_hp`. If populated by bot autofill, the backend returns silent success (`HTTP 201`) without database persistence.

---

## 5. Incident Response Runbooks

### Runbook 1: PostgreSQL Connection Pool Exhaustion (Severity: P1)
1. **Detection:** Health endpoint returns `503`, Prometheus alert `ssvm_db_connections_high > 90%`.
2. **Immediate Remediation:**
   ```bash
   # Check active connections
   docker exec ssvm-database psql -U postgres -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
   # Restart PgBouncer pooler
   docker compose restart ssvm-pgbouncer
   ```
3. **Verification:** Inspect `/api/v1/health/readiness` returning `HTTP 200`.

### Runbook 2: Redis Worker Queue Backlog (Severity: P2)
1. **Detection:** Prometheus alert `bullmq_queue_backlog > 1000`.
2. **Immediate Remediation:**
   ```bash
   # Inspect Redis memory and connection stats
   docker exec ssvm-redis redis-cli info memory
   # Trigger queue sweep manually
   curl -X POST http://localhost:5000/api/v1/communications/outbox/sweep -H "Authorization: Bearer <ADMIN_TOKEN>"
   ```

### Runbook 3: Razorpay Webhook Processing Outage (Severity: P1)
1. **Detection:** Sharp rise in SHFI diagnostic incidents for module `PAYMENTS`.
2. **Remediation:**
   - Webhook retries are automatically cached in `DeadLetterQueue`.
   - Once payment provider network recovers, trigger replay:
     ```bash
     npm --prefix ssvm-backend run queue:replay-failed-webhooks
     ```

