import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { runCampaignPipeline } from "@/agent/pipeline";

export const maxDuration = 300;

// Manual "run now" — same pipeline the nightly cron uses, scoped to one campaign.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const campaign = await prisma.campaign.findFirst({ where: { id, userId } });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const run = await prisma.agentRun.create({
      data: { userId, campaignId: id, trigger: "manual", status: "RUNNING" },
    });
    try {
      const stats = await runCampaignPipeline(id);
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCESS",
          stats: stats as unknown as Record<string, number>,
          finishedAt: new Date(),
        },
      });
      return NextResponse.json({ stats });
    } catch (err) {
      await prisma.agentRun.update({
        where: { id: run.id },
        data: { status: "FAILED", error: String(err), finishedAt: new Date() },
      });
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
