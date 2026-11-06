import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { rlsTestPrisma as prisma } from "./setup";

describe("receipt uniqueness migration precheck", () => {
  it("reports duplicate school and receipt pairs from duplicate fixtures", async () => {
    const migration = fs.readFileSync(path.resolve(process.cwd(), "prisma/migrations/20261104020000_receipt_unique_indexes/migration.sql"), "utf8");
    expect(migration.indexOf("HAVING COUNT(*) > 1")).toBeLessThan(migration.indexOf("CREATE UNIQUE INDEX"));
    expect(migration).toContain("USING DETAIL = duplicate_rows");

    const duplicates = await prisma.$queryRaw<Array<{ source: string; schoolId: string; receiptNo: string; count: bigint }>>`
      WITH receipt_fixture(source, "schoolId", "receiptNo") AS (
        VALUES ('invoices', 'school-a', 'REC-DUPLICATE'),
               ('invoices', 'school-a', 'REC-DUPLICATE'),
               ('invoices', 'school-b', 'REC-DUPLICATE'),
               ('payment_transactions', 'school-a', 'REC-DUPLICATE'),
               ('payment_transactions', 'school-a', 'REC-DUPLICATE')
      )
      SELECT source, "schoolId", "receiptNo", COUNT(*) AS count
      FROM receipt_fixture
      WHERE "receiptNo" IS NOT NULL
      GROUP BY source, "schoolId", "receiptNo"
      HAVING COUNT(*) > 1
      ORDER BY source
    `;

    expect(duplicates).toEqual([
      { source: "invoices", schoolId: "school-a", receiptNo: "REC-DUPLICATE", count: 2n },
      { source: "payment_transactions", schoolId: "school-a", receiptNo: "REC-DUPLICATE", count: 2n },
    ]);
  });
});
