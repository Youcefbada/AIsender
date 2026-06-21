import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation/schemas";

// Self-service signup (username + password). Open registration so anyone can use
// the platform with their own API keys. First user could be promoted to ADMIN.
export async function POST(req: Request) {
  try {
    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const username = parsed.data.username.trim().toLowerCase();
    const email = parsed.data.email ? parsed.data.email.trim().toLowerCase() : null;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, ...(email ? [{ email }] : [])] },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Username or email already taken" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    // Make the very first account an admin.
    const isFirst = (await prisma.user.count()) === 0;

    const user = await prisma.user.create({
      data: {
        username,
        email,
        name: parsed.data.name || parsed.data.username,
        passwordHash,
        role: isFirst ? "ADMIN" : "USER",
      },
      select: { id: true, username: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
