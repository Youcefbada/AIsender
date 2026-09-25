import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getUsageSummary } from "@/lib/ratelimit";
import { listUserKeyProviders } from "@/lib/keys";

export async function GET() {
  try {
    const userId = await requireUserId();
    const [usage, configuredProviders] = await Promise.all([
      getUsageSummary(userId),
      listUserKeyProviders(userId),
    ]);

    return NextResponse.json({
      today: {
        discovery: usage.discovery,
        emails: usage.emails,
      },
      providers: {
        gemini: configuredProviders.includes("GEMINI") || !!process.env.GEMINI_API_KEY,
        groq: configuredProviders.includes("GROQ") || !!process.env.GROQ_API_KEY,
        serper: configuredProviders.includes("SERPER") || !!process.env.SERPER_API_KEY,
        reddit: configuredProviders.includes("REDDIT") || true, // Reddit public search works by default
        resend: configuredProviders.includes("RESEND") || !!process.env.RESEND_API_KEY,
        hunter: configuredProviders.includes("HUNTER"),
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/usage error:", e);
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
