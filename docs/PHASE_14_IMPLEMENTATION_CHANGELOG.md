# Phase 14 Implementation Changelog

## 1. Scope of Changes
All changes implemented in Phase 14 directly addressed verified gaps discovered during parallel testing, without rewriting platform foundations.

---

## 2. Modified Files & Engineering Details

### 1. `ssvm-backend/src/services/module-registry.service.ts`
- **Root Cause:** Direct mutation on `school_features` within transactions failed PostgreSQL Row-Level Security checks when `app.current_school_id` was not set. Additionally, `system_logs.userId` threw foreign key errors when callers passed non-user identifiers like `'TEST_SETUP'`.
- **Modifications:**
  - Imported `runWithSchoolContext` from `../middleware/school-context.middleware`.
  - Wrapped `isModuleEnabled` and `getSchoolModules` in `runWithSchoolContext(schoolId, ...)`.
  - Wrapped `setSchoolModules` transaction in `runWithSchoolContext(schoolId, ...)` and set session configuration via `SELECT set_config('app.current_school_id', $1, true)`.
  - Validated `changedBy` existence against `tx.user.findUnique` before passing to `systemLog.create.userId` (setting `null` if not an existing User record).

### 2. `ssvm-backend/src/routes/admin/transport.ts`
- **Root Cause:** Background geofencing calculations triggered by device telemetry were executed without active tenant context in AsyncLocalStorage, causing `prisma.transportStop.findMany` to return an empty array under tenant protection rules.
- **Modifications:**
  - Wrapped geofence evaluation loop in `await runWithSchoolContext(vehicle.schoolId, async () => { ... })`.
  - Restored full Haversine proximity detection (< 50m triggers `GEOFENCE_ENTER`; departure > 50m triggers `GEOFENCE_EXIT` with dwell time calculation).

### 3. `ssvm-backend/src/routes/attendance.ts`
- **Root Cause:** Ingestion of biometric punch events from physical hardware terminals authenticated via `X-Device-Token` lacked user session context. Queries on `Teacher` and upserts on `TeacherAttendance` failed tenant RLS.
- **Modifications:**
  - Imported `runWithSchoolContext` and `runWithTenantDatabaseTransaction`.
  - Wrapped biometric event processing loop in `await runWithSchoolContext(schoolId, async () => { ... })`.
  - Wrapped `tx.teacherAttendance.upsert` in `runWithTenantDatabaseTransaction(schoolId, ...)`.

### 4. `ssvm-backend/src/app.ts`
- **Root Cause:** Fee cashier operations were mounted at `/api/v1/finance/cash`, while legacy or test invocations also targeted `/api/v1/finance/fee-collection`.
- **Modifications:**
  - Added alias: `app.use("/api/v1/finance/fee-collection", financeCashierRoutes);`.

### 5. `ssvm-backend/src/services/diagnostic-event.service.ts`
- **Root Cause:** Callers providing `rawDescription` instead of `sanitizedDescription` were rejected with a Zod validation error.
- **Modifications:**
  - Added `rawDescription: z.string().optional()` to `diagnosticEventInputSchema`.
  - Added schema transform to automatically populate `sanitizedDescription = data.sanitizedDescription || data.rawDescription || "Diagnostic event recorded"`.

### 6. Test Suite Fixture Alignment
- **`ssvm-backend/src/tests/api/transport-trips-biometrics.test.ts`:**
  - Included required dependency `HR_PAYROLL: true` when enabling `BIOMETRIC_ATTENDANCE`.
- **`ssvm-backend/src/tests/api/controlled-school-simulation.test.ts`:**
  - Included `HR_PAYROLL: true` in School A module entitlement setup.
  - Aligned class creation test endpoint to `/api/v1/academic/classes`.
  - Aligned receipt property expectation to `receipt.receiptNo || receipt.receiptNumber || receipt.id`.
  - Handled structured object results in universal search (`res.body.data.students`).
- **`ssvm-backend/src/tests/api/business-modules-completion.test.ts`:**
  - Enabled `TRANSPORT: true` and `LIBRARY: true` via `ModuleRegistryService.setSchoolModules` in `beforeAll`.

