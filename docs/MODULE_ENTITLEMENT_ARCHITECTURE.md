# SSVM ERP Platform — Modular SaaS Entitlement Architecture
**Document Version:** 1.0.0  
**Status:** Approved Architecture  
**Component:** Backend Authorization & Central Module Registry (`ssvm-backend`)

---

## 1. Overview & Architectural Goals

The SSVM ERP platform implements a school-specific modular SaaS architecture allowing different schools to subscribe to different module bundles. Modules can be dynamically enabled or disabled per tenant without codebase fragmentation or redeployment.

### Key Tenets
1. **Central Authoritative Registry:** A single immutable registry (`ModuleRegistryService`) enumerating all ERP modules, descriptions, categories, default states, and dependency graphs.
2. **Fail-Closed Authorization:** Access to endpoints belonging to an unentitled or disabled module is immediately rejected with HTTP 403 `MODULE_DISABLED`.
3. **Core Module Protection:** Vital architectural foundations (`ACADEMICS`, `FINANCE`) cannot be disabled.
4. **Dependency Integrity:** Modules with prerequisites (e.g., `FINANCE` requires `ACADEMICS`) enforce dependency satisfaction prior to activation.
5. **High-Performance Caching:** Module entitlement lookups are cached in Redis (`erp:module:<schoolId>:<code]>`) with sub-millisecond evaluation times and instant cache invalidation upon Super Admin updates.
6. **Dynamic Frontend Navigation:** Portals query `/api/v1/schools/me/modules` and adjust navigation bars, removing disabled feature links.

---

## 2. Central Module Registry Catalog

| Module ID | Module Code | Category | Core? | Default Enabled | Dependencies | Route Prefix |
|:---|:---|:---|:---:|:---:|:---|:---|
| **ACADEMICS** | `ACADEMICS` | `CORE_ACADEMIC` | **Yes** | True | None | `/api/v1/students`, `/api/v1/classes`, `/api/v1/academic` |
| **FINANCE** | `FINANCE` | `FINANCE` | **Yes** | True | `ACADEMICS` | `/api/v1/finance`, `/api/v1/invoices`, `/api/v1/payments` |
| **EXAMS** | `EXAMS` | `CORE_ACADEMIC` | No | True | `ACADEMICS` | `/api/v1/exams`, `/api/v1/grades` |
| **TRANSPORT** | `TRANSPORT` | `OPERATIONS` | No | False | `ACADEMICS` | `/api/v1/transport`, `/api/v1/admin/transport` |
| **LIBRARY** | `LIBRARY` | `OPERATIONS` | No | True | `ACADEMICS` | `/api/v1/library` |
| **HOSTEL** | `HOSTEL` | `OPERATIONS` | No | False | `ACADEMICS` | `/api/v1/ancillary/hostel` |
| **HR_PAYROLL** | `HR_PAYROLL` | `OPERATIONS` | No | True | None | `/api/v1/hr`, `/api/v1/admin/payroll` |
| **INVENTORY** | `INVENTORY` | `OPERATIONS` | No | False | None | `/api/v1/inventory`, `/api/v1/procurement-ops` |
| **COMMUNICATIONS** | `COMMUNICATIONS` | `COMMUNICATION` | No | True | None | `/api/v1/communications`, `/api/v1/notifications` |
| **BIOMETRIC_ATTENDANCE** | `BIOMETRIC_ATTENDANCE` | `SECURITY` | No | False | `HR_PAYROLL` | `/api/v1/attendance/biometric` |

---

## 3. Database Schema Mapping

Module state is persisted using Prisma models `FeatureFlag` (central flag definition) and `SchoolFeature` (per-tenant override):

```prisma
model FeatureFlag {
  id             String          @id @default(cuid())
  code           String          @unique
  name           String
  description    String?
  category       String          @default("GENERAL")
  defaultEnabled Boolean         @default(false)
  isActive       Boolean         @default(true)
  schoolFeatures SchoolFeature[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

model SchoolFeature {
  id        String      @id @default(cuid())
  schoolId  String
  featureId String
  isEnabled Boolean     @default(true)
  enabledBy String?
  school    School      @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  feature   FeatureFlag @relation(fields: [featureId], references: [id], onDelete: Cascade)

  @@unique([schoolId, featureId])
}
```

---

## 4. Middleware & Request Interception (`requireModule`)

Every modular API route uses the `requireModule(moduleId)` guard:

```typescript
export const requireModule = (moduleId: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const schoolId = req.deviceAuth?.schoolId || req.user?.schoolId || req.headers['x-tenant-id'] || req.headers['x-school-id'];
    if (req.user?.role === 'SUPER_ADMIN' && !schoolId) return next();

    const isEnabled = await ModuleRegistryService.isModuleEnabled(schoolId, moduleId);
    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        error: 'Module Disabled',
        code: 'MODULE_DISABLED',
        module: moduleId,
        message: `The ${moduleId} module is not enabled for your school. Contact administrator to upgrade.`
      });
    }
    next();
  };
};
```

---

## 5. Super Admin API Contract

- `GET /api/v1/saas/modules/registry`: Returns complete catalog and metadata.
- `GET /api/v1/saas/schools/:id/modules`: Returns current status of all modules for the school.
- `PUT /api/v1/saas/schools/:id/modules`: Updates module activation status with transaction, audit log, and instant cache purge.
- `GET /api/v1/schools/me/modules`: Publicly readable by authenticated tenant users to dynamically discover active capabilities.

