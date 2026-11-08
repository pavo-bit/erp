-- Seed demo credentials for all portals with password 'Password@123'
-- Hash: $2b$10$8W1h7bOQmL4cWToSoMIX0eCC7Zy5jGov1MGPxiPeiZY7JTXCImTLu

-- 1. Ensure SuperAdmin
INSERT INTO users (id, email, name, role, "passwordHash", "isActive", "createdAt", "updatedAt")
VALUES (
  'usr_superadmin_01',
  'superadmin@ssvm-erp.com',
  'System SuperAdmin',
  'SUPER_ADMIN',
  '$2b$10$8W1h7bOQmL4cWToSoMIX0eCC7Zy5jGov1MGPxiPeiZY7JTXCImTLu',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "isActive" = true, role = 'SUPER_ADMIN';

-- Update existing admin@ssvm-cuttack.org or create as ERP Admin
INSERT INTO users (id, email, name, role, "passwordHash", "schoolId", "isActive", "createdAt", "updatedAt")
VALUES (
  'usr_erpadmin_01',
  'admin@ssvm-cuttack.org',
  'Campus Principal (ERP Admin)',
  'ERP_ADMIN',
  '$2b$10$8W1h7bOQmL4cWToSoMIX0eCC7Zy5jGov1MGPxiPeiZY7JTXCImTLu',
  'cmvwy984q0001qocgpclzv585',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "isActive" = true, role = 'ERP_ADMIN', "schoolId" = 'cmvwy984q0001qocgpclzv585';

-- Also erpadmin@ssvm.edu as alternative ERP Admin
INSERT INTO users (id, email, name, role, "passwordHash", "schoolId", "isActive", "createdAt", "updatedAt")
VALUES (
  'usr_erpadmin_02',
  'erpadmin@ssvm.edu',
  'ERP Administrator',
  'ERP_ADMIN',
  '$2b$10$8W1h7bOQmL4cWToSoMIX0eCC7Zy5jGov1MGPxiPeiZY7JTXCImTLu',
  'cmvwy984q0001qocgpclzv585',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "isActive" = true, role = 'ERP_ADMIN', "schoolId" = 'cmvwy984q0001qocgpclzv585';

-- 2. Teacher User
INSERT INTO users (id, email, name, role, "passwordHash", "schoolId", "isActive", "createdAt", "updatedAt")
VALUES (
  'usr_teacher_01',
  'teacher@ssvm-cuttack.org',
  'Dr. Ananya Sen (Senior Teacher)',
  'TEACHER',
  '$2b$10$8W1h7bOQmL4cWToSoMIX0eCC7Zy5jGov1MGPxiPeiZY7JTXCImTLu',
  'cmvwy984q0001qocgpclzv585',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "isActive" = true, role = 'TEACHER', "schoolId" = 'cmvwy984q0001qocgpclzv585';

-- Teacher Domain Record
INSERT INTO teachers (id, "schoolId", "userId", "employeeId", "qualification", "isActive", "createdAt", "updatedAt")
VALUES (
  'tch_demo_01',
  'cmvwy984q0001qocgpclzv585',
  (SELECT id FROM users WHERE email = 'teacher@ssvm-cuttack.org'),
  'EMP-001',
  'M.Sc. Mathematics, B.Ed',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("userId") DO UPDATE SET "isActive" = true, "employeeId" = 'EMP-001';

-- 3. Parent User
INSERT INTO users (id, email, name, role, "passwordHash", "schoolId", "isActive", "createdAt", "updatedAt")
VALUES (
  'usr_parent_01',
  'parent@ssvm-cuttack.org',
  'Mr. Rajesh Sharma (Guardian)',
  'PARENT',
  '$2b$10$8W1h7bOQmL4cWToSoMIX0eCC7Zy5jGov1MGPxiPeiZY7JTXCImTLu',
  'cmvwy984q0001qocgpclzv585',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "isActive" = true, role = 'PARENT', "schoolId" = 'cmvwy984q0001qocgpclzv585';

-- Guardian Domain Record
INSERT INTO guardians (id, "schoolId", "userId", "primaryName", "primaryPhone", "primaryRelation", "createdAt", "updatedAt")
VALUES (
  'grd_demo_01',
  'cmvwy984q0001qocgpclzv585',
  (SELECT id FROM users WHERE email = 'parent@ssvm-cuttack.org'),
  'Mr. Rajesh Sharma',
  '+919876543210',
  'Father',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET "primaryName" = EXCLUDED."primaryName";

-- 4. Academic Class and Section
INSERT INTO classes (id, "schoolId", "sessionId", name, "sortOrder", "createdAt", "updatedAt")
VALUES (
  'cls_demo_grade10',
  'cmvwy984q0001qocgpclzv585',
  'cmvwy98560003qocgva50fktp',
  'Grade 10',
  10,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO sections (id, "classId", name, "createdAt", "updatedAt")
VALUES (
  'sec_demo_grade10_a',
  'cls_demo_grade10',
  'Section A',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 5. Student User
INSERT INTO users (id, email, name, role, "passwordHash", "schoolId", "isActive", "createdAt", "updatedAt")
VALUES (
  'usr_student_01',
  'student@ssvm-cuttack.org',
  'Aarav Sharma (Student)',
  'STUDENT',
  '$2b$10$8W1h7bOQmL4cWToSoMIX0eCC7Zy5jGov1MGPxiPeiZY7JTXCImTLu',
  'cmvwy984q0001qocgpclzv585',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "isActive" = true, role = 'STUDENT', "schoolId" = 'cmvwy984q0001qocgpclzv585';

-- Student Domain Record (can log in with admissionNo ADM-2026-001 and password Password@123)
INSERT INTO students (id, "schoolId", "userId", "sectionId", "guardianId", "admissionNo", "rollNo", name, password, "isActive", "createdAt", "updatedAt")
VALUES (
  'std_demo_01',
  'cmvwy984q0001qocgpclzv585',
  (SELECT id FROM users WHERE email = 'student@ssvm-cuttack.org'),
  'sec_demo_grade10_a',
  'grd_demo_01',
  'ADM-2026-001',
  '101',
  'Aarav Sharma',
  '$2b$10$8W1h7bOQmL4cWToSoMIX0eCC7Zy5jGov1MGPxiPeiZY7JTXCImTLu',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("admissionNo") DO UPDATE SET password = EXCLUDED.password, "isActive" = true;

-- 6. Fleet Vehicle, Route, Stop and Transport Allocation
INSERT INTO transport_vehicles (id, "schoolId", "registrationNumber", "vehicleType", capacity, status, "createdAt", "updatedAt")
VALUES (
  'veh_demo_bus01',
  'cmvwy984q0001qocgpclzv585',
  'OD-05-AB-1234',
  'BUS',
  40,
  'ACTIVE',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

INSERT INTO transport_routes (id, "schoolId", "vehicleId", name, "createdAt", "updatedAt")
VALUES (
  'rt_demo_01',
  'cmvwy984q0001qocgpclzv585',
  'veh_demo_bus01',
  'Route 1 - Millennium City Loop',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO transport_stops (id, "routeId", name, latitude, longitude, "pickupTime", "dropoffTime", fare, "createdAt", "updatedAt")
VALUES (
  'stp_demo_01',
  'rt_demo_01',
  'College Square Central Station',
  20.4625,
  85.8830,
  '07:45',
  '14:15',
  500.0,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO transport_allocations (id, "schoolId", "studentId", "stopId", "monthCycle", status, "createdAt", "updatedAt")
VALUES (
  'alc_demo_01',
  'cmvwy984q0001qocgpclzv585',
  'std_demo_01',
  'stp_demo_01',
  '2026-11',
  'ACTIVE',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

-- 7. Fee Invoice for Payment & Parent Portals
INSERT INTO invoices (id, "schoolId", "studentId", amount, "amountPaid", "remainingAmount", status, "dueDate", "createdAt", "updatedAt")
VALUES (
  'inv_demo_term1',
  'cmvwy984q0001qocgpclzv585',
  'std_demo_01',
  12500.00,
  0.00,
  12500.00,
  'PENDING',
  NOW() + INTERVAL '30 days',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET "remainingAmount" = 12500.00, status = 'PENDING';
