import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function runExplainAnalyze(queryName: string, rawQuery: string): Promise<string> {
  console.log(`Running EXPLAIN ANALYZE for ${queryName}...`);
  try {
    const result = await prisma.$queryRawUnsafe<any[]>(rawQuery);
    
    let explainOutput = `\n--- ${queryName} ---\n`;
    for (const row of result) {
      explainOutput += Object.values(row)[0] + '\n';
    }
    return explainOutput;
  } catch (error: any) {
    console.error(`Error running query for ${queryName}:`, error.message);
    return `\n--- ${queryName} ---\nError: ${error.message}\n`;
  }
}

async function main() {
  const schoolId = 'test-school-id';
  const targetDate = new Date().toISOString();
  
  const queries = [
    {
      name: 'Attendance (schoolId, date)',
      query: `EXPLAIN ANALYZE SELECT * FROM "attendance" WHERE "schoolId" = '${schoolId}' AND "date" = '${targetDate}'`
    },
    {
      name: 'Invoices (schoolId, status=OVERDUE)',
      query: `EXPLAIN ANALYZE SELECT * FROM "invoices" WHERE "schoolId" = '${schoolId}' AND "status" = 'OVERDUE'`
    },
    {
      name: 'Student Lookup (schoolId, admissionNo)',
      query: `EXPLAIN ANALYZE SELECT * FROM "students" WHERE "schoolId" = '${schoolId}' AND "admissionNo" = 'ADM123'`
    },
    {
      name: 'Teacher Attendance (teacherId, date)',
      query: `EXPLAIN ANALYZE SELECT * FROM "teacher_attendance" WHERE "teacherId" = 'teacher-1' AND "date" = '${targetDate}'`
    },
    {
      name: 'Notification (schoolId, status)',
      query: `EXPLAIN ANALYZE SELECT * FROM "notifications" WHERE "schoolId" = '${schoolId}' AND "status" = 'UNREAD'`
    }
  ];

  let fullReport = '=== Query Performance Report ===\n';
  fullReport += `Date: ${new Date().toISOString()}\n\n`;

  for (const q of queries) {
    const output = await runExplainAnalyze(q.name, q.query);
    fullReport += output;
  }

  const reportPath = path.join(__dirname, 'query-performance-report.txt');
  fs.writeFileSync(reportPath, fullReport);
  console.log(`Report generated and saved to ${reportPath}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
