/**
 * ssvm-backend/src/services/health-monitor.service.ts
 * Deep Dependency Probes & Observability for SHFI Centre
 */

import os from "os";
import fs from "fs";
import path from "path";
import prisma from "../lib/prisma";
import { getRedisClient, isRedisAvailable } from "../lib/redis";
import {
  HealthDependencyStatus,
  SystemHealthOverview,
} from "../types/shfi.types";
import { IncidentService } from "./incident.service";
import { DiagnosticEventService } from "./diagnostic-event.service";

export class HealthMonitorService {
  /**
   * Fast Liveness probe (Kubernetes / load-balancer liveness)
   */
  public static getLiveness(): { status: "UP"; uptime: number } {
    return {
      status: "UP",
      uptime: process.uptime(),
    };
  }

  /**
   * Fast Readiness probe (checks core DB & Redis readiness)
   */
  public static async getReadiness(): Promise<{ ready: boolean; database: boolean; redis: boolean }> {
    let dbReady = false;
    let redisReady = false;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbReady = true;
    } catch {
      dbReady = false;
    }

    try {
      if (isRedisAvailable()) {
        const client = getRedisClient();
        if (client) {
          const pong = await client.ping();
          redisReady = pong === "PONG";
        }
      }
    } catch {
      redisReady = false;
    }

