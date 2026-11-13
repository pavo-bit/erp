# SSVM ERP — Excel Template Registry

**Document:** `docs/admissions/EXCEL_TEMPLATE_REGISTRY.md`  
**Status:** Canonical & Verified  
**Audience:** Platform Architects, System Integrators

---

## 1. Registry Metadata

The template registry manages official workbook definitions, schema versions, and dynamic workbook generators inside `AdmissionTemplateRegistry` (`ssvm-backend/src/services/admissions-bulk/admission-template-registry.ts`).

### Active Template Catalog

| Template Type | File Name | Version | Active Status | Required Sheets Count |
| :--- | :--- | :---: | :---: | :---: |
| **`NEW`** | `SSVM_New_Admission_Bulk.xlsx` | `1.0.0` | **ACTIVE** | 8 |
| **`READMISSION`** | `SSVM_Readmission_Bulk.xlsx` | `1.0.0` | **ACTIVE** | 8 |
| **`TRANSFER`** | `SSVM_Transfer_Admission_Bulk.xlsx` | `1.0.0` | **ACTIVE** | 9 |

---

## 2. Dynamic Template Generator Contract

Templates are dynamically generated on-demand to embed active school configuration:
- Class catalog dropdowns reflecting actual school classes (`Prarambha`, `Bodha`, `Class 1-12`).
- Institutional styling (SSVM Maroon `#991B1B` header styling, bold mandatory columns indicated with asterisks `*`).
- Structured validation notes and tooltips on every column header.
- Realistic sample records demonstrating relationship keys.

```typescript
AdmissionTemplateRegistry.generateWorkbookBuffer(
  type: AdmissionType,
  configuredClasses?: string[]
): Promise<Buffer>;
```

