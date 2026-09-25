import { NextResponse } from "next/server";
import { runAllActiveCampaigns } from "@/agent/run";
import { config } from "@/lib/config";

// Cron-triggered. Protect with a bearer token (CRON_SECRET) so only your
// scheduler can invoke it. On Hostinger use a cron job hitting this URL;
// later on a VPS use system cron or a worker process running agent:run.

export const maxDuration = 300; // allow long pipeline runs where supported

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const results = await runAllActiveCampaigns("cron");
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("agent run error", err);
    return NextResponse.json({ error: "Agent run failed" }, { status: 500 });
  }
}
