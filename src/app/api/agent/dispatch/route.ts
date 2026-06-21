import { NextResponse } from "next/server";
import { dispatchDueEmails } from "@/agent/dispatch";

// Cron-triggered send-queue flush. Run frequently (e.g. every 15 min) within the
// day; dispatch enforces send window + daily caps. Bearer-protected.
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatchDueEmails();
  return NextResponse.json({ ok: true, ...result });
}
