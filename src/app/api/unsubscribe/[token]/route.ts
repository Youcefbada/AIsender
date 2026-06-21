import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/email/compliance";

// One-click unsubscribe. Handles both the email-client POST (List-Unsubscribe-
// Post) and a human clicking the footer link (GET). Adds the recipient to the
// user's suppression list so they are never emailed again.
async function unsubscribe(token: string) {
  const emailId = verifyToken(token);
  if (!emailId) return false;
  const email = await prisma.emailMessage.findUnique({
    where: { id: emailId },
    include: { contact: true },
  });
  if (!email?.contact?.email) return false;

  await prisma.$transaction([
    prisma.suppression.upsert({
      where: { userId_email: { userId: email.userId, email: email.contact.email.toLowerCase() } },
      create: { userId: email.userId, email: email.contact.email.toLowerCase(), reason: "unsubscribe" },
      update: {},
    }),
    prisma.emailMessage.update({
      where: { id: emailId },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    }),
    prisma.lead.update({ where: { id: email.leadId }, data: { status: "UNSUBSCRIBED" } }),
    prisma.emailEvent.create({ data: { emailId, type: "unsubscribed" } }),
  ]);
  return true;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  await unsubscribe(token);
  return new Response(null, { status: 204 });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ok = await unsubscribe(token);
  const msg = ok
    ? "You've been unsubscribed. You won't receive further emails."
    : "This unsubscribe link is invalid or expired.";
  return new Response(
    `<!doctype html><html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 20px;color:#0a0a0a">
      <h2>Unsubscribe</h2><p>${msg}</p></body></html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}
