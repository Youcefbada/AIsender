import { prisma } from "@/lib/db";
import { runOpportunityScout } from "@/services/opportunity-scout";

export async function runAllActiveScouts(trigger: "cron" | "manual" = "cron") {
  const profiles = await prisma.productProfile.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, userId: true, name: true },
  });

  const results: Record<string, unknown> = {};

  for (const p of profiles) {
    const run = await prisma.agentRun.create({
      data: {
        userId: p.userId,
        trigger: `${trigger}:scout`,
        status: "RUNNING",
      },
    });

    try {
      const stats = await runOpportunityScout({
        profileId: p.id,
        userId: p.userId,
        maxToSave: 30, // Default 30 opportunities/day/user
      });

      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCESS",
          stats: stats as unknown as Record<string, number>,
          finishedAt: new Date(),
        },
      });

      results[p.id] = { name: p.name, stats };
    } catch (err) {
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          error: String(err),
          finishedAt: new Date(),
        },
      });
      results[p.id] = { name: p.name, error: String(err) };
    }
  }

  return results;
}

// Allow CLI execution: `tsx src/agent/scout-run.ts`
if (process.argv[1] && process.argv[1].endsWith("scout-run.ts")) {
  runAllActiveScouts("cron")
    .then(() => {
      console.log("Scout run complete.");
      return prisma.$disconnect();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
