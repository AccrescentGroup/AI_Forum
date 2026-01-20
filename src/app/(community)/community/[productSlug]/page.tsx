import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TopicCard } from "@/components/topic/topic-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HelpCircle,
  MessageSquare,
  Megaphone,
  Sparkles,
  Plus,
  Filter,
  ExternalLink,
  FileText,
} from "lucide-react";
import type { TopicStatus, TopicType } from "@prisma/client";

interface ProductPageProps {
  params: { productSlug: string };
  searchParams: {
    type?: TopicType;
    status?: TopicStatus;
    category?: string;
    sort?: string;
    page?: string;
  };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await db.product.findUnique({
    where: { slug: params.productSlug },
    select: { name: true, description: true },
  });

  if (!product) return { title: "Product Not Found" };

  return {
    title: `${product.name} Community`,
    description: product.description ?? `Discuss ${product.name} with the community`,
  };
}

async function getProduct(slug: string) {
  return db.product.findUnique({
    where: { slug, status: { in: ["ACTIVE", "BETA"] } },
    include: {
      categories: {
        orderBy: { ordering: "asc" },
      },
      _count: {
        select: { topics: true },
      },
    },
  });
}

async function getTopics(
  productId: string,
  filters: {
    type?: TopicType;
    status?: TopicStatus;
    categorySlug?: string;
    sort?: string;
    page?: number;
  }
) {
  const { type, status, categorySlug, sort = "latest", page = 1 } = filters;
  const take = 20;
  const skip = (page - 1) * take;

  const where: {
    productId: string;
    type?: TopicType;
    status?: TopicStatus;
    categoryId?: string;
  } = { productId };

  if (type) where.type = type;
  if (status) where.status = status;

  if (categorySlug) {
    const category = await db.category.findFirst({
      where: { productId, slug: categorySlug },
    });
    if (category) where.categoryId = category.id;
  }

  const orderBy =
    sort === "votes"
      ? { voteScore: "desc" as const }
      : sort === "views"
      ? { viewCount: "desc" as const }
      : sort === "activity"
      ? { lastActivity: "desc" as const }
      : { createdAt: "desc" as const };

  const [topics, total] = await Promise.all([
    db.topic.findMany({
      where,
      take,
      skip,
      orderBy: [{ isPinned: "desc" }, orderBy],
      include: {
        author: { select: { id: true, name: true, username: true, image: true } },
        product: { select: { slug: true, name: true, color: true } },
        category: { select: { slug: true, name: true } },
        tags: { include: { tag: true } },
        _count: { select: { replies: true } },
      },
    }),
    db.topic.count({ where }),
  ]);

  return { topics, total, pages: Math.ceil(total / take) };
}

