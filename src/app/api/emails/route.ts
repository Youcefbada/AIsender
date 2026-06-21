import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import type { EmailStatus, Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as EmailStatus | null;

    const where: Prisma.EmailMessageWhereInput = { userId };
    if (status) where.status = status;

    const emails = await prisma.emailMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        lead: { include: { score: true } },
        contact: true,
        campaign: { select: { name: true } },
      },
      take: 100,
    });
    return NextResponse.json({ emails });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
