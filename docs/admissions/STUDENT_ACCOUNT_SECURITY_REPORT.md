# SSVM ERP — Student Account Provisioning & Security Report
**Module:** User Account Lifecycle & Credential Security  
**Audit Target:** Automatic Student User Creation, Collision-Safe Emailing, and Password Hashing

---

## 1. Security Architecture

Upon successful admission commit, each student is automatically provisioned a portal user account:
- **Role:** Strict `Role.STUDENT`. Never `ADMIN` or `TEACHER`.
- **Email Generation:** Collision-safe institutional email format:
  $$\text{studentEmail} = \text{cleanAdmissionNo} + \text{"\_"} + \text{schoolId.slice(-6)} + \text{"@student.ssvm"}$$
  This guarantees cross-school and intra-school uniqueness across all tenants.
- **Credential Storage:**
  - Standard Argon2id hashing via `hashPassword`.
  - Hashed format: `$argon2id$v=19$m=65536,t=3,p=4$...`
  - Plaintext passwords are never stored in the database.
- **Tenant Scoping:** The `User` record is created with the exact `schoolId` of the admitted student.

---

## 2. Test Verification Evidence

Verified in automated test `provisions secure Student User account with collision-safe institutional email and hashed password`:
- Created Student: "Smruti Jena"
- `stu.user` was defined.
- `stu.user.role` strictly equals `"STUDENT"`.
- `stu.user.email` conforms to format `*@student.ssvm` and contains the 6-character school tenant suffix.
- `stu.user.passwordHash` starts with `$argon2id$` (Argon2id cryptographic hash).
- Plaintext password pattern (`SSVM@*`) is completely absent from database fields.

