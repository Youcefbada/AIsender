import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { productProfileSchema } from "@/lib/validation/schemas";
import {
  listProductProfiles,
  createOrUpdateProductProfile,
} from "@/services/product-profile";

export async function GET() {
  try {
    const userId = await requireUserId();
    const profiles = await listProductProfiles(userId);
    return NextResponse.json({ profiles });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/product-profiles error:", e);
    return NextResponse.json({ error: "Failed to list profiles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    const parsed = productProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const profile = await createOrUpdateProductProfile(userId, parsed.data);
    return NextResponse.json({ profile }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/product-profiles error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create profile" },
      { status: 500 },
    );
  }
}
