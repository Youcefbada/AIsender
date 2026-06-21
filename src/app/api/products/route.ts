import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { createProductSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const userId = await requireUserId();
    const products = await prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { analysis: true, _count: { select: { campaigns: true } } },
    });
    return NextResponse.json({ products });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { affiliateUrl, ...rest } = parsed.data;
    const product = await prisma.product.create({
      data: { ...rest, affiliateUrl: affiliateUrl || null, userId },
    });
    await prisma.auditLog.create({
      data: { userId, action: "product.create", entity: "Product", entityId: product.id },
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
