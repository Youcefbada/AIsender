import { NextResponse } from "next/server";
import { dispatchDueEmails } from "@/agent/dispatch";
import { config } from "@/lib/config";

// Cron-triggered send-queue flush. Run frequently (e.g. every 15 min) within the
// day; dispatch enforces send window + daily caps. Bearer-protected.
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await dispatchDueEmails();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("agent dispatch error", err);
    return NextResponse.json({ error: "Dispatch failed" }, { status: 500 });
  }
}
