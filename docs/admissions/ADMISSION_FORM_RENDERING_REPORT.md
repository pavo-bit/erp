# SSVM ERP — Admission Form Rendering & Printable Report
**Service:** `AdmissionPaperFormsService`  
**Endpoint:** `GET /api/v1/admin/admissions/bulk/forms/:type/print`  
**Standard:** ISO 216 A4 Portrait Specification

---

## 1. Overview

The paper-to-digital admission lifecycle begins with physical application forms distributed to applicants. The `AdmissionPaperFormsService` generates pixel-perfect, printer-ready HTML forms tailored for single-sheet or two-page printing.

---

## 2. Form Specifications

### 2.1 New Admission Form (`NEW_ADMISSION`)
- **Header:** Institution Name, Affiliation Code, Academic Session, and Title Badge.
- **Application Fee Notice:** Prominent non-refundable fee banner (`Application Fee: ₹200 (Non-refundable)`).
- **Photograph Space:** 32mm × 40mm dashed box for recent self-attested passport photograph.
- **Student Demographics:** Full legal name (block letters), DOB, gender, blood group (A+, A-, B+, B-, AB+, AB-, O+, O-), nationality, category (General/OBC/SC/ST), mother tongue, religion, and PEN.
- **Parent & Guardian Grid:** Father, Mother, and Local Guardian full details (occupation, phone, email, income).
- **Addresses:** Present residential address, police station, district, PIN, state, and emergency phone.
- **Document Checklist:** Birth Certificate, Aadhaar Card, Transfer Certificate, Previous Report Card, Blood Group Certificate, Passport Photos.
- **Office Use Box:** Application number, physical register reference, verification status, and committee endorsement.
- **Blank Form Rule:** Blank application forms **never** carry preassigned admission numbers. The permanent `ADM-YYYY-XXXX` registration number is allocated monotonically only upon database commit of offline approval.

### 2.2 Re-admission Form (`READMISSION`)
- **Identity Retention Notice:** Clear visual banner communicating that the student retains their permanent SSVM Admission/Registration Number.
- **Identity Fields:** Previous permanent admission number (`Existing Admission / Reg Number *`), previous class, section, roll number, and reason for re-admission.
- **Requested Placement:** Target academic session, class, and section.
- **Guardian Re-verification:** Updates to address, phone number, and emergency contacts.

### 2.3 Incoming Transfer Form (`TRANSFER_ADMISSION`)
- **Previous School Details:** Previous school name, affiliated board (CBSE/ICSE/State), previous class/section, previous registration/roll number.
- **TC/SLC Endorsement:** TC number, issue date, date of leaving previous school, reason for migration.
- **Distinction Notice:** Explicit notice that the previous school's roll/registration number is archived solely as historical background and will never overwrite or serve as the SSVM permanent Registration Number.

---

## 3. Printable Route Integration

The forms are exposed via authenticated API routes:
- `GET /api/v1/admin/admissions/bulk/forms/new/print`
- `GET /api/v1/admin/admissions/bulk/forms/readmission/print`
- `GET /api/v1/admin/admissions/bulk/forms/transfer/print`

Supports query parameter overrides: `applicationFee`, `academicSession`, `affiliationNumber`.

