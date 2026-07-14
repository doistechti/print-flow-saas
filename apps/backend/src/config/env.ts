import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  SESSION_SECRET: z.string().min(16).default("print-flow-local-session-secret"),
  PAYMENT_API_MODE: z.enum(["mock", "http"]).default("mock"),
  PAYMENT_API_BASE_URL: z.string().url().optional(),
  PAYMENT_API_TOKEN: z.string().min(1).optional(),
  PAYMENT_API_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
});

export const env = envSchema.parse(process.env);

