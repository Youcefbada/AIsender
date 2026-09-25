import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { generateOpportunityMessage } from "@/services/opportunity-message";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const message = await generateOpportunityMessage(id, userId);
    return NextResponse.json({ message });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/opportunities/[id]/message error:", e);
    return NextResponse.json({ error: "Failed to generate message" }, { status: 500 });
  }
}
