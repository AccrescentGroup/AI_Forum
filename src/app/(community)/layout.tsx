import { Header } from "@/components/layout/header";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getProducts() {
  return db.product.findMany({
    where: { status: { in: ["ACTIVE", "BETA"] } },
    orderBy: { ordering: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      icon: true,
      color: true,
    },
  });
}

export default async function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const products = await getProducts();

  return (
    <div className="min-h-screen flex flex-col">
      <Header products={products} />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="container">
          <p>© 2026 Community Forum. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

