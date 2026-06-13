const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let s = fs.readFileSync(schemaPath, 'utf8');

// Fix User model
s = s.replace(/password\s+String/, 'passwordHash String');

// Fix DocumentRepository
s = s.replace(/(model DocumentRepository \{[\s\S]*?)(@@map)/, '$1  scanStatus String @default("PENDING")\n\n  $2');

// Fix PaymentTransaction
s = s.replace(/(model PaymentTransaction \{[\s\S]*?)(@@map)/, '$1  gatewayPaymentId String? @unique\n\n  $2');

// Fix UserSession
s = s.replace(/lastSeen\s+DateTime/g, 'lastUsedAt DateTime');

// Fix Role Enum
s = s.replace(/(enum Role \{[\s\S]*?)(SUPER_ADMIN)/, '$1SCHOOL_ADMIN\n  $2');

// Add SchoolRegistrationRequest
s += `
model SchoolRegistrationRequest {
  id String @id @default(cuid())
  schoolName String
  contactEmail String
  contactName String?
  contactPhone String?
  status String @default("PENDING")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("school_registration_requests")
}
`;

fs.writeFileSync(schemaPath, s, 'utf8');
console.log('Schema fixed successfully.');