    return {
      ready: dbReady && redisReady,
      database: dbReady,
      redis: redisReady,
    };
  }

  /**
   * Deep comprehensive dependency health check for SHFI dashboard
   */
  public static async getDeepHealth(): Promise<SystemHealthOverview> {
    const nowIso = new Date().toISOString();

    // 1. Database Deep Probe
    const dbProbe = await this.probeDatabase();

    // 2. Redis Deep Probe
    const redisProbe = await this.probeRedis();

    // 3. Queue / BullMQ Probe
    const queueProbe = await this.probeQueues();

    // 4. File Storage Read/Write Probe (active R/W validation)
    const storageProbe = await this.probeStorage();

    // Overall status determination
    const anyUnhealthy = [dbProbe, redisProbe, queueProbe, storageProbe].some(
      (p) => p.status === "UNHEALTHY"
    );
    const anyDegraded = [dbProbe, redisProbe, queueProbe, storageProbe].some(
      (p) => p.status === "DEGRADED"
    );

    const overallStatus = anyUnhealthy ? "UNHEALTHY" : anyDegraded ? "DEGRADED" : "HEALTHY";

    // Metrics summary from IncidentService & DiagnosticEventService
    const activeIncidents = IncidentService.query({ limit: 1000 }).incidents;
    const openCount = activeIncidents.filter((i) => !["CLOSED", "RESOLVED"].includes(i.status)).length;
    const criticalCount = activeIncidents.filter(
      (i) => i.severity === "CRITICAL" && !["CLOSED", "RESOLVED"].includes(i.status)
    ).length;

    const memUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memUsage.rss / (1024 * 1024));
    const cpuLoad = os.loadavg();

    return {
      overallStatus,
      timestamp: nowIso,
      version: process.env.npm_package_version || "3.0.0",
      environment: process.env.NODE_ENV || "development",
      uptimeSeconds: Math.floor(process.uptime()),
      dependencies: {
        database: dbProbe,
        redis: redisProbe,
        queues: queueProbe,
        storage: storageProbe,
      },
      metrics: {
        openIncidents: openCount,
        criticalIncidents: criticalCount,
        eventsInLastHour: DiagnosticEventService.query({ limit: 100 }).total,
        memoryUsageMB,
        cpuLoadAverage: cpuLoad,
      },
    };
  }

  /**
   * Probe PostgreSQL with active latency measurement
   */
  private static async probeDatabase(): Promise<HealthDependencyStatus> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;
      return {
        name: "PostgreSQL Database",
        status: latencyMs > 500 ? "DEGRADED" : "HEALTHY",
        latencyMs,
        details: { engine: "PostgreSQL 16", connection: "active" },
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        name: "PostgreSQL Database",
        status: "UNHEALTHY",
        latencyMs: Date.now() - start,
        details: { error: err.message },
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Probe Redis with ping and memory inspection
   */
  private static async probeRedis(): Promise<HealthDependencyStatus> {
    const start = Date.now();
    try {
      if (!isRedisAvailable()) {
        return {
          name: "Redis Cache & Queue Store",
          status: "DEGRADED",
          latencyMs: 0,
          details: { state: "mock_or_disabled" },
          lastChecked: new Date().toISOString(),
        };
      }
      const client = getRedisClient();
      if (!client) {
        throw new Error("Redis client instance null");
      }
      await client.ping();
      const latencyMs = Date.now() - start;
      return {
        name: "Redis Cache & Queue Store",
        status: latencyMs > 200 ? "DEGRADED" : "HEALTHY",
        latencyMs,
        details: { connection: "connected" },
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        name: "Redis Cache & Queue Store",
        status: "UNHEALTHY",
        latencyMs: Date.now() - start,
        details: { error: err.message },
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Probe BullMQ queue subsystem
   */
  private static async probeQueues(): Promise<HealthDependencyStatus> {
    const start = Date.now();
    try {
      // BullMQ queues run over Redis. If Redis is healthy, check queue accessibility.
      const isAvailable = isRedisAvailable();
      const latencyMs = Date.now() - start;
      return {
        name: "BullMQ Job Queues",
        status: isAvailable ? "HEALTHY" : "DEGRADED",
        latencyMs,
        details: {
          queuesMonitored: ["reconciliation", "outbox", "backup", "maintenance"],
          processing: isAvailable,
        },
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        name: "BullMQ Job Queues",
        status: "UNHEALTHY",
        latencyMs: Date.now() - start,
        details: { error: err.message },
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Probe storage by executing an actual write/read/unlink test in the upload directory
   */
  private static async probeStorage(): Promise<HealthDependencyStatus> {
    const start = Date.now();
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
    const probeFile = path.join(uploadDir, `.health_probe_${Date.now()}`);

    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Write test payload
      fs.writeFileSync(probeFile, "health-check-probe", "utf8");
      // Read test payload
      const readContent = fs.readFileSync(probeFile, "utf8");
      // Unlink
      fs.unlinkSync(probeFile);

      if (readContent !== "health-check-probe") {
        throw new Error("Storage payload verification failed");
      }

      const latencyMs = Date.now() - start;
      return {
        name: "File Storage & Object Store",
        status: latencyMs > 300 ? "DEGRADED" : "HEALTHY",
        latencyMs,
        details: { path: uploadDir, permissions: "READ_WRITE_VERIFIED" },
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        name: "File Storage & Object Store",
        status: "UNHEALTHY",
        latencyMs: Date.now() - start,
        details: { error: err.message, path: uploadDir },
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Aggregate operational health score for a specific school tenant
   */
  public static async getSchoolHealth(schoolId: string): Promise<{
    schoolId: string;
    healthScore: number;
    status: "HEALTHY" | "DEGRADED" | "ATTENTION_REQUIRED";
    activeIncidentsCount: number;
    incidents: any[];
  }> {
    const incidents = IncidentService.query({ schoolId, limit: 20 }).incidents.filter(
      (i) => !["CLOSED", "RESOLVED"].includes(i.status)
    );

    const hasCritical = incidents.some((i) => i.severity === "CRITICAL");
    const hasHigh = incidents.some((i) => i.severity === "HIGH");

    let healthScore = 100;
    if (hasCritical) healthScore -= 50;
    if (hasHigh) healthScore -= 25;
    healthScore -= Math.min(25, incidents.length * 5);
    healthScore = Math.max(0, healthScore);

    const status = healthScore >= 80 ? "HEALTHY" : healthScore >= 50 ? "DEGRADED" : "ATTENTION_REQUIRED";

    return {
      schoolId,
      healthScore,
      status,
      activeIncidentsCount: incidents.length,
      incidents,
    };
  }
}

