import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    // Prefer Neon PgBouncer for the running web app. prisma.config.ts continues
    // using DATABASE_URL (the direct endpoint) for migrations and schema tasks.
    connectionString: env.DATABASE_URL_POOLED ?? env.DATABASE_URL,
    max: 4,
    connectionTimeoutMillis: 15_000,
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
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
