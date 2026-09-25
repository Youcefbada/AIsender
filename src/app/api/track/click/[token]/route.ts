import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/email/compliance";

// Click tracker: records the click, then redirects to the real target (?u=).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const emailId = verifyToken(token);
  const target = new URL(req.url).searchParams.get("u");

  if (emailId && target) {
    try {
      const email = await prisma.emailMessage.findUnique({ where: { id: emailId } });
      if (email) {
        await prisma.$transaction([
          prisma.emailMessage.update({
            where: { id: emailId },
            data: {
              clickedAt: email.clickedAt ?? new Date(),
              clickCount: { increment: 1 },
              status: ["SENT", "DELIVERED", "OPENED"].includes(email.status) ? "CLICKED" : email.status,
            },
          }),
          prisma.emailEvent.create({ data: { emailId, type: "clicked", payload: { target } } }),
        ]);
      }

      // Only redirect to http(s) targets, and only for verified tokens, to
      // avoid open-redirect abuse.
      if (target && /^https?:\/\//i.test(target)) {
        return NextResponse.redirect(target, 302);
      }
      return NextResponse.json({ ok: true });
    } catch {
      // fall through to 404 below
    }
  }

  return NextResponse.json({ error: "Invalid link" }, { status: 404 });
}
