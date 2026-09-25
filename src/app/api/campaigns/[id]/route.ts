import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  dailyLimit: z.number().int().min(1).max(50).optional(),
  minScore: z.number().int().min(0).max(100).optional(),
  autoSend: z.boolean().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
  senderIdentityId: z.string().cuid().nullable().optional(),
  icpId: z.string().cuid().nullable().optional(),
});

async function owned(id: string, userId: string) {
  return prisma.campaign.findFirst({ where: { id, userId } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    if (!(await owned(id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { senderIdentityId, icpId } = parsed.data;
    if (senderIdentityId) {
      const identity = await prisma.senderIdentity.findFirst({
        where: { id: senderIdentityId, userId },
      });
      if (!identity) {
        return NextResponse.json({ error: "Sender identity not found" }, { status: 404 });
      }
    }
    if (icpId) {
      const icp = await prisma.icp.findFirst({
        where: { id: icpId, product: { userId } },
      });
      if (!icp) return NextResponse.json({ error: "ICP not found" }, { status: 404 });
    }
    const campaign = await prisma.campaign.update({ where: { id }, data: parsed.data });
    await prisma.auditLog.create({ data: { userId, action: "campaign.update", entity: "Campaign", entityId: id } });
    return NextResponse.json({ campaign });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    if (!(await owned(id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.campaign.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId, action: "campaign.delete", entity: "Campaign", entityId: id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
