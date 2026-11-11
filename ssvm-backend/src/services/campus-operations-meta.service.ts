/**
 * ssvm-backend/src/services/campus-operations-meta.service.ts
 *
 * Provides persisted metadata management and sequential numbering for Campus Operations:
 * - Sequential internal fleet numbering for vehicles per school scope (e.g. "Vehicle 01", "Vehicle 02")
 * - Vehicle document metadata (RC, Insurance, Fitness, PUC, Make, Model, Photos)
 * - Driver professional profile metadata (License #, class, expiry, address, emergency contact, documents)
 * - Hostel room metadata (Floor, room type)
 * - Route metadata (Description, code)
 *
 * Uses existing Prisma AppConfiguration and SequenceCounter models without requiring DDL alterations.
 * Guarantees that optional missing fields are stored as NULL (not "N/A"), and tenant isolation is strictly enforced.
 */

import prisma, { runWithTenantDatabaseTransaction } from "../lib/prisma";
import logger from "../lib/logger";

export interface VehicleMetadata {
  fleetNumber?: string | null;
  make?: string | null;
  model?: string | null;
  photoUrl?: string | null;
  rcNumber?: string | null;
  rcDocumentUrl?: string | null;
  insurancePolicyNo?: string | null;
  insuranceExpiry?: string | null;
  insuranceDocumentUrl?: string | null;
  fitnessExpiry?: string | null;
  fitnessDocumentUrl?: string | null;
  pucExpiry?: string | null;
  pucDocumentUrl?: string | null;
  documents?: Array<{
    id?: string;
    title: string;
    category: string;
    fileUrl: string;
    uploadedAt?: string;
  }>;
}

export interface DriverMetadata {
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  licenseNumber?: string | null;
  licenseClass?: string | null;
  licenseExpiry?: string | null;
  licenseDocumentUrl?: string | null;
  photoUrl?: string | null;
  employmentType?: "FULL_TIME" | "CONTRACT" | "PART_TIME" | null;
  documents?: Array<{
    id?: string;
    title: string;
    category: string;
    fileUrl: string;
    uploadedAt?: string;
  }>;
}

export interface RoomMetadata {
  floor?: string | null;
  roomType?: string | null;
}

export interface RouteMetadata {
  description?: string | null;
  code?: string | null;
}

export class CampusOperationsMetaService {
  /**
   * Generates or retrieves the internal sequential fleet number for a vehicle in a school.
   * e.g. "Vehicle 01", "Vehicle 02", "Vehicle 03".
   */
  static async getOrGenerateFleetNumber(schoolId: string, vehicleId: string): Promise<string> {
    const meta = await this.getVehicleMeta(schoolId, vehicleId);
    if (meta.fleetNumber) {
      return meta.fleetNumber;
    }

    // Sequence counter for this school
    let nextSeq = 1;
    try {
      const counter = await prisma.sequenceCounter.upsert({
        where: {
          schoolId_key: {
            schoolId,
            key: "TRANSPORT_FLEET_NO",
          },
        },
        create: {
          schoolId,
          key: "TRANSPORT_FLEET_NO",
          currentValue: 1,
        },
        update: {
          currentValue: {
            increment: 1,
          },
        },
      });
      nextSeq = counter.currentValue;
    } catch {
      // Fallback: count existing vehicles in school
      const vehicleCount = await prisma.transportVehicle.count({
        where: { schoolId },
      });
      nextSeq = Math.max(1, vehicleCount);
    }

    const fleetNumber = `Vehicle ${String(nextSeq).padStart(2, "0")}`;
    await this.setVehicleMeta(schoolId, vehicleId, { fleetNumber });
    return fleetNumber;
  }

  /**
   * Get metadata for a vehicle.
   */
  static async getVehicleMeta(schoolId: string, vehicleId: string): Promise<VehicleMetadata> {
    try {
      const configKey = `campus:vehicle:${schoolId}:${vehicleId}`;
      const record = await prisma.appConfiguration.findUnique({
        where: { key: configKey },
      });
      if (!record || !record.value) return {};
      return JSON.parse(record.value) as VehicleMetadata;
    } catch (err) {
      logger.error({ err, schoolId, vehicleId }, "Failed to read vehicle metadata");
      return {};
    }
  }

