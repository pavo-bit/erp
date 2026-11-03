import { PrismaClient, Prisma } from "@prisma/client";
import logger from "./logger";

export interface DefaultAccountDefinition {
  code: string;
  name: string;
  category: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  type: "CASH" | "BANK" | "RECEIVABLE" | "PAYABLE" | "REVENUE" | "EXPENSE" | "DISCOUNT" | "TAX";
}

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccountDefinition[] = [
  { code: "1010-BANK", name: "Bank Account", category: "ASSET", type: "BANK" },
  { code: "1020-CASH", name: "Cash in Hand", category: "ASSET", type: "CASH" },
  { code: "1200-AR", name: "Accounts Receivable (Students/Fees)", category: "ASSET", type: "RECEIVABLE" },
  { code: "2010-AP", name: "Accounts Payable (Vendors)", category: "LIABILITY", type: "PAYABLE" },
  { code: "3010-RETAINED", name: "Retained Earnings", category: "EQUITY", type: "REVENUE" },
  { code: "4000-TUIT", name: "Tuition Fees Revenue", category: "REVENUE", type: "REVENUE" },
  { code: "4010-ADM", name: "Admission Fees Revenue", category: "REVENUE", type: "REVENUE" },
  { code: "4020-FINE", name: "Late Fines & Penalties Revenue", category: "REVENUE", type: "REVENUE" },
  { code: "4030-OTHER", name: "Other Academic Revenue", category: "REVENUE", type: "REVENUE" },
  { code: "5010-SAL", name: "Salaries & Wages Expense", category: "EXPENSE", type: "EXPENSE" },
  { code: "5020-GEN", name: "General & Administrative Expense", category: "EXPENSE", type: "EXPENSE" },
  { code: "5030-MAINT", name: "Repairs & Maintenance Expense", category: "EXPENSE", type: "EXPENSE" },
  { code: "5040-UTILITY", name: "Utilities & Electricity Expense", category: "EXPENSE", type: "EXPENSE" },
];

/**
 * Idempotently seeds default chart of accounts for a school.
 */
export async function seedDefaultChartOfAccounts(
  client: PrismaClient | Prisma.TransactionClient,
  schoolId: string
): Promise<void> {
  for (const account of DEFAULT_CHART_OF_ACCOUNTS) {
    await client.ledgerAccount.upsert({
      where: {
        schoolId_code: {
          schoolId,
          code: account.code,
        },
      },
      update: {},
      create: {
        schoolId,
        code: account.code,
        name: account.name,
        category: account.category,
        type: account.type,
        isActive: true,
      },
    });
  }
  logger.info({ schoolId, count: DEFAULT_CHART_OF_ACCOUNTS.length }, "Default chart of accounts seeded");
}
