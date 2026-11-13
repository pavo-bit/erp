# SSVM ERP — Dual Portal Navigation Implementation Specification

**Canonical Document:** `docs/DUAL_PORTAL_NAVIGATION_IMPLEMENTATION.md`  
**Working Repository:** `pavo-bit/erp`  
**Branch:** `lane/d-portals`  
**Author:** Principal Frontend Architect & Multi-Tenant Integration Lead  
**Publication Date:** 13 November 2026

---

## 1. Scope & Architecture

This specification details the technical implementation and architectural integration of the navigation sidebars for:
1. **`erp-admin` (School Administrator Portal):** Ten canonical expandable groups driven by dynamic, fail-closed school module entitlements.
2. **`super-admin` (Platform Multi-Tenant Portal):** Centralized navigation shell (`SuperAdminShell`), persistent across all dashboard sub-routes, wired to per-school module management.

---

## 2. ERP Admin Sidebar Architecture

### 2.1 File Location & Component Layout
- **Layout Route:** `erp-admin/src/app/admin/layout.tsx`
- **Shell Component:** `erp-admin/src/components/DashboardLayout.tsx`
- **Entitlement Hook:** `useSchoolModules()` in `erp-admin/src/lib/api-hooks.ts` pointing to `GET /api/v1/schools/me/modules`

### 2.2 Entitlement Resolution Engine (`resolveModuleStatus`)
```typescript
interface ModuleStatusInfo {
  isEnabled: boolean;
  isCore: boolean;
  operationalState?: string;
  badge?: string;
}

function resolveModuleStatus(moduleData: any, code?: string): ModuleStatusInfo {
  if (!code) return { isEnabled: true, isCore: true };
  const upperCode = code.toUpperCase();
  if (upperCode === "ACADEMICS" || upperCode === "FINANCE") return { isEnabled: true, isCore: true };
  if (!moduleData) return { isEnabled: false, isCore: false }; // Fail-closed

  const raw = moduleData.data?.modules ?? moduleData.modules ?? moduleData.data ?? moduleData;
  const list = Array.isArray(raw) ? raw : [];
  const found = list.find((item: any) =>
    item.module?.code?.toUpperCase() === upperCode ||
    item.module?.id?.toUpperCase() === upperCode ||
    item.code?.toUpperCase() === upperCode ||
    item.id?.toUpperCase() === upperCode
  );

  if (!found) return { isEnabled: false, isCore: false };
  return {
    isEnabled: Boolean(found.isEnabled ?? found.enabled),
    isCore: Boolean(found.module?.isCore ?? false),
    operationalState: found.operationalState,
    badge: found.badge,
  };
}
```

### 2.3 Dynamic Group Filtering & Zero-Children Collapse
The sidebar evaluates each of the ten canonical groups:
1. If the group itself specifies a `moduleCode` and fails entitlement, the entire group is dropped.
2. For each child item in the group, `resolveModuleStatus` checks if the module is entitled.
3. If all children in a group are unentitled (such as `Campus Operations` when both `HOSTEL` and `TRANSPORT` are disabled), the parent group collapses and disappears completely from the sidebar.
4. Badges (e.g., `"Provisioning"`, `"Syncing"`, `"Setup Required"`, `"Setup Incomplete"`) are forwarded dynamically from the backend to both desktop and mobile items.

---

## 3. Super Admin Shell & Module Management Architecture

### 3.1 Centralized Super Admin Shell (`SuperAdminShell`)
- **Location:** `super-admin/src/components/SuperAdminShell.tsx`
- **Mount Point:** `super-admin/src/app/dashboard/layout.tsx`
- **Persistent Controls:**
  - Glassmorphism dark sidebar on desktop (`w-[280px]`).
  - Mobile header with hamburger trigger (`lg:hidden`).
  - Slide-out mobile drawer with escape-key and overlay-click listeners.
  - User identity card with one-click logout.

### 3.2 Navigation Items & Route Prefix Matching
```typescript
export const SUPER_ADMIN_NAV_ITEMS: SuperAdminNavItem[] = [
  { icon: "🌌", label: "Command Center", href: "/dashboard", gradient: "from-purple-500 to-fuchsia-500", matchPrefix: false },
  { icon: "🏫", label: "School Network", href: "/dashboard/schools", gradient: "from-blue-500 to-cyan-400", matchPrefix: true },
  { icon: "⚡", label: "SaaS Requests", href: "/dashboard/requests", gradient: "from-pink-500 to-rose-400", matchPrefix: true },
  { icon: "📈", label: "Global Analytics", href: "/dashboard/analytics", gradient: "from-amber-400 to-orange-500", matchPrefix: true },
  { icon: "⚙️", label: "System Core", href: "/dashboard/settings", gradient: "from-emerald-400 to-teal-500", matchPrefix: true },
];
```
Nested routes such as `/dashboard/schools/[schoolId]/modules` or `/dashboard/schools/[schoolId]/shifts` correctly match the parent `School Network` item and highlight it.

### 3.3 School-Specific Module Management
- **Route:** `super-admin/src/app/dashboard/schools/[schoolId]/modules/page.tsx`
- **API Endpoint:** `PATCH /api/v1/schools/:id/modules/:moduleCode`
- **UI Safeguards:**
  - Core modules (`ACADEMICS`, `FINANCE`) are marked with `<Lock /> Core` and have their toggle controls permanently disabled.
  - Optional modules (`EXAMS`, `TRANSPORT`, `HOSTEL`, `LIBRARY`, `HR_PAYROLL`, `INVENTORY`, `COMMUNICATIONS`, `BIOMETRIC_ATTENDANCE`) prompt with a modal confirmation explaining operational impacts and checking dependencies before submitting mutations.

