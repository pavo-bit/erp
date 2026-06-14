import { PrismaClient, LedgerCategory, LedgerAccountType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Enterprise Ledger Chart of Accounts...');

  // Define generic default school (if applicable to a single tenant environment initially)
  // We'll create a system tenant if none exist for demonstration
  let school = await prisma.school.findFirst();
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: 'Enterprise Default School',
        code: 'SYS-001',
      }
    });
  }

  const schoolId = school.id;

  const coreAccounts = [
    // Assets
    { code: '1000-CASH', name: 'Petty Cash', category: LedgerCategory.ASSET, type: LedgerAccountType.CASH },
    { code: '1010-BANK', name: 'Main Operating Bank', category: LedgerCategory.ASSET, type: LedgerAccountType.BANK },
    { code: '1200-AR', name: 'Accounts Receivable (Fees)', category: LedgerCategory.ASSET, type: LedgerAccountType.RECEIVABLE },
    
    // Liabilities
    { code: '2000-AP', name: 'Accounts Payable', category: LedgerCategory.LIABILITY, type: LedgerAccountType.PAYABLE },
    { code: '2100-TAX', name: 'Tax Payable (GST)', category: LedgerCategory.LIABILITY, type: LedgerAccountType.TAX },
    
    // Equity
    { code: '3000-EQ', name: 'Retained Earnings', category: LedgerCategory.EQUITY, type: LedgerAccountType.REVENUE }, // Assuming Revenue bucket for general retained
    { code: '3100-CAP', name: 'Owner Capital', category: LedgerCategory.EQUITY, type: LedgerAccountType.REVENUE },

    // Revenues
    { code: '4000-TUIT', name: 'Tuition Fees', category: LedgerCategory.REVENUE, type: LedgerAccountType.REVENUE },
    { code: '4010-ADM', name: 'Admission Fees', category: LedgerCategory.REVENUE, type: LedgerAccountType.REVENUE },
    { code: '4020-TRAN', name: 'Transport Fees', category: LedgerCategory.REVENUE, type: LedgerAccountType.REVENUE },
    { code: '4030-LIB', name: 'Library Fines', category: LedgerCategory.REVENUE, type: LedgerAccountType.REVENUE },
    { code: '4100-LATE', name: 'Late Fee Penalties', category: LedgerCategory.REVENUE, type: LedgerAccountType.REVENUE },

    // Expenses
    { code: '5000-SAL', name: 'Salary Expense', category: LedgerCategory.EXPENSE, type: LedgerAccountType.EXPENSE },
    { code: '5010-UTIL', name: 'Utility Expense', category: LedgerCategory.EXPENSE, type: LedgerAccountType.EXPENSE },
    { code: '5020-DISC', name: 'Fee Discounts & Waivers', category: LedgerCategory.EXPENSE, type: LedgerAccountType.DISCOUNT },
  ];

  let createdCount = 0;
  for (const acc of coreAccounts) {
    const existing = await prisma.ledgerAccount.findUnique({
      where: {
        schoolId_code: {
          schoolId,
          code: acc.code,
        }
      }
    });

    if (!existing) {
      await prisma.ledgerAccount.create({
        data: {
          ...acc,
          schoolId,
        }
      });
      createdCount++;
    }
  }

  console.log(`Seeded ${createdCount} Core Ledger Accounts for school ${schoolId}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
