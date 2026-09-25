import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductForm } from "@/components/forms/product-form";
import { ProductProfileAnalyzer } from "@/components/forms/product-profile-analyzer";
import { getI18n } from "@/lib/i18n/server";

export default async function ProductsPage() {
  const userId = await requirePageUser();
  const { t } = await getI18n();

  const [profiles, products] = await Promise.all([
    prisma.productProfile.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { opportunities: true, searchRuns: true },
        },
      },
    }),
    prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        analysis: { select: { id: true } },
        _count: { select: { campaigns: true } },
      },
    }),
  ]);

  return (
    <AppShell>
      <div className="space-y-10">
        <div>
          <h1 className="text-xl font-semibold">Offer Intelligence & Software Services</h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            Define what you build and sell. The AI extracts customer pain points, search strategies, and scouts active buyers.
          </p>
        </div>

        {/* Existing Product Profiles (Scout Offers) */}
        {profiles.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--muted-foreground)]">Active Demand Scout Profiles</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {profiles.map((p) => (
                <Card key={p.id} className="transition-colors hover:bg-[var(--muted)]">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        {p.category && (
                          <span className="text-xs text-[var(--muted-foreground)]">{p.category}</span>
                        )}
                      </div>
                      <Link href={`/opportunities?productProfileId=${p.id}`}>
                        <Badge tone="green">
                          🔥 {p._count.opportunities} Opportunities
                        </Badge>
                      </Link>
                    </div>
                    {p.offer && (
                      <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">
                        "{p.offer}"
                      </p>
                    )}
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-[var(--muted-foreground)]">
                        {p._count.searchRuns} discovery searches
                      </span>
                      <Link
                        href={`/opportunities?productProfileId=${p.id}`}
                        className="font-medium text-orange-600 hover:underline"
                      >
                        Open in Scout →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Offer Intelligence Analyzer Form */}
        <ProductProfileAnalyzer />

        {/* Legacy Product Form & Campaign Products (Preserved) */}
        <div className="border-t pt-8" style={{ borderColor: "var(--border)" }}>
          <details className="space-y-4">
            <summary className="cursor-pointer text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              ⚙ Legacy Products & Cold-Email Campaigns ({products.length})
            </summary>

            <div className="mt-4 grid gap-8 md:grid-cols-[1fr_360px]">
              <div>
                <div className="space-y-3">
                  {products.length === 0 && (
                    <p className="text-sm text-[var(--muted-foreground)]">{t.products.none}</p>
                  )}
                  {products.map((p) => (
                    <Link key={p.id} href={`/products/${p.id}`}>
                      <Card className="transition-colors hover:bg-[var(--muted)]">
                        <CardContent className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-[var(--muted-foreground)]">{p.url}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {p.analysis ? (
                              <Badge tone="green">{t.products.analyzed}</Badge>
                            ) : (
                              <Badge tone="amber">{t.products.notAnalyzed}</Badge>
                            )}
                            <Badge>
                              {p._count.campaigns} {t.products.campaigns}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-xs font-semibold mb-3">{t.products.newProduct}</h3>
                    <ProductForm />
                  </CardContent>
                </Card>
              </div>
            </div>
          </details>
        </div>
      </div>
    </AppShell>
  );
}
