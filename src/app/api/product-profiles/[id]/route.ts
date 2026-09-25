import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { createOrUpdateProductProfile, getProductProfile } from "@/services/product-profile";
import { productProfileUpdateSchema } from "@/lib/validation/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const profile = await getProductProfile(userId, id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/product-profiles/[id] error:", e);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const parsed = productProfileUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await getProductProfile(userId, id);
    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const updated = await createOrUpdateProductProfile(userId, {
      ...parsed.data,
      id,
      name: parsed.data.name ?? existing.name,
      description: parsed.data.description ?? existing.description,
    });
    return NextResponse.json({ profile: updated });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("PATCH /api/product-profiles/[id] error:", e);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const existing = await prisma.productProfile.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await prisma.productProfile.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("DELETE /api/product-profiles/[id] error:", e);
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
  }
}
