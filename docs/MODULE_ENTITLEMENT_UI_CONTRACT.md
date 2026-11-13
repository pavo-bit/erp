# SSVM ERP — Module Entitlement UI & Backend Contract

**Canonical Document:** `docs/MODULE_ENTITLEMENT_UI_CONTRACT.md`  
**Working Repository:** `pavo-bit/erp`  
**Branch:** `lane/d-portals`  
**Publication Date:** 13 November 2026

---

## 1. REST API Specification

### 1.1 Discovery Endpoint: School Entitlements
- **Method & Path:** `GET /api/v1/schools/me/modules`
- **Authentication:** Bearer JWT (`ERP_ADMIN`, `TEACHER`, `STUDENT`, `PARENT`, `SUPER_ADMIN`)
- **Tenant Scope:** Determined strictly from `req.user.schoolId`. Arbitrary headers from non-SUPER_ADMIN users are ignored.
- **Response Schema:**
```json
{
  "success": true,
  "data": {
    "schoolId": "cmwer4vpp0001c7s89ajwdo2x",
    "modules": [
      {
        "module": {
          "id": "ACADEMICS",
          "code": "ACADEMICS",
          "name": "Core Academics & Student Lifecycle",
          "description": "Student admissions, classes, sections, subjects, enrollment, and timetable",
          "category": "CORE_ACADEMIC",
          "defaultEnabled": true,
          "isCore": true,
          "dependencies": [],
          "routePrefixes": ["/api/v1/students", "/api/v1/classes", "/api/v1/academic", "/api/v1/timetable"],
          "portalVisibility": ["ERP_ADMIN", "TEACHER", "PARENT", "STUDENT"]
        },
        "isEnabled": true,
        "source": "CORE",
        "operationalState": "ACTIVE",
        "badge": null
      },
      {
        "module": {
          "id": "TRANSPORT",
          "code": "TRANSPORT",
          "name": "Transport & Real-Time Bus Fleet GPS",
          "description": "Fleet management, vehicle tracking, IoT hardware telemetry, stops, routes, and live parent tracking",
          "category": "OPERATIONS",
          "defaultEnabled": false,
          "isCore": false,
          "dependencies": ["ACADEMICS"],
          "routePrefixes": ["/api/v1/transport", "/api/v1/admin/transport"],
          "portalVisibility": ["ERP_ADMIN", "PARENT", "STUDENT"]
        },
        "isEnabled": true,
        "source": "OVERRIDE",
        "operationalState": "PROVISIONING",
        "badge": "Provisioning"
      }
    ]
  }
}
```

---

### 1.2 Super Admin Management: Target School Modules
- **Method & Path:** `GET /api/v1/schools/:id/modules`
- **Authentication:** Bearer JWT (`Role: SUPER_ADMIN`)
- **Response:**
```json
{
  "success": true,
  "data": {
    "schoolId": "cmwer4vpp0001c7s89ajwdo2x",
    "school": {
      "id": "cmwer4vpp0001c7s89ajwdo2x",
      "name": "SSVM Central Campus",
      "code": "MAIN",
      "status": "ACTIVE"
    },
    "modules": [ ... ],
    "registry": [ ... ]
  }
}
```

---

### 1.3 Super Admin Management: Entitlement Mutation
- **Method & Path:** `PATCH /api/v1/schools/:id/modules/:moduleCode`
- **Authentication:** Bearer JWT (`Role: SUPER_ADMIN`)
- **Request Body:**
```json
{
  "enabled": true
}
```
- **Error Responses:**
  - `400 Bad Request`: When attempting to disable a core module (`isCore: true`), or if dependency constraints fail.
  - `403 Forbidden`: Non-SUPER_ADMIN caller.
  - `404 Not Found`: Target school not found, or moduleCode not present in central registry.
- **Success Response:**
```json
{
  "success": true,
  "message": "Module TRANSPORT successfully enabled for SSVM Central Campus",
  "data": {
    "schoolId": "cmwer4vpp0001c7s89ajwdo2x",
    "module": {
      "module": { "code": "TRANSPORT", ... },
      "isEnabled": true,
      "source": "OVERRIDE",
      "operationalState": "PROVISIONING",
      "badge": "Provisioning"
    },
    "modules": [ ... ]
  }
}
```

---

## 2. Authorization Guard Contract (`requireModule`)

```typescript
export const requireModule = (moduleId: string) => { ... }
```

- **Rejection Status:** `403 Forbidden`
- **Payload:**
```json
{
  "success": false,
  "error": "Module Disabled",
  "code": "MODULE_DISABLED",
  "module": "TRANSPORT",
  "message": "The TRANSPORT module is not enabled for your school. Contact the administrator to upgrade your subscription."
}
```
- **Fail-Closed Principle:**
  1. A missing registry entry never grants access.
  2. Redis cache lookup errors fall through to PostgreSQL.
  3. PostgreSQL errors return `false` (fail-closed), never `mod.defaultEnabled`.

