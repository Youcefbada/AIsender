import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/email/compliance";

// 1x1 transparent GIF open pixel. Records first open + increments count.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const clean = token.replace(/\.png$/i, "").replace(/\.gif$/i, "");
  const emailId = verifyToken(clean);

  if (emailId) {
    try {
      const email = await prisma.emailMessage.findUnique({ where: { id: emailId } });
      if (email && !["BOUNCED", "UNSUBSCRIBED", "COMPLAINED"].includes(email.status)) {
        await prisma.$transaction([
          prisma.emailMessage.update({
            where: { id: emailId },
            data: {
              openedAt: email.openedAt ?? new Date(),
              openCount: { increment: 1 },
              status: ["SENT", "DELIVERED"].includes(email.status) ? "OPENED" : email.status,
            },
          }),
          prisma.emailEvent.create({ data: { emailId, type: "opened" } }),
        ]);
      }
    } catch {
      // never fail the pixel request
    }
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Content-Length": String(PIXEL.length),
    },
  });
}
