import prisma from "../lib/prisma";
import logger from "../lib/logger";

beforeAll(async () => {
  // Silent logger during tests
  logger.level = "fatal";
});

afterAll(async () => {
  // Disconnect prisma after tests to prevent handle leaks
  await prisma.$disconnect();
});
