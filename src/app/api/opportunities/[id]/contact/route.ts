import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { discoverOpportunityContact } from "@/services/opportunity-contact";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const contact = await discoverOpportunityContact(id, userId);
    return NextResponse.json({ contact });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/opportunities/[id]/contact error:", e);
    return NextResponse.json({ error: "Failed to discover contact" }, { status: 500 });
  }
}
