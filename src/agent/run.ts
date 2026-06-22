import { prisma } from "@/lib/db";
import { runCampaignPipeline } from "./pipeline";

// CLI entrypoint for the nightly agent (run via `npm run agent:run` from cron,
// or invoked by the /api/agent/run route). Iterates every ACTIVE campaign.
//
// `maxLeadsPerCampaign` bounds the work per HTTP-triggered tick on shared hosting.
// Keep cron frequent (~10 min) to drain backlogs; the pipeline is idempotent.

export async function runAllActiveCampaigns(
  trigger: "cron" | "manual" = "cron",
  maxLeadsPerCampaign = 25,
) {
  const campaigns = await prisma.campaign.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, userId: true },
  });

  const results: Record<string, unknown> = {};
  for (const c of campaigns) {
    const run = await prisma.agentRun.create({
      data: { userId: c.userId, campaignId: c.id, trigger, status: "RUNNING" },
    });
    try {
      const stats = await runCampaignPipeline(c.id, { maxLeads: maxLeadsPerCampaign });
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCESS",
          stats: stats as unknown as Record<string, number>,
          finishedAt: new Date(),
        },
      });
      results[c.id] = stats;
    } catch (err) {
      await prisma.agentRun.update({
        where: { id: run.id },
        data: { status: "FAILED", error: String(err), finishedAt: new Date() },
      });
      results[c.id] = { error: String(err) };
    }
  }
  return results;
}

// Allow direct execution: `tsx src/agent/run.ts`
if (process.argv[1] && process.argv[1].endsWith("run.ts")) {
  runAllActiveCampaigns("cron")
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      return prisma.$disconnect();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
