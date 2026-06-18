import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	PORT: z.coerce.number().default(3000),
	DATABASE_URL: z.string().min(1),
	BETTER_AUTH_SECRET: z.string().min(1),
	BETTER_AUTH_URL: z.string().url(),
	GOOGLE_CLIENT_ID: z.string().min(1),
	GOOGLE_CLIENT_SECRET: z.string().min(1),
	OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
	OLLAMA_MODEL: z.string().default("llama3.2:3b"),
	MAIL_USER: z.string().email().optional(),
	MAIL_APP_PASSWORD: z.string().optional(),
	MAIL_FROM_NAME: z.string().default("Attendance System"),
	ALERT_EARLY_WARNING_THRESHOLD: z.coerce.number().default(80),
	ALERT_DETENTION_THRESHOLD: z.coerce.number().default(75),
	ALERT_CRITICAL_THRESHOLD: z.coerce.number().default(65),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
	process.exit(1);
}

export const env = parsed.data;