  /**
   * Set / merge metadata for a vehicle.
   */
  static async setVehicleMeta(
    schoolId: string,
    vehicleId: string,
    updates: Partial<VehicleMetadata>
  ): Promise<VehicleMetadata> {
    const current = await this.getVehicleMeta(schoolId, vehicleId);
    // Sanitize: clean missing values to null, not literal "N/A"
    const sanitized: Record<string, any> = { ...current };
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "" || v === "N/A" || v === "n/a") {
        sanitized[k] = null;
      } else {
        sanitized[k] = v;
      }
    }

    const configKey = `campus:vehicle:${schoolId}:${vehicleId}`;
    await prisma.appConfiguration.upsert({
      where: { key: configKey },
      create: {
        key: configKey,
        value: JSON.stringify(sanitized),
        type: "JSON",
        description: `Campus Operations metadata for vehicle ${vehicleId}`,
      },
      update: {
        value: JSON.stringify(sanitized),
      },
    });

    return sanitized as VehicleMetadata;
  }

  /**
   * Get metadata for a driver.
   */
  static async getDriverMeta(schoolId: string, userId: string): Promise<DriverMetadata> {
    try {
      const configKey = `campus:driver:${schoolId}:${userId}`;
      const record = await prisma.appConfiguration.findUnique({
        where: { key: configKey },
      });
      if (!record || !record.value) return {};
      return JSON.parse(record.value) as DriverMetadata;
    } catch (err) {
      logger.error({ err, schoolId, userId }, "Failed to read driver metadata");
      return {};
    }
  }

  /**
   * Set / merge metadata for a driver.
   */
  static async setDriverMeta(
    schoolId: string,
    userId: string,
    updates: Partial<DriverMetadata>
  ): Promise<DriverMetadata> {
    const current = await this.getDriverMeta(schoolId, userId);
    const sanitized: Record<string, any> = { ...current };
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "" || v === "N/A" || v === "n/a") {
        sanitized[k] = null;
      } else {
        sanitized[k] = v;
      }
    }

    const configKey = `campus:driver:${schoolId}:${userId}`;
    await prisma.appConfiguration.upsert({
      where: { key: configKey },
      create: {
        key: configKey,
        value: JSON.stringify(sanitized),
        type: "JSON",
        description: `Campus Operations metadata for driver ${userId}`,
      },
      update: {
        value: JSON.stringify(sanitized),
      },
    });

    return sanitized as DriverMetadata;
  }

  /**
   * Get metadata for a hostel room (Floor, Room Type).
   */
  static async getRoomMeta(schoolId: string, roomId: string): Promise<RoomMetadata> {
    try {
      const configKey = `campus:room:${schoolId}:${roomId}`;
      const record = await prisma.appConfiguration.findUnique({
        where: { key: configKey },
      });
      if (!record || !record.value) return {};
      return JSON.parse(record.value) as RoomMetadata;
    } catch {
      return {};
    }
  }

  /**
   * Set / merge metadata for a hostel room.
   */
  static async setRoomMeta(
    schoolId: string,
    roomId: string,
    updates: Partial<RoomMetadata>
  ): Promise<RoomMetadata> {
    const current = await this.getRoomMeta(schoolId, roomId);
    const sanitized: Record<string, any> = { ...current };
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "" || v === "N/A" || v === "n/a") {
        sanitized[k] = null;
      } else {
        sanitized[k] = v;
      }
    }

    const configKey = `campus:room:${schoolId}:${roomId}`;
    await prisma.appConfiguration.upsert({
      where: { key: configKey },
      create: {
        key: configKey,
        value: JSON.stringify(sanitized),
        type: "JSON",
        description: `Hostel room metadata for room ${roomId}`,
      },
      update: {
        value: JSON.stringify(sanitized),
      },
    });

    return sanitized as RoomMetadata;
  }

  /**
   * Get metadata for a route (Description, Code).
   */
  static async getRouteMeta(schoolId: string, routeId: string): Promise<RouteMetadata> {
    try {
      const configKey = `campus:route:${schoolId}:${routeId}`;
      const record = await prisma.appConfiguration.findUnique({
        where: { key: configKey },
      });
      if (!record || !record.value) return {};
      return JSON.parse(record.value) as RouteMetadata;
    } catch {
      return {};
    }
  }

  /**
   * Set / merge metadata for a route.
   */
  static async setRouteMeta(
    schoolId: string,
    routeId: string,
    updates: Partial<RouteMetadata>
  ): Promise<RouteMetadata> {
    const current = await this.getRouteMeta(schoolId, routeId);
    const sanitized: Record<string, any> = { ...current };
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "" || v === "N/A" || v === "n/a") {
        sanitized[k] = null;
      } else {
        sanitized[k] = v;
      }
    }

    const configKey = `campus:route:${schoolId}:${routeId}`;
    await prisma.appConfiguration.upsert({
      where: { key: configKey },
      create: {
        key: configKey,
        value: JSON.stringify(sanitized),
        type: "JSON",
        description: `Transport route metadata for route ${routeId}`,
      },
      update: {
        value: JSON.stringify(sanitized),
      },
    });

    return sanitized as RouteMetadata;
  }
}

