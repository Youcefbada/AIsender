import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { analyzeProduct } from "@/services/analyze-product";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    // User isolation: confirm ownership before doing any work.
    const product = await prisma.product.findFirst({ where: { id, userId } });
    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const analysis = await analyzeProduct(id);
    await prisma.auditLog.create({
      data: { userId, action: "product.analyze", entity: "Product", entityId: id },
    });
    return NextResponse.json({ analysis });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("analyze error", e);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
