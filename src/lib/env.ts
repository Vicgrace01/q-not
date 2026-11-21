import { z } from "zod";

const optionalNonEmpty = z.string().trim().min(1).optional();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_URL_POOLED: z.string().url().optional(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  GOOGLE_CLIENT_ID: optionalNonEmpty,
  GOOGLE_CLIENT_SECRET: optionalNonEmpty,
  RESEND_API_KEY: optionalNonEmpty,
  RESEND_FROM_EMAIL: optionalNonEmpty,
  TERMII_API_KEY: optionalNonEmpty,
  TERMII_BASE_URL: z.string().url().optional(),
  TERMII_SENDER_ID: optionalNonEmpty,
  TERMII_CHANNEL: z.enum(["generic", "dnd"]).default("dnd"),
  PAYSTACK_SECRET_KEY: optionalNonEmpty,
  PAYSTACK_PUBLIC_KEY: optionalNonEmpty,
  PAYSTACK_WEBHOOK_SECRET: optionalNonEmpty,
  NEXT_PUBLIC_MAP_TILE_URL: z.string().url().optional(),
  QNOT_ROUTING_BASE_URL: z.string().url().default("https://router.project-osrm.org"),
  QNOT_NETWORK_ADMIN_EMAILS: z.string().optional(),
  QNOT_CRON_SECRET: optionalNonEmpty,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
