import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductForm } from "@/components/forms/product-form";

export default async function ProductsPage() {
  const userId = await requirePageUser();
  const products = await prisma.product.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { analysis: { select: { id: true } }, _count: { select: { campaigns: true } } },
  });

  return (
    <AppShell>
      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-xl font-semibold">Products</h1>
          <div className="mt-4 space-y-3">
            {products.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">No products yet. Create one →</p>
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
                      {p.analysis ? <Badge tone="green">Analyzed</Badge> : <Badge tone="amber">Not analyzed</Badge>}
                      <Badge>{p._count.campaigns} campaigns</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-medium text-[var(--muted-foreground)]">New product</h2>
          <Card className="mt-3">
            <CardContent className="p-4">
              <ProductForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
