# SSVM ERP — Section CUID Contract

## Canonical identifiers
- Class.id: CUID (primary key)
- Section.id: CUID (primary key), unique per (classId, name)

## Database representation
- Section.classId -> Class.id (FK, cascade delete)
- Attendance.sectionId -> Section.id

## API DTO
- Attendance POST accepts `sectionId` as either a CUID or composite "className-sectionName" (e.g. "10-A")
- Backend resolves composite to Section.id scoped to authenticated school

## Validation rules
- If sectionId is a valid Section.id for the school, use directly
- Otherwise parse "className-sectionName" and resolve via Class (schoolId) + Section (name)
- Reject if not found or cross-school

## Tenant scoping
- All section lookups scoped by schoolId via Class.schoolId

## Affected consumers
- teacher-portal attendance page (sends "10-A")
- Backend attendance route (resolves)

## Backward compatibility
- Existing CUID sectionIds continue to work

## Regression tests
- Valid CUID, invalid format, nonexistent, cross-school, missing identifier (documented; execution blocked by Docker downtime)