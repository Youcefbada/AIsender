import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  url: z.string().url().optional(),
  affiliateUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().min(10).max(4000).optional(),
  notes: z.string().max(4000).optional(),
});

async function owned(id: string, userId: string) {
  return prisma.product.findFirst({ where: { id, userId } });
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
    const { affiliateUrl, ...rest } = parsed.data;
    const product = await prisma.product.update({
      where: { id },
      data: { ...rest, ...(affiliateUrl !== undefined ? { affiliateUrl: affiliateUrl || null } : {}) },
    });
    await prisma.auditLog.create({ data: { userId, action: "product.update", entity: "Product", entityId: id } });
    return NextResponse.json({ product });
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
    // Cascades remove analysis, ICPs, campaigns, leads, emails, etc.
    await prisma.product.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId, action: "product.delete", entity: "Product", entityId: id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
