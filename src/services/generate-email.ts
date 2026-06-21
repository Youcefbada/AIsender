import { prisma } from "@/lib/db";
import { chatComplete, parseJsonResponse } from "@/lib/ai/openrouter";
import { emailPrompt } from "@/lib/ai/prompts";
import { detectLanguage } from "@/lib/locale-detect";
import type { Provider } from "@/lib/ai/models";

// STEP 6: generate a personalized draft for a qualified, contactable lead.
// Creates an EmailMessage in PENDING_APPROVAL (or APPROVED when autoSend).

interface GenerateArgs {
  campaignId: string;
  leadId: string;
  contactId: string;
  stepOrder?: number;
  stepPurpose?: string;
  providerKeys?: Partial<Record<Provider, string>>;
}

export async function generateEmail(args: GenerateArgs) {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: args.campaignId },
    include: {
      product: { include: { analysis: true } },
      icp: true,
      senderIdentity: true,
    },
  });
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: args.leadId },
    include: { research: true },
  });
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: args.contactId } });

  const analysis = campaign.product.analysis;
  const angles = (analysis?.outreachAngles as string[]) ?? ["relevant to your work"];
  const benefits = (analysis?.benefits as string[]) ?? ["save time"];
  const services = (lead.research?.services as string[]) ?? [];
  const hooks = (lead.research?.personalizationHooks as string[]) ?? [];

  const { content, model } = await chatComplete({
    task: "email",
    providerKeys: args.providerKeys,
    jsonMode: true,
    temperature: 0.7,
    messages: emailPrompt({
      productName: campaign.product.name,
      productUrl: campaign.product.url,
      affiliateUrl: campaign.product.affiliateUrl,
      outreachAngle: angles[(args.stepOrder ?? 0) % angles.length],
      benefit: benefits[(args.stepOrder ?? 0) % benefits.length],
      senderName: campaign.senderIdentity?.fromName ?? "The team",
      language: detectLanguage(lead.geo, lead.domain),
      stepPurpose: args.stepPurpose,
      lead: {
        company: lead.company,
        contactName: contact.name,
        services: services.join(", ") || null,
        hooks: hooks.join("; ") || null,
      },
    }),
  });

  const draft = parseJsonResponse<{ subject: string; bodyText: string; bodyHtml: string }>(content);

  const email = await prisma.emailMessage.create({
    data: {
      userId: campaign.userId,
      campaignId: campaign.id,
      leadId: lead.id,
      contactId: contact.id,
      senderIdentityId: campaign.senderIdentityId,
      stepOrder: args.stepOrder ?? 0,
      subject: draft.subject,
      bodyHtml: draft.bodyHtml,
      bodyText: draft.bodyText,
      model,
      status: campaign.autoSend ? "APPROVED" : "PENDING_APPROVAL",
      approvedAt: campaign.autoSend ? new Date() : null,
    },
  });

  await prisma.lead.update({ where: { id: lead.id }, data: { status: "DRAFTED" } });
  return email;
}
