# SSVM Incident Response Runbooks

## 1. Database Outage

### Severity: P1 (Critical)
### On-Call: Backend Lead + DevOps

**Detection:** Health endpoint returns `db: disconnected`, Prometheus alert `ssvm_db_health == 0`

**Steps:**
1. Check PgBouncer status: `docker exec pgbouncer pgbouncer -R`
2. Check PostgreSQL logs: `docker logs ssvm-postgres --tail 100`
3. Check disk space: `docker exec ssvm-postgres df -h /var/lib/postgresql/data`
4. Check connection count: `SELECT count(*) FROM pg_stat_activity;`
5. If disk full → emergency cleanup: `VACUUM FULL;` on largest tables
6. If connections exhausted → restart PgBouncer: `docker restart pgbouncer`
7. If PostgreSQL crashed → restore from latest backup: `scripts/restore-backup.sh`

**Escalation:** If not resolved in 15 minutes → Page CTO

---

## 2. Payment Gateway Failure

### Severity: P1 (Critical)
### On-Call: Backend Lead + Finance Team

**Detection:** `payment_total{status="FAILED"}` spike, webhook errors in SystemLog

**Steps:**
1. Check Razorpay status page: https://status.razorpay.com
2. Activate kill switch: `FeatureService.emergencyKillSwitch('ONLINE_PAYMENTS', userId, reason)`
3. Notify parents/schools via SMS: "Online payments temporarily unavailable"
4. Enable offline payment mode in admin dashboard
5. Monitor webhook queue for pending retries: BullBoard at `/admin/queues`
6. When resolved → restore feature: `FeatureService.restoreFeature('ONLINE_PAYMENTS', userId)`
7. Run reconciliation: `ReconciliationService.runDailyReconciliation(schoolId)`

---

## 3. Redis Outage

### Severity: P2 (High)
### On-Call: Backend Lead

**Detection:** Health endpoint returns `redis: disconnected`, rate limiters fall back to memory

**Impact:** Rate limiting degrades to per-process memory (not shared), caching disabled, BullMQ jobs paused

**Steps:**
1. Check Redis status: `docker exec ssvm-redis redis-cli ping`
2. Check memory usage: `docker exec ssvm-redis redis-cli info memory`
3. If memory full → flush non-critical keys: `redis-cli --scan --pattern "cache:*" | xargs redis-cli del`
4. If Redis crashed → restart: `docker restart ssvm-redis`
5. If data corruption → restart with empty state (application auto-rebuilds caches)
6. Verify BullMQ queues resume processing: check `/admin/queues`

**Note:** Application is designed to fail-open — Redis outage does NOT crash the server.

---

## 4. Security Breach / Data Leak

### Severity: P0 (Emergency)
### On-Call: CTO + Backend Lead + Legal

**Detection:** CRITICAL security events in SystemLog, unusual API patterns, user reports

**Steps:**
1. **IMMEDIATE:** Block all external traffic: `nginx -s stop` or Cloudflare "Under Attack" mode
2. **ASSESS:** Check SystemLog for breach scope: `SELECT * FROM system_logs WHERE level = 'FATAL' ORDER BY "createdAt" DESC LIMIT 50;`
3. **CONTAIN:** Revoke all refresh tokens: `UPDATE refresh_tokens SET "isRevoked" = true, "revokedAt" = NOW();`
4. **CONTAIN:** Rotate all JWT signing keys (requires restart)
5. **INVESTIGATE:** Check audit log chain integrity: `AuditHashChainService.verifyChain(schoolId)`
6. **NOTIFY:** If personal data affected → DPDPA breach notification within 72 hours
7. **REMEDIATE:** Fix vulnerability, deploy patch, restore service
8. **POST-MORTEM:** Conduct blameless post-mortem within 48 hours

---

## 5. Deployment Failure / Rollback

### Severity: P2 (High)
### On-Call: DevOps + Backend Lead

**Steps:**
1. Check deployment logs: `docker compose logs --tail 100 ssvm-backend`
2. If migration failed → rollback: `prisma migrate resolve --rolled-back <migration_name>`
3. If application crash → rollback to previous image: `docker compose up -d --force-recreate ssvm-backend`
4. If blue-green deployment → switch back to previous slot
5. Verify health endpoint: `curl http://localhost:5000/health`
6. Run smoke tests: `npm run test:api`

---

## 6. High Latency / Performance Degradation

### Severity: P3 (Medium)
### On-Call: Backend Lead

**Detection:** `http_request_duration_ms` P95 > 2s, Prometheus alert

**Steps:**
1. Check Prometheus dashboard for latency patterns
2. Identify slow queries: `SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;`
3. Check for missing indexes: Run `EXPLAIN ANALYZE` on slow queries
4. Check connection pool utilization: `SELECT count(*) FROM pg_stat_activity WHERE state = 'active';`
5. Check for N+1 queries in recent code changes
6. If memory pressure → restart with increased heap: `NODE_OPTIONS='--max-old-space-size=2048'`
7. If query bottleneck → add index or optimize query pattern
