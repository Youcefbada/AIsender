import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { apiKeySchema } from "@/lib/validation/schemas";
import { saveUserKey, deleteUserKey, listUserKeyProviders } from "@/lib/keys";
import { prisma } from "@/lib/db";
import type { KeyProvider } from "@prisma/client";

// GET → which providers the user has set (never returns the secret values).
export async function GET() {
  try {
    const userId = await requireUserId();
    const providers = await listUserKeyProviders(userId);
    return NextResponse.json({ providers });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST → save/overwrite a key for one provider (stored encrypted).
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const parsed = apiKeySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    await saveUserKey(userId, parsed.data.provider, parsed.data.value.trim());
    await prisma.auditLog.create({
      data: { userId, action: "key.save", entity: "ApiKey", entityId: parsed.data.provider },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE ?provider=GEMINI → remove a stored key.
export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId();
    const provider = new URL(req.url).searchParams.get("provider") as KeyProvider | null;
    if (!provider) return NextResponse.json({ error: "provider required" }, { status: 400 });
    await deleteUserKey(userId, provider);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
