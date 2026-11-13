# SSVM ERP — Bulk Import Template Specification

**Canonical Specification:** `docs/BULK_IMPORT_TEMPLATE_SPECIFICATION.md`  
**Registry Reference:** `ssvm-backend/src/services/import-framework/template-registry.ts`

---

## 1. Supported Entity Templates

### 1.1 Student Directory (`students`)
- **Primary Unique Identifier:** `rollNo`
- **Fields:**
  | Field Name | Header Label | Required | Data Type | Accepted Aliases | Example |
  | :--- | :--- | :---: | :--- | :--- | :--- |
  | `name` | Student Name | **YES** | String | student name, full name, name | Aarav Sharma |
  | `rollNo` | Roll Number | **YES** | String | roll no, roll number, roll | STU-2026-001 |
  | `admissionNo` | Admission Number | NO | String | admission no, adm no, adm | ADM-2026-1042 |
  | `className` | Class Name | **YES** | String | class, grade, standard | Class 10 |
  | `sectionName`| Section Name | NO | String | section, sec | A |
  | `email` | Student Email | NO | Email | email, mail | aarav.sharma@example.com |
  | `phone` | Student Phone | NO | Phone | phone, mobile, contact | +919876543210 |
  | `gender` | Gender | NO | Enum | sex, gender (MALE, FEMALE, OTHER) | MALE |
  | `dob` | Date of Birth | NO | Date | dob, birth date, date of birth | 2010-05-15 |

### 1.2 Parents & Guardians (`guardians`)
- **Primary Unique Identifier:** `primaryPhone`
- **Fields:**
  | Field Name | Header Label | Required | Data Type | Accepted Aliases | Example |
  | :--- | :--- | :---: | :--- | :--- | :--- |
  | `name` | Guardian Name | **YES** | String | parent name, father name, mother name | Rajesh Sharma |
  | `relationship` | Relationship | **YES** | Enum | relation (FATHER, MOTHER, GUARDIAN, OTHER) | FATHER |
  | `primaryPhone`| Contact Phone | **YES** | Phone | phone, mobile, contact | +919876543210 |
  | `primaryEmail`| Email Address | NO | Email | email, mail | rajesh.sharma@example.com |
  | `studentRollNo`| Student Roll No | NO | String | student roll, roll no, child roll | STU-2026-001 |
  | `address` | Residential Address| NO | String | address, res address | 123 MG Road, Pune |

### 1.3 Staff & Faculty (`staff`)
- **Primary Unique Identifier:** `employeeId`
- **Fields:**
  | Field Name | Header Label | Required | Data Type | Accepted Aliases | Example |
  | :--- | :--- | :---: | :--- | :--- | :--- |
  | `employeeId` | Employee ID | **YES** | String | emp id, staff id, employee code | EMP-104 |
  | `name` | Full Name | **YES** | String | staff name, teacher name, name | Dr. Priya Verma |
  | `email` | Institutional Email | **YES** | Email | email, official email | priya.verma@ssvm.edu |
  | `role` | Staff Role | NO | Enum | role, designation (TEACHER, ACCOUNTANT, LIBRARIAN) | TEACHER |
  | `department` | Department | NO | String | dept, department name | Science & Mathematics |
  | `phone` | Contact Phone | NO | Phone | mobile, phone | +919876543220 |

### 1.4 Classes & Sections (`classes`)
- **Primary Unique Identifier:** `className`
- **Fields:**
  | Field Name | Header Label | Required | Data Type | Accepted Aliases | Example |
  | :--- | :--- | :---: | :--- | :--- | :--- |
  | `className` | Class Name | **YES** | String | class, standard, grade | Class 10 |
  | `sectionName`| Section Name | NO | String | section, sec | A |
  | `capacity` | Section Capacity | NO | Number | seats, capacity, student limit | 40 |
  | `room` | Classroom / Room | NO | String | room no, room, classroom | Room 204 |

### 1.5 Curriculum & Subjects (`subjects`)
- **Primary Unique Identifier:** `code`
- **Fields:**
  | Field Name | Header Label | Required | Data Type | Accepted Aliases | Example |
  | :--- | :--- | :---: | :--- | :--- | :--- |
  | `code` | Subject Code | **YES** | String | course code, sub code | SCI-101 |
  | `name` | Subject Name | **YES** | String | course name, title | Physics & Chemistry |
  | `type` | Subject Type | NO | Enum | type (THEORY, PRACTICAL, BOTH) | BOTH |
  | `credits` | Credit Hours | NO | Number | credits, hours | 4 |

### 1.6 Attendance Records (`attendance`)
- **Primary Unique Identifier:** `studentRollNo + date`
- **Fields:**
  | Field Name | Header Label | Required | Data Type | Accepted Aliases | Example |
  | :--- | :--- | :---: | :--- | :--- | :--- |
  | `studentRollNo`| Student Roll No | **YES** | String | roll no, student roll | STU-2026-001 |
  | `date` | Attendance Date | **YES** | Date | date, attendance date | 2026-11-10 |
  | `status` | Attendance Status | **YES** | Enum | status (PRESENT, ABSENT, LATE, HALF_DAY) | PRESENT |
  | `remarks` | Remarks | NO | String | reason, note | Medical Leave |

### 1.7 Fee Structures (`fees`)
- **Primary Unique Identifier:** `name`
- **Fields:**
  | Field Name | Header Label | Required | Data Type | Accepted Aliases | Example |
  | :--- | :--- | :---: | :--- | :--- | :--- |
  | `name` | Fee Category Name | **YES** | String | fee name, category, fee title | Annual Tuition Fee |
  | `amount` | Amount (INR) | **YES** | Number | fee amount, amount, rate | 25000 |
  | `frequency` | Billing Frequency | NO | Enum | frequency (TERMLY, MONTHLY, ANNUAL, ONE_TIME) | TERMLY |
  | `className` | Applicable Class | NO | String | class, grade, standard | Class 10 |

