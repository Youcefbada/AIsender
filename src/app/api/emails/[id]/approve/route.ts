import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

// The approval gate. Moves a PENDING_APPROVAL draft to APPROVED so the dispatch
// worker may send it. Optional scheduledAt lets the user defer.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const email = await prisma.emailMessage.findFirst({ where: { id, userId } });
    if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (email.status !== "PENDING_APPROVAL") {
      return NextResponse.json({ error: `Cannot approve from ${email.status}` }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt) : null;

    const updated = await prisma.emailMessage.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date(), scheduledAt },
    });
    await prisma.auditLog.create({
      data: { userId, action: "email.approve", entity: "EmailMessage", entityId: id },
    });
    return NextResponse.json({ email: updated });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
