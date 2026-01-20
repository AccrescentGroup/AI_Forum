import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { CreateTopicForm } from "@/components/topic/create-topic-form";

interface NewTopicPageProps {
  params: { productSlug: string };
}

export const metadata: Metadata = {
  title: "Create Topic",
  description: "Ask a question or start a discussion",
};

async function getProduct(slug: string) {
  return db.product.findUnique({
    where: { slug, status: { in: ["ACTIVE", "BETA"] } },
    include: {
      categories: {
        orderBy: { ordering: "asc" },
      },
    },
  });
}

async function getProducts() {
  return db.product.findMany({
    where: { status: { in: ["ACTIVE", "BETA"] } },
    orderBy: { ordering: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      color: true,
    },
  });
}

async function getTags() {
  return db.tag.findMany({
    orderBy: { usageCount: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
    },
  });
}

export default async function NewTopicPage({ params }: NewTopicPageProps) {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/community/${params.productSlug}/new`);
  }

  const [product, products, tags] = await Promise.all([
    getProduct(params.productSlug),
    getProducts(),
    getTags(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create a New Topic</h1>
        <p className="text-muted-foreground">
          Ask a question, start a discussion, or share something with the community
        </p>
      </div>

      <CreateTopicForm
        currentProduct={product}
        products={products}
        categories={product.categories}
        tags={tags}
      />
    </div>
  );
}

