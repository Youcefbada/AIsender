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
  provider: z.enum(["GEMINI", "GROQ", "OPENROUTER", "RESEND", "SERPER", "SMTP", "REDDIT", "HUNTER"]),
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

export const userCapabilitySchema = z.object({
  skills: z.array(z.string().min(1).max(80)).max(100).optional(),
  services: z.array(z.string().min(1).max(120)).max(100).optional(),
  portfolioLinks: z
    .array(z.object({ title: z.string().min(1).max(120), url: z.string().url() }))
    .max(50)
    .optional(),
  hourlyRateMin: z.number().int().min(0).optional(),
  hourlyRateMax: z.number().int().min(0).optional(),
  bio: z.string().max(4000).optional(),
});

const stringArray = z.array(z.string().min(1).max(500)).max(200);

export const productProfileSchema = z.object({
  id: z.string().min(1).optional(),
  productId: z.string().min(1).optional(),
  name: z.string().min(2).max(120),
  description: z.string().min(10).max(4000),
  offer: z.string().max(8000).optional(),
  category: z.string().max(120).optional(),
  subcategories: stringArray.optional(),
  problemsSolved: stringArray.optional(),
  painPoints: stringArray.optional(),
  useCases: stringArray.optional(),
  targetIndustries: stringArray.optional(),
  targetCompanyTypes: stringArray.optional(),
  targetCompanySizes: stringArray.optional(),
  targetGeographies: stringArray.optional(),
  buyerPersonas: stringArray.optional(),
  decisionMakerRoles: stringArray.optional(),
  strongDemandSignals: stringArray.optional(),
  mediumDemandSignals: stringArray.optional(),
  weakDemandSignals: stringArray.optional(),
  negativeSignals: stringArray.optional(),
  technologies: stringArray.optional(),
  platforms: stringArray.optional(),
  competitors: stringArray.optional(),
  keywords: stringArray.optional(),
  semanticConcepts: stringArray.optional(),
  generatedSearchQueries: z.record(z.array(z.string())).optional(),
  recommendedCommunities: stringArray.optional(),
  status: z.enum(["DRAFT", "ANALYZING", "ACTIVE", "ARCHIVED"]).optional(),
});

// PATCH variant: everything optional except the id comes from the URL.
export const productProfileUpdateSchema = productProfileSchema
  .omit({ name: true, description: true })
  .extend({
    name: z.string().min(2).max(120).optional(),
    description: z.string().min(10).max(4000).optional(),
  });

export const analyzeOfferSchema = z.object({
  offer: z.string().min(5).max(8000),
  name: z.string().max(120).optional(),
  description: z.string().max(4000).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  targetAudience: z.string().max(500).optional(),
  price: z.string().max(80).optional(),
  geo: z.string().max(120).optional(),
  skills: z.array(z.string().min(1).max(80)).max(100).optional(),
});

export const scoutSchema = z.object({
  profileId: z.string().min(1),
  maxToSave: z.number().int().min(1).max(100).optional(),
});

export const opportunityPatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["NEW", "SAVED", "CONTACTED", "IGNORED", "CONVERTED"]).optional(),
  email: z.string().email().optional(),
});

export const senderIdentitySchema = z.object({
  fromName: z.string().min(2).max(80),
  fromEmail: z.string().email(),
  replyTo: z.string().email().optional(),
  channel: z.enum(["RESEND", "SMTP"]).default("RESEND"),
  mailingAddress: z.string().min(5).max(200),
});
