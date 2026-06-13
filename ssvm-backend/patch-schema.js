const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

function addSoftDelete(model) {
  const regex = new RegExp(`(model ${model} \\{[\\s\\S]*?)(@@map|\\})`);
  schema = schema.replace(regex, `$1  deletedAt DateTime?\n  deletedById String?\n\n  $2`);
}

['School', 'Branch', 'User', 'Student', 'Teacher', 'Invoice', 'Admission', 'PaymentTransaction'].forEach(addSoftDelete);

// Add severity to AuditLog
schema = schema.replace(/(model AuditLog \{[\s\S]*?status\s+String\s+@default\("SUCCESS"\))/, `$1\n  severity String @default("INFO")`);

// Add relationships to School specifically
schema = schema.replace(/(model School \{[\s\S]*?)(@@map)/, `$1  schoolFeatures SchoolFeature[]\n  schoolSettings SchoolSettings?\n  brandSettings BrandSettings?\n  webhookEndpoints WebhookEndpoint[]\n  supportTickets SupportTicket[]\n  certificateTemplates CertificateTemplate[]\n  messageThreads MessageThread[]\n\n  $2`);

// Add relationships to User specifically
schema = schema.replace(/(model User \{[\s\S]*?)(@@map)/, `$1  sessions UserSession[]\n  refreshTokens RefreshToken[]\n  supportTickets SupportTicket[]\n  supportMessages SupportMessage[]\n  issuedCertificates IssuedCertificate[]\n  messageParticipants MessageParticipant[]\n  messages Message[]\n\n  $2`);

// Add Phase 12 & 13 Models
schema += `
model UserSession {
  id            String   @id @default(cuid())
  userId        String
  sessionId     String   @unique
  refreshFamily String?
  deviceName    String?
  browser       String?
  ipAddress     String?
  country       String?
  lastSeen      DateTime @default(now())
  isActive      Boolean  @default(true)
  expiresAt     DateTime
  createdAt     DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([sessionId])
  @@map("user_sessions")
}

model RefreshToken {
  id          String   @id @default(cuid())
  tokenHash   String   @unique
  userId      String
  familyId    String
  isRevoked   Boolean  @default(false)
  replacedBy  String?
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([familyId])
  @@map("refresh_tokens")
}

model AdmissionEnquiry {
  id               String   @id @default(cuid())
  schoolId         String
  studentName      String
  parentName       String
  phone            String
  email            String?
  applyingForClass String?
  source           String? // Walk-in, Website, Referral
  status           String   @default("OPEN") // OPEN, CONTACTED, CLOSED, CONVERTED
  remarks          String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([schoolId, status])
  @@map("admission_enquiries")
}

model VisitorLog {
  id           String    @id @default(cuid())
  schoolId     String
  visitorName  String
  phone        String
  purpose      String
  personToMeet String?
  checkIn      DateTime  @default(now())
  checkOut     DateTime?
  remarks      String?

  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([schoolId])
  @@map("visitor_logs")
}

model WebhookEndpoint {
  id         String   @id @default(cuid())
  schoolId   String? // Optional: If null, it's a global webhook
  url        String
  secret     String
  events     String[] // Array of event names
  enabled    Boolean  @default(true)
  retryCount Int      @default(3)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  school School? @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@index([schoolId, enabled])
  @@map("webhook_endpoints")
}

model ScheduledJob {
  id        String    @id @default(cuid())
  name      String
  status    String    @default("ACTIVE") // ACTIVE, PAUSED
  lastRunAt DateTime?
  nextRunAt DateTime?
  failures  Int       @default(0)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@map("scheduled_jobs")
}

model SupportTicket {
  id        String   @id @default(cuid())
  schoolId  String
  userId    String // User who created the ticket
  subject   String
  status    String   @default("OPEN") // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  priority  String   @default("NORMAL") // LOW, NORMAL, HIGH, URGENT
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  school   School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  user     User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages SupportMessage[]

  @@index([schoolId, status])
  @@map("support_tickets")
}

model SupportMessage {
  id           String   @id @default(cuid())
  ticketId     String
  senderId     String
  content      String
  isSuperAdmin Boolean  @default(false)
  createdAt    DateTime @default(now())

  ticket SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  sender User          @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@index([ticketId])
  @@map("support_messages")
}

model CertificateTemplate {
  id          String   @id @default(cuid())
  schoolId    String
  name        String // e.g., Bonafide, Transfer
  contentHtml String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  school School              @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  issued IssuedCertificate[]

  @@index([schoolId])
  @@map("certificate_templates")
}

model IssuedCertificate {
  id               String   @id @default(cuid())
  templateId       String
  studentId        String
  issuedById       String
  qrHash           String   @unique
  status           String   @default("VALID") // VALID, REVOKED
  revocationReason String?
  issuedAt         DateTime @default(now())

  template CertificateTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  student  Student             @relation(fields: [studentId], references: [id], onDelete: Cascade)
  issuedBy User                @relation(fields: [issuedById], references: [id], onDelete: Cascade)

  @@index([templateId])
  @@index([studentId])
  @@map("issued_certificates")
}

model MessageThread {
  id        String   @id @default(cuid())
  schoolId  String
  subject   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  school       School               @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  messages     Message[]
  participants MessageParticipant[]

  @@index([schoolId])
  @@map("message_threads")
}

model MessageParticipant {
  id         String    @id @default(cuid())
  threadId   String
  userId     String
  joinedAt   DateTime  @default(now())
  lastReadAt DateTime?

  thread MessageThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  user   User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([threadId, userId])
  @@map("message_participants")
}

model Message {
  id        String   @id @default(cuid())
  threadId  String
  senderId  String
  content   String
  createdAt DateTime @default(now())

  thread      MessageThread       @relation(fields: [threadId], references: [id], onDelete: Cascade)
  sender      User                @relation(fields: [senderId], references: [id], onDelete: Cascade)
  attachments MessageAttachment[]

  @@index([threadId])
  @@map("messages")
}

model MessageAttachment {
  id        String   @id @default(cuid())
  messageId String
  fileUrl   String
  fileName  String
  fileSize  Int
  createdAt DateTime @default(now())

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@index([messageId])
  @@map("message_attachments")
}

model FeatureFlag {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  description String?
  isDefault   Boolean  @default(false)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  schoolFeatures SchoolFeature[]

  @@map("feature_flags")
}

model SchoolFeature {
  id        String   @id @default(cuid())
  schoolId  String
  featureId String
  isEnabled Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  school  School      @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  feature FeatureFlag @relation(fields: [featureId], references: [id], onDelete: Cascade)

  @@unique([schoolId, featureId])
  @@map("school_features")
}

model SchoolSettings {
  id          String   @id @default(cuid())
  schoolId    String   @unique
  timezone    String   @default("Asia/Kolkata")
  dateFormat  String   @default("DD/MM/YYYY")
  currency    String   @default("INR")
  academicYear String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@map("school_settings")
}

model BrandSettings {
  id               String   @id @default(cuid())
  schoolId         String   @unique
  primaryColor     String?
  secondaryColor   String?
  accentColor      String?
  logoUrl          String?
  faviconUrl       String?
  customDomain     String?  @unique
  loginBannerUrl   String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@map("brand_settings")
}
`;

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log("Schema patched successfully with ALL models.");
