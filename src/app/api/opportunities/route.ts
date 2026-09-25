import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { opportunityPatchSchema } from "@/lib/validation/schemas";
import type {
  OpportunityPlatform,
  OpportunityType,
  IntentLevel,
  OpportunityStatus,
  Prisma,
} from "@prisma/client";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);

    const status = url.searchParams.get("status") as OpportunityStatus | null;
    const platform = url.searchParams.get("platform") as OpportunityPlatform | null;
    const opportunityType = url.searchParams.get("opportunityType") as OpportunityType | null;
    const intentLevel = url.searchParams.get("intentLevel") as IntentLevel | null;
    const minScore = url.searchParams.get("minScore");
    const productProfileId = url.searchParams.get("productProfileId");
    const highIntent = url.searchParams.get("highIntent") === "true";

    const where: Prisma.OpportunityWhereInput = { userId };

    if (status) where.status = status;
    if (platform) where.platform = platform;
    if (opportunityType) where.opportunityType = opportunityType;
    if (intentLevel) where.intentLevel = intentLevel;
    if (productProfileId) where.productProfileId = productProfileId;

    if (highIntent) {
      where.overallScore = { gte: 80 };
    } else if (minScore) {
      where.overallScore = { gte: parseInt(minScore, 10) };
    }

    const opportunities = await prisma.opportunity.findMany({
      where,
      orderBy: [{ overallScore: "desc" }, { createdAt: "desc" }],
      include: {
        productProfile: {
          select: { id: true, name: true, category: true },
        },
      },
      take: 100,
    });

    return NextResponse.json({ opportunities });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/opportunities error:", e);
    return NextResponse.json({ error: "Failed to list opportunities" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const parsed = opportunityPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const body = parsed.data;

    const existing = await prisma.opportunity.findFirst({
      where: { id: body.id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const data: Prisma.OpportunityUpdateInput = {};
    if (body.status) {
      data.status = body.status;
      if (body.status === "CONTACTED") {
        data.contactedAt = new Date();
      }
    }
    if (body.email) {
      data.email = body.email;
    }

    const updated = await prisma.opportunity.update({
      where: { id: body.id },
      data,
    });

    return NextResponse.json({ opportunity: updated });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/opportunities error:", e);
    return NextResponse.json({ error: "Failed to update opportunity" }, { status: 500 });
  }
}
