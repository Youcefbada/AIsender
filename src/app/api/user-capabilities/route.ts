import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { userCapabilitySchema } from "@/lib/validation/schemas";
import type { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const userId = await requireUserId();
    const capability = await prisma.userCapability.findUnique({
      where: { userId },
    });
    return NextResponse.json({ capability });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET /api/user-capabilities error:", e);
    return NextResponse.json({ error: "Failed to fetch capability profile" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const parsed = userCapabilitySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const body = parsed.data;

    const capability = await prisma.userCapability.upsert({
      where: { userId },
      create: {
        userId,
        skills: (body.skills ?? []) as Prisma.InputJsonValue,
        services: (body.services ?? []) as Prisma.InputJsonValue,
        portfolioLinks: (body.portfolioLinks ?? []) as Prisma.InputJsonValue,
        hourlyRateMin: body.hourlyRateMin,
        hourlyRateMax: body.hourlyRateMax,
        bio: body.bio,
      },
      update: {
        skills: (body.skills ?? []) as Prisma.InputJsonValue,
        services: (body.services ?? []) as Prisma.InputJsonValue,
        portfolioLinks: (body.portfolioLinks ?? []) as Prisma.InputJsonValue,
        hourlyRateMin: body.hourlyRateMin,
        hourlyRateMax: body.hourlyRateMax,
        bio: body.bio,
      },
    });

    return NextResponse.json({ capability });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/user-capabilities error:", e);
    return NextResponse.json({ error: "Failed to update capabilities" }, { status: 500 });
  }
}
