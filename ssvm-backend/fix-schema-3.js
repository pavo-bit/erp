const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let s = fs.readFileSync(schemaPath, 'utf8');

// Fix User model password -> passwordHash
s = s.replace(/password\s+String/, 'passwordHash String');

// Fix DocumentRepository scanStatus
s = s.replace(/(model DocumentRepository \{[\s\S]*?)(@@map)/, '$1  scanStatus String @default("PENDING")\n  scanResult String?\n\n  $2');

// Fix PaymentTransaction gatewayPaymentId
s = s.replace(/(model PaymentTransaction \{[\s\S]*?)(@@map)/, '$1  gatewayPaymentId String? @unique\n\n  $2');

// Fix WebhookEndpoint
s = s.replace(/(model WebhookEndpoint \{[\s\S]*?)(@@map)/, '$1  user User? @relation(fields: [userId], references: [id])\n  userId String?\n\n  $2');

// Fix SchoolRegistrationRequest
s = s.replace(/model SchoolRegistrationRequest \{[\s\S]*?\}/, '');

s += `
model SchoolRegistrationRequest {
  id String @id @default(cuid())
  schoolName String
  email String @unique
  principalName String?
  phone String?
  address String?
  status String @default("PENDING")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("school_registration_requests")
}
`;

fs.writeFileSync(schemaPath, s, 'utf8');
console.log('Schema fixed perfectly.');
