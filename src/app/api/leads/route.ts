import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import type { LeadStatus, Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as LeadStatus | null;
    const campaignId = searchParams.get("campaignId");
    const minScore = Number(searchParams.get("minScore") ?? 0);

    const where: Prisma.LeadWhereInput = { userId, scoreTotal: { gte: minScore } };
    if (status) where.status = status;
    if (campaignId) where.campaignId = campaignId;

    const leads = await prisma.lead.findMany({
      where,
      orderBy: [{ scoreTotal: "desc" }, { createdAt: "desc" }],
      include: { score: true, contacts: true },
      take: 200,
    });
    return NextResponse.json({ leads });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
