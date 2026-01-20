import { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { searchTopics } from "@/lib/search";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TOPIC_STATUS_CONFIG, formatRelativeTime, truncate } from "@/lib/utils";
import {
  Search,
  Filter,
  MessageSquare,
  ThumbsUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { TopicStatus, TopicType } from "@prisma/client";

export const metadata: Metadata = {
  title: "Search",
  description: "Search topics, questions, and discussions",
};

interface SearchPageProps {
  searchParams: {
    q?: string;
    productId?: string;
    categoryId?: string;
    tagIds?: string;
    status?: TopicStatus;
    type?: TopicType;
    page?: string;
  };
}

async function getFilters() {
  const [products, tags] = await Promise.all([
    db.product.findMany({
      where: { status: { in: ["ACTIVE", "BETA"] } },
      orderBy: { ordering: "asc" },
      select: { id: true, name: true, slug: true, color: true },
    }),
    db.tag.findMany({
      orderBy: { usageCount: "desc" },
      take: 20,
      select: { id: true, name: true, slug: true, color: true },
    }),
  ]);
  return { products, tags };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q ?? "";
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const tagIds = searchParams.tagIds?.split(",").filter(Boolean);

  const [searchResults, filters] = await Promise.all([
    query || searchParams.productId || tagIds?.length
      ? searchTopics({
          query,
          productId: searchParams.productId,
          categoryId: searchParams.categoryId,
          tagIds,
          status: searchParams.status,
          type: searchParams.type,
          page,
          limit: 20,
        })
      : { items: [], total: 0, page: 1, totalPages: 0 },
    getFilters(),
  ]);

  const buildSearchUrl = (params: Record<string, string | undefined>) => {
    const url = new URLSearchParams();
    if (query) url.set("q", query);
    if (searchParams.productId) url.set("productId", searchParams.productId);
    if (searchParams.status) url.set("status", searchParams.status);
    if (searchParams.type) url.set("type", searchParams.type);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.set(key, value);
      else url.delete(key);
    });
    return `/community/search?${url.toString()}`;
  };

  return (
    <div className="container py-8">
      {/* Search Header */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Search Community</h1>
        <form className="max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search for topics, questions, discussions..."
              className="pl-12 h-12 text-lg"
            />
          </div>
        </form>
      </section>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <CardTitle className="text-sm">Filters</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Products */}
              <div>
                <h4 className="text-sm font-medium mb-2">Product</h4>
                <div className="space-y-1">
                  <Link
                    href={buildSearchUrl({ productId: undefined })}
                    className={`block px-2 py-1.5 rounded text-sm hover:bg-accent ${
                      !searchParams.productId ? "bg-accent font-medium" : ""
                    }`}
                  >
                    All Products
                  </Link>
                  {filters.products.map((product) => (
                    <Link
                      key={product.id}
                      href={buildSearchUrl({ productId: product.id })}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent ${
                        searchParams.productId === product.id ? "bg-accent font-medium" : ""
                      }`}
                    >
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: product.color ?? "#6366f1" }}
                      />
                      {product.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <h4 className="text-sm font-medium mb-2">Status</h4>
                <div className="space-y-1">
                  <Link
                    href={buildSearchUrl({ status: undefined })}
                    className={`block px-2 py-1.5 rounded text-sm hover:bg-accent ${
                      !searchParams.status ? "bg-accent font-medium" : ""
                    }`}
                  >
                    All Statuses
                  </Link>
                  {(["OPEN", "ANSWERED", "RESOLVED", "LOCKED"] as const).map((status) => (
                    <Link
                      key={status}
                      href={buildSearchUrl({ status })}
                      className={`block px-2 py-1.5 rounded text-sm hover:bg-accent ${
                        searchParams.status === status ? "bg-accent font-medium" : ""
                      }`}
                    >
                      {TOPIC_STATUS_CONFIG[status].label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <h4 className="text-sm font-medium mb-2">Type</h4>
                <div className="space-y-1">
                  <Link
                    href={buildSearchUrl({ type: undefined })}
                    className={`block px-2 py-1.5 rounded text-sm hover:bg-accent ${
                      !searchParams.type ? "bg-accent font-medium" : ""
                    }`}
                  >
                    All Types
                  </Link>
                  {(["QUESTION", "DISCUSSION", "ANNOUNCEMENT", "SHOWCASE"] as const).map((type) => (
                    <Link
                      key={type}
                      href={buildSearchUrl({ type })}
                      className={`block px-2 py-1.5 rounded text-sm hover:bg-accent ${
                        searchParams.type === type ? "bg-accent font-medium" : ""
                      }`}
                    >
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <h4 className="text-sm font-medium mb-2">Popular Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {filters.tags.map((tag) => (
                    <Link key={tag.id} href={buildSearchUrl({ tagIds: tag.id })}>
                      <Badge
                        variant={tagIds?.includes(tag.id) ? "default" : "secondary"}
                        className="cursor-pointer text-xs"
                        style={tag.color ? { borderColor: tag.color } : undefined}
                      >
                        {tag.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Results */}
        <div className="lg:col-span-3">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {searchResults.total > 0
                ? `Found ${searchResults.total} results${query ? ` for "${query}"` : ""}`
                : query
                ? `No results found for "${query}"`
                : "Enter a search query or select filters"}
            </p>
          </div>

          {/* Results List */}
          {searchResults.items.length > 0 ? (
            <div className="space-y-3">
              {searchResults.items.map((item) => {
                const statusConfig = TOPIC_STATUS_CONFIG[item.status];
                return (
                  <Link
                    key={item.id}
                    href={`/community/${item.productSlug}/topic/${item.slug}`}
                    className="block"
                  >
                    <Card className="hover:bg-accent/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Stats */}
                          <div className="hidden sm:flex flex-col items-center gap-1 min-w-[50px] text-center">
                            <div className="flex items-center gap-1 text-sm">
                              <ThumbsUp className="h-3.5 w-3.5" />
                              {item.voteScore}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MessageSquare className="h-3 w-3" />
                              {item.replyCount}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                                {statusConfig.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                in {item.productName}
                                {item.categoryName && ` / ${item.categoryName}`}
                              </span>
                            </div>
                            <h3 className="font-medium mb-1 line-clamp-1">{item.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {truncate(item.body, 200)}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>by {item.authorName}</span>
                              <span>{formatRelativeTime(item.createdAt)}</span>
                              {item.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {item.tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag.slug} variant="secondary" className="text-[10px]">
                                      {tag.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}

              {/* Pagination */}
              {searchResults.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  {page > 1 && (
                    <Button variant="outline" asChild>
                      <Link href={buildSearchUrl({ page: String(page - 1) })}>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Link>
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground px-4">
                    Page {page} of {searchResults.totalPages}
                  </span>
                  {page < searchResults.totalPages && (
                    <Button variant="outline" asChild>
                      <Link href={buildSearchUrl({ page: String(page + 1) })}>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : query ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters to find what you&apos;re looking for.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Search the community</h3>
                <p className="text-muted-foreground">
                  Enter a search term or use the filters to find topics.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

