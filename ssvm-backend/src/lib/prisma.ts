import { PrismaClient } from "@prisma/client";

const basePrisma = new PrismaClient();

// Add soft delete extension
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const softDeleteModels = ['School', 'User', 'Student', 'Teacher', 'Invoice', 'Admission', 'PaymentTransaction'];
        
        if (softDeleteModels.includes(model as string)) {
          if (operation === 'delete') {
            // @ts-ignore
            return basePrisma[model.charAt(0).toLowerCase() + model.slice(1)].update({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          }
          if (operation === 'deleteMany') {
            // @ts-ignore
            return basePrisma[model.charAt(0).toLowerCase() + model.slice(1)].updateMany({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          }
          if (operation === 'findUnique' || operation === 'findFirst' || operation === 'findMany' || operation === 'count') {
            // Include deleted records only if explicitly requested
            // @ts-ignore
            if (args.where?.deletedAt === undefined) {
              // @ts-ignore
              args.where = { ...args.where, deletedAt: null };
            }
            return query(args);
          }
        }
        return query(args);
      },
    },
  },
});

export default prisma as unknown as PrismaClient;
