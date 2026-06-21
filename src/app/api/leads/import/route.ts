import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import { normalizeDomain } from "@/lib/utils";
import { validateEmail } from "@/lib/email/validate";
import { consumeQuota } from "@/lib/ratelimit";

// CSV lead import (MVP discovery path — zero ToS risk).
// Expected headers (case-insensitive): company, website, email, name, position,
// industry, companysize, geo. Only `company` is required.
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => ({}));
    const csv: string = body?.csv ?? "";
    const campaignId: string | undefined = body?.campaignId || undefined;
    if (!csv.trim()) return NextResponse.json({ error: "Empty CSV" }, { status: 400 });

    if (campaignId) {
      const owns = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
      if (!owns) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const rows = parseCsv(csv);
    let imported = 0, skipped = 0;

    for (const r of rows) {
      const company = r.company || r.name || "";
      if (!company) { skipped++; continue; }

      const quota = await consumeQuota(userId, "discovery:day", 1);
      if (!quota.allowed) break;

      const website = r.website || r.url || "";
      const domain = normalizeDomain(website);

      try {
        if (domain) {
          const exists = await prisma.lead.findUnique({
            where: { userId_domain: { userId, domain } },
          });
          if (exists) { skipped++; continue; }
        }
        const lead = await prisma.lead.create({
          data: {
            userId,
            campaignId,
            company,
            website: website || null,
            domain,
            industry: r.industry || null,
            companySize: r.companysize || r["company size"] || null,
            geo: r.geo || r.location || null,
            source: "csv-import",
          },
        });
        const email = r.email?.toLowerCase();
        if (email) {
          const verdict = await validateEmail(email);
          await prisma.contact.create({
            data: {
              leadId: lead.id,
              email,
              name: r.name || null,
              position: r.position || r.title || null,
              source: "csv-import",
              emailStatus: verdict.verdict,
              isPrimary: true,
            },
          });
          if (verdict.verdict !== "INVALID") {
            await prisma.lead.update({ where: { id: lead.id }, data: { status: "CONTACT_FOUND" } });
          }
        }
        imported++;
      } catch {
        skipped++;
      }
    }

    await prisma.auditLog.create({
      data: { userId, action: "lead.import", metadata: { imported, skipped } },
    });
    return NextResponse.json({ imported, skipped });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