async function getPopularTags(productId: string) {
  const tags = await db.topicTag.groupBy({
    by: ["tagId"],
    where: { topic: { productId } },
    _count: { tagId: true },
    orderBy: { _count: { tagId: "desc" } },
    take: 10,
  });

  const tagDetails = await db.tag.findMany({
    where: { id: { in: tags.map((t) => t.tagId) } },
  });

  return tags.map((t) => ({
    ...tagDetails.find((td) => td.id === t.tagId)!,
    count: t._count.tagId,
  }));
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const product = await getProduct(params.productSlug);

  if (!product) {
    notFound();
  }

  const currentType = searchParams.type;
  const { topics, total, pages } = await getTopics(product.id, {
    type: searchParams.type,
    status: searchParams.status,
    categorySlug: searchParams.category,
    sort: searchParams.sort,
    page: searchParams.page ? parseInt(searchParams.page) : 1,
  });
  const popularTags = await getPopularTags(product.id);
  const currentPage = searchParams.page ? parseInt(searchParams.page) : 1;

  return (
    <div className="container py-8">
      {/* Product Header */}
      <section className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl text-white font-bold"
              style={{ backgroundColor: product.color ?? "#6366f1" }}
            >
              {product.icon ?? product.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{product.name}</h1>
                {product.status === "BETA" && (
                  <Badge variant="warning">Beta</Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {product.description ?? `Community discussions for ${product.name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {product.docsUrl && (
              <Button variant="outline" asChild>
                <a href={product.docsUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4 mr-2" />
                  Docs
                  <ExternalLink className="h-3 w-3 ml-2" />
                </a>
              </Button>
            )}
            <Button asChild>
              <Link href={`/community/${product.slug}/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Topic
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Type Tabs */}
          <Tabs value={currentType ?? "all"} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="all" asChild>
                  <Link href={`/community/${product.slug}`}>All</Link>
                </TabsTrigger>
                <TabsTrigger value="QUESTION" asChild>
                  <Link href={`/community/${product.slug}?type=QUESTION`}>
                    <HelpCircle className="h-4 w-4 mr-1.5" />
                    Questions
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="DISCUSSION" asChild>
                  <Link href={`/community/${product.slug}?type=DISCUSSION`}>
                    <MessageSquare className="h-4 w-4 mr-1.5" />
                    Discussions
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="ANNOUNCEMENT" asChild>
                  <Link href={`/community/${product.slug}?type=ANNOUNCEMENT`}>
                    <Megaphone className="h-4 w-4 mr-1.5" />
                    Announcements
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="SHOWCASE" asChild>
                  <Link href={`/community/${product.slug}?type=SHOWCASE`}>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Showcase
                  </Link>
                </TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select defaultValue={searchParams.sort ?? "latest"}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Latest</SelectItem>
                    <SelectItem value="votes">Most Votes</SelectItem>
                    <SelectItem value="views">Most Views</SelectItem>
                    <SelectItem value="activity">Recent Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value={currentType ?? "all"} className="mt-6">
              <div className="space-y-3">
                {topics.length > 0 ? (
                  <>
                    {topics.map((topic, index) => (
                      <TopicCard key={topic.id} topic={topic} index={index} />
                    ))}

                    {/* Pagination */}
                    {pages > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-6">
                        {currentPage > 1 && (
                          <Button variant="outline" asChild>
                            <Link
                              href={`/community/${product.slug}?page=${currentPage - 1}${
                                currentType ? `&type=${currentType}` : ""
                              }`}
                            >
                              Previous
                            </Link>
                          </Button>
                        )}
                        <span className="text-sm text-muted-foreground">
                          Page {currentPage} of {pages}
                        </span>
                        {currentPage < pages && (
                          <Button variant="outline" asChild>
                            <Link
                              href={`/community/${product.slug}?page=${currentPage + 1}${
                                currentType ? `&type=${currentType}` : ""
                              }`}
                            >
                              Next
                            </Link>
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground mb-4">
                        No topics found. Be the first to start a discussion!
                      </p>
                      <Button asChild>
                        <Link href={`/community/${product.slug}/new`}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Topic
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Categories */}
          {product.categories.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Categories</h3>
                <div className="space-y-1">
                  <Link
                    href={`/community/${product.slug}`}
                    className={`block px-3 py-2 rounded-lg text-sm hover:bg-accent/50 transition-colors ${
                      !searchParams.category ? "bg-accent font-medium" : ""
                    }`}
                  >
                    All Categories
                  </Link>
                  {product.categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/community/${product.slug}?category=${category.slug}`}
                      className={`block px-3 py-2 rounded-lg text-sm hover:bg-accent/50 transition-colors ${
                        searchParams.category === category.slug ? "bg-accent font-medium" : ""
                      }`}
                    >
                      {category.icon && <span className="mr-2">{category.icon}</span>}
                      {category.name}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Popular Tags */}
          {popularTags.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Popular Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/community/search?q=&productId=${product.id}&tagIds=${tag.id}`}
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-accent"
                        style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                      >
                        {tag.name}
                        <span className="ml-1 text-muted-foreground">({tag.count})</span>
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Topics</span>
                  <span className="font-medium">{total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Categories</span>
                  <span className="font-medium">{product.categories.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

