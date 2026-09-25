import { NextResponse } from "next/server";
import { runAllActiveScouts } from "@/agent/scout-run";
import { config } from "@/lib/config";

export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runAllActiveScouts("cron");
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("agent scout error", err);
    return NextResponse.json({ error: "Scout run failed" }, { status: 500 });
  }
}
