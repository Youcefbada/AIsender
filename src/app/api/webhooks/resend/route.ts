import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// Resend webhook receiver: delivery / open / click / bounce / complaint.
// Maps provider events onto EmailMessage state and feeds the suppression list on
// bounces & complaints (critical for deliverability + compliance).
//
// NOTE: Resend signs webhooks with Svix. For production, verify the
// svix-signature header against RESEND_WEBHOOK_SECRET before trusting the body.
// Left as a clearly-marked TODO to avoid adding the svix dependency here.

interface ResendEvent {
  type: string;
  data?: { email_id?: string; id?: string; to?: string[] | string };
}

export async function POST(req: Request) {
  let event: ResendEvent;
  try {
    event = (await req.json()) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const providerMessageId = event.data?.email_id || event.data?.id;
  if (!providerMessageId) return NextResponse.json({ ok: true });

  const email = await prisma.emailMessage.findFirst({ where: { providerMessageId } });
  if (!email) return NextResponse.json({ ok: true });

  const now = new Date();
  const type = event.type.replace("email.", "");

  try {
    await prisma.emailEvent.create({
      data: { emailId: email.id, type, payload: event as unknown as Prisma.InputJsonValue },
    });

    switch (type) {
      case "delivered":
        await prisma.emailMessage.update({ where: { id: email.id }, data: { status: "DELIVERED" } });
        break;
      case "opened":
        await prisma.emailMessage.update({
          where: { id: email.id },
          data: { openedAt: email.openedAt ?? now, openCount: { increment: 1 }, status: "OPENED" },
        });
        break;
      case "clicked":
        await prisma.emailMessage.update({
          where: { id: email.id },
          data: { clickedAt: email.clickedAt ?? now, clickCount: { increment: 1 }, status: "CLICKED" },
        });
        break;
      case "bounced":
      case "complained": {
        const to =
          Array.isArray(event.data?.to) ? event.data?.to[0] : event.data?.to;
        if (to) {
          await prisma.suppression.upsert({
            where: { userId_email: { userId: email.userId, email: to.toLowerCase() } },
            create: { userId: email.userId, email: to.toLowerCase(), reason: type },
            update: {},
          });
        }
        await prisma.emailMessage.update({
          where: { id: email.id },
          data: {
            status: type === "bounced" ? "BOUNCED" : "COMPLAINED",
            bouncedAt: type === "bounced" ? now : email.bouncedAt,
            complainedAt: type === "complained" ? now : email.complainedAt,
          },
        });
        await prisma.lead.update({ where: { id: email.leadId }, data: { status: "BOUNCED" } });
        break;
      }
    }
  } catch (err) {
    console.error("resend webhook error", err);
  }

  return NextResponse.json({ ok: true });
}
