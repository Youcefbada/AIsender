import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { consumeQuota, QUOTAS } from "@/lib/ratelimit";
import { scoutSchema } from "@/lib/validation/schemas";
import { runOpportunityScout } from "@/services/opportunity-scout";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();

    const parsed = scoutSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "profileId is required", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const body = parsed.data;

    const quota = await consumeQuota(userId, "ai:calls:day", 1);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: `Daily AI call limit reached (${QUOTAS["ai:calls:day"]}/day). Try again tomorrow.` },
        { status: 429 },
      );
    }

    const stats = await runOpportunityScout({
      profileId: body.profileId,
      userId,
      maxToSave: body.maxToSave ?? 20,
    });

    return NextResponse.json({ stats });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/opportunities/scout error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Opportunity scout run failed" },
      { status: 500 },
    );
  }
}
