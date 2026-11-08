# SSVM ERP Platform — Transport GPS Implementation & Test Report
**Document Version:** 1.0.0  
**Status:** Complete & Verified  
**Component:** Fleet GPS Telemetry, IoT Authentication & Real-Time Tracking

---

## 1. Architecture & Design

The Transport Management and Live GPS Tracking subsystem provides end-to-end fleet monitoring for school administrators and real-time school bus location tracking for parents.

### Core Modules & Flow
1. **Fleet Master Data:** Vehicles (`TransportVehicle`), Routes (`TransportRoute`), Stops (`TransportStop`), and Student Allocations (`TransportAllocation`).
2. **IoT Hardware Gateway (`POST /api/v1/admin/transport/vehicles/:id/telemetry`):**
   - Supports hardware GPS units (Teltonika, Queclink, AIS-140 standard units) sending telemetry over HTTPS.
   - Secured via `X-Device-Token` HMAC-SHA256 signature verification.
   - Enforces coordinate freshness (rejects updates older or drifted by > 5 minutes).
   - Validates physical bounds: Latitude $[-90, 90]$, Longitude $[-180, 180]$, Speed $[0, 180\text{ km/h}]$, Heading $[0, 360^\circ]$.
3. **Telemetry Storage & Caching:**
   - Primary: Fast in-memory cache for ultra-low latency lookups.
   - Distributed: Redis cache (`transport:vehicle:<id>:telemetry`) with 15-minute TTL.
4. **Live Location Consumption (`GET /api/v1/transport/vehicles/:id/location`):**
   - Polled by Parent Portal and Admin fleet monitoring UI every 5 seconds.
   - Enforces school-level tenant isolation (School B cannot view School A bus location).
5. **Parent Portal Integration:**
   - Parents query `/api/v1/transport/allocations`, which returns the student's allocated stop, route, and vehicle ID.
   - Frontend dynamically polls the assigned vehicle's location and renders the bus status and live coordinates.

---

## 2. Test Execution & Results

| Test ID | Test Description | Input / Method | Outcome | Status |
|:---:|:---|:---|:---|:---:|
| **GPS-01** | Hardware token generation & authentication | `generateVehicleHardwareToken(vehicleId, schoolId)` | Valid token accepted by telemetry gateway | **PASS** |
| **GPS-02** | Invalid device token rejection | Bogus `X-Device-Token` header | HTTP 401 Unauthorized | **PASS** |
| **GPS-03** | Missing tenant context rejection | Device token without school ID | HTTP 401 Unauthorized | **PASS** |
| **GPS-04** | Out-of-bounds latitude rejection | Latitude: `120.0` (exceeds 90) | HTTP 400 Validation Error | **PASS** |
| **GPS-05** | Out-of-bounds speed rejection | Speed: `250 km/h` (exceeds 180) | HTTP 400 Validation Error | **PASS** |
| **GPS-06** | Excessive clock drift rejection | Timestamp: 15 minutes ago | HTTP 400 Expired Telemetry | **PASS** |
| **GPS-07** | Live telemetry query | `GET /vehicles/:id/location` | HTTP 200 with coordinates and speed | **PASS** |
| **GPS-08** | Cross-tenant vehicle isolation | School B Admin querying School A vehicle | HTTP 403 / 404 Partitioned | **PASS** |
| **GPS-09** | Parent allocation query | Parent A querying student bus info | HTTP 200 with vehicle details | **PASS** |
| **GPS-10** | Modular entitlement guard | School B (Transport disabled) calling telemetry/vehicles | HTTP 403 `MODULE_DISABLED` | **PASS** |

---

## 3. Deployment & Production Readiness

The software contracts, telemetry ingestion pipeline, and frontend consumers are fully verified. For production pilot, hardware GPS trackers can be provisioned by flashing the unique `X-Device-Token` into tracker firmware.

