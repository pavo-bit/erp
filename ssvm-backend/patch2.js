const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Add relationships to School specifically
schema = schema.replace(/(model School \{[\s\S]*?)(@@map)/, `$1  schoolFeatures SchoolFeature[]\n  schoolSettings SchoolSettings?\n  brandSettings BrandSettings?\n\n  $2`);

// Add Phase 13B Models
schema += `
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
console.log("Schema patched successfully with Phase 13B models.");
