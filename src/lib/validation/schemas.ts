import { z } from "zod";

// Input validation at every trust boundary. Reject early, fail loud.

export const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_.-]+$/, "letters, numbers, . _ - only"),
  password: z.string().min(8).max(200),
  email: z.string().email().optional().or(z.literal("")),
  name: z.string().max(80).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// API-key entry (per user). For SMTP, `value` is JSON {host,port,user,pass}.
export const apiKeySchema = z.object({
  provider: z.enum(["GEMINI", "GROQ", "OPENROUTER", "RESEND", "SERPER", "SMTP"]),
  value: z.string().min(1).max(4000),
});

export const createProductSchema = z.object({
  name: z.string().min(2).max(120),
  url: z.string().url(),
  affiliateUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().min(10).max(4000),
  notes: z.string().max(4000).optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const createCampaignSchema = z.object({
  productId: z.string().cuid(),
  icpId: z.string().cuid().optional(),
  name: z.string().min(2).max(120),
  dailyLimit: z.number().int().min(1).max(50).default(20),
  minScore: z.number().int().min(0).max(100).default(80),
  autoSend: z.boolean().default(false),
  senderIdentityId: z.string().cuid().optional(),
});

export const senderIdentitySchema = z.object({
  fromName: z.string().min(2).max(80),
  fromEmail: z.string().email(),
  replyTo: z.string().email().optional(),
  channel: z.enum(["RESEND", "SMTP"]).default("RESEND"),
  mailingAddress: z.string().min(5).max(200),
});
