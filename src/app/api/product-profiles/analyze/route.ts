import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { consumeQuota, QUOTAS } from "@/lib/ratelimit";
import { analyzeOfferSchema } from "@/lib/validation/schemas";
import { analyzeOffer } from "@/services/product-profile";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();

    const parsed = analyzeOfferSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Offer description must be at least 5 characters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const quota = await consumeQuota(userId, "ai:calls:day", 1);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: `Daily AI call limit reached (${QUOTAS["ai:calls:day"]}/day). Try again tomorrow.` },
        { status: 429 },
      );
    }

    const { intelligence, model } = await analyzeOffer(parsed.data, userId);
    return NextResponse.json({ intelligence, model });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/product-profiles/analyze error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Offer analysis failed" },
      { status: 500 },
    );
  }
}
