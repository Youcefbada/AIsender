import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { createCampaignSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const userId = await requireUserId();
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true } },
        icp: { select: { name: true } },
        _count: { select: { leads: true, emails: true } },
      },
    });
    return NextResponse.json({ campaigns });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const parsed = createCampaignSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    // ownership check on the product
    const product = await prisma.product.findFirst({
      where: { id: parsed.data.productId, userId },
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const campaign = await prisma.campaign.create({
      data: { ...parsed.data, userId },
    });
    await prisma.auditLog.create({
      data: { userId, action: "campaign.create", entity: "Campaign", entityId: campaign.id },
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
