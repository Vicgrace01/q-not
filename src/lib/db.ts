import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 10_000,
  });

  return new PrismaClient({
    adapter,
    // Neon adds network latency and concurrent requests can wait on the same
    // Trip row lock. Avoid Prisma's 5-second interactive-transaction default.
    transactionOptions:
      process.env.NODE_ENV === "test"
        ? { maxWait: 30_000, timeout: 60_000 }
        : { maxWait: 15_000, timeout: 30_000 },
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
