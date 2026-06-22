import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { getUserEmailCreds } from "@/lib/keys";
import { config } from "@/lib/config";
import {
  complianceHeaders,
  decorateHtml,
  decorateText,
} from "@/lib/email/compliance";

// Send-queue worker (STEP 7). Picks approved emails that are due, paces them
// inside each campaign's send window + daily limit, injects compliance footer
// and tracking, sends, and records the attempt. Idempotent per email row.

export async function dispatchDueEmails(
  now = new Date(),
  max = 12,
): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  // Only APPROVED (human-approved) or auto-approved messages are eligible.
  // `max` keeps a single cron tick under the Passenger request timeout; call the
  // dispatch endpoint frequently to drain the queue.
  const due = await prisma.emailMessage.findMany({
    where: {
      status: "APPROVED",
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
    },
    include: {
      campaign: { include: { product: { select: { name: true, url: true, affiliateUrl: true } } } },
      contact: true,
      senderIdentity: true,
    },
    take: max,
  });

  for (const email of due) {
    try {
      const c = email.campaign;
      const hour = now.getUTCHours(); // simplification: campaign.timezone handling TODO
      if (hour < c.sendWindowStart || hour >= c.sendWindowEnd) {
        skipped++;
        continue;
      }

      // per-campaign daily cap
      const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const sentToday = await prisma.emailMessage.count({
        where: { campaignId: c.id, sentAt: { gte: startOfDay } },
      });
      if (sentToday >= c.dailyLimit) {
        skipped++;
        continue;
      }

      const to = email.contact?.email;
      if (!to) {
        await prisma.emailMessage.update({ where: { id: email.id }, data: { status: "FAILED", lastError: "no contact email" } });
        continue;
      }

      // last-second suppression guard
      const suppressed = await prisma.suppression.findUnique({
        where: { userId_email: { userId: email.userId, email: to.toLowerCase() } },
      });
      if (suppressed) {
        await prisma.emailMessage.update({ where: { id: email.id }, data: { status: "CANCELED", lastError: "suppressed" } });
        continue;
      }

      const fromName = email.senderIdentity?.fromName ?? config.emailFromName;
      const fromEmail = email.senderIdentity?.fromEmail ?? config.emailFrom;
      const mailingAddress = email.senderIdentity?.mailingAddress ?? config.emailMailingAddress;

      await prisma.emailMessage.update({ where: { id: email.id }, data: { status: "SENDING", attempts: { increment: 1 } } });

      // Use the sender's own Resend/SMTP credentials when they've set them.
      const creds = await getUserEmailCreds(email.userId);

      // Tracked call-to-action button → the affiliate (or product) link.
      const product = email.campaign.product;
      const ctaUrl = product.affiliateUrl || product.url;
      const cta = ctaUrl ? { url: ctaUrl, label: product.name } : undefined;

      const result = await sendEmail(
        {
          to,
          fromName,
          fromEmail,
          replyTo: email.senderIdentity?.replyTo ?? undefined,
          subject: email.subject,
          html: decorateHtml({ emailId: email.id, html: email.bodyHtml, fromName, mailingAddress, track: true, cta }),
          text: decorateText({ emailId: email.id, text: email.bodyText, fromName, mailingAddress, cta }),
          headers: complianceHeaders(email.id),
        },
        email.senderIdentity?.channel ?? "RESEND",
        creds,
      );

      await prisma.emailMessage.update({
        where: { id: email.id },
        data: { status: "SENT", sentAt: now, channel: result.channel, providerMessageId: result.providerMessageId },
      });
      await prisma.lead.update({ where: { id: email.leadId }, data: { status: "CONTACTED" } });
      sent++;
    } catch (err) {
      await prisma.emailMessage.update({
        where: { id: email.id },
        data: { status: email.attempts >= 3 ? "FAILED" : "APPROVED", lastError: String(err) },
      });
    }
  }

  return { sent, skipped };
}
