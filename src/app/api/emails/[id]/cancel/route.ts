import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

// Drop a draft/approved email before it sends.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const email = await prisma.emailMessage.findFirst({ where: { id, userId } });
    if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (["SENT", "DELIVERED", "OPENED", "CLICKED", "REPLIED"].includes(email.status)) {
      return NextResponse.json({ error: "Already sent" }, { status: 409 });
    }
    const updated = await prisma.emailMessage.update({
      where: { id },
      data: { status: "CANCELED" },
    });
    await prisma.auditLog.create({
      data: { userId, action: "email.cancel", entity: "EmailMessage", entityId: id },
    });
    return NextResponse.json({ email: updated });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
