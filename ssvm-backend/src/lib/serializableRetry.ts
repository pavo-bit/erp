import { Prisma } from "@prisma/client";

export function isSerializationFailure(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return true;
  const candidate = error as { code?: unknown; meta?: { code?: unknown }; cause?: { code?: unknown } } | null;
  return candidate?.code === "P2034" || candidate?.code === "40001" || candidate?.meta?.code === "40001" || candidate?.cause?.code === "40001";
}

/** Initial attempt plus at most three retries, with bounded randomized backoff. */
export async function withSerializableRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let retry = 0; ; retry++) {
    try { return await operation(); }
    catch (error) {
      if (!isSerializationFailure(error) || retry >= maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 + Math.floor(Math.random() * 61)));
    }
  }
}
