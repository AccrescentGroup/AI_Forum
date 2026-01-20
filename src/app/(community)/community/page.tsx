import { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { TopicCard } from "@/components/topic/topic-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  TrendingUp,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  Megaphone,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Community",
  description: "Ask questions, share solutions, and discuss product usage with the community.",
};

async function getProducts() {
  return db.product.findMany({
    where: { status: { in: ["ACTIVE", "BETA"] } },
    orderBy: { ordering: "asc" },
    include: {
      _count: {
        select: { topics: true },
      },
    },
  });
}

async function getAnnouncements() {
  return db.topic.findMany({
    where: {
      type: "ANNOUNCEMENT",
      isPinned: true,
    },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, username: true, image: true } },
      product: { select: { slug: true, name: true } },
    },
  });
}

async function getTopics(filter: string) {
  const orderBy = filter === "trending" 
    ? { voteScore: "desc" as const }
    : filter === "unanswered"
    ? { createdAt: "desc" as const }
    : { lastActivity: "desc" as const };

  const where = filter === "unanswered"
    ? { status: "OPEN" as const, type: "QUESTION" as const, replyCount: 0 }
    : filter === "resolved"
    ? { status: { in: ["ANSWERED" as const, "RESOLVED" as const] } }
    : {};

  return db.topic.findMany({
    where,
    take: 10,
    orderBy,
    include: {
      author: { select: { id: true, name: true, username: true, image: true } },
      product: { select: { slug: true, name: true, color: true } },
      category: { select: { slug: true, name: true } },
      tags: { include: { tag: true } },
      _count: { select: { replies: true } },
    },
  });
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const filter = searchParams.filter ?? "latest";
  const [products, announcements, topics] = await Promise.all([
    getProducts(),
    getAnnouncements(),
    getTopics(filter),
  ]);

  return (
    <div className="container py-8">
      {/* Hero Section */}
      <section className="relative mb-12 rounded-2xl overflow-hidden gradient-mesh pattern-grid p-8 md:p-12">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Welcome to the Community
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Ask questions, share solutions, and connect with other users. Get help from the community and our team.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={products[0] ? `/community/${products[0].slug}/new` : "#"}>
                <HelpCircle className="mr-2 h-5 w-5" />
                Ask a Question
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/community/search">
                Browse Topics
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Announcements */}
          {announcements.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Megaphone className="h-5 w-5 text-orange-500" />
                <h2 className="text-xl font-semibold">Announcements</h2>
              </div>
              <div className="space-y-3">
                {announcements.map((topic) => (
                  <Link
                    key={topic.id}
                    href={`/community/${topic.product.slug}/topic/${topic.slug}`}
                    className="block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="warning" className="text-xs">Announcement</Badge>
                      <span className="text-xs text-muted-foreground">{topic.product.name}</span>
                    </div>
                    <h3 className="font-medium">{topic.title}</h3>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Topics */}
          <section>
            <Tabs defaultValue={filter} className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="latest" asChild>
                    <Link href="/community?filter=latest">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Latest
                    </Link>
                  </TabsTrigger>
                  <TabsTrigger value="trending" asChild>
                    <Link href="/community?filter=trending">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Trending
                    </Link>
                  </TabsTrigger>
                  <TabsTrigger value="unanswered" asChild>
                    <Link href="/community?filter=unanswered">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Unanswered
                    </Link>
                  </TabsTrigger>
                  <TabsTrigger value="resolved" asChild>
                    <Link href="/community?filter=resolved">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolved
                    </Link>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={filter} className="mt-0">
                <div className="space-y-3">
                  {topics.length > 0 ? (
                    topics.map((topic, index) => (
                      <TopicCard key={topic.id} topic={topic} index={index} />
                    ))
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">
                          No topics found. Be the first to start a discussion!
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Products</CardTitle>
              <CardDescription>Browse by product</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/community/${product.slug}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: product.color ?? "#6366f1" }}
                    >
                      {product.icon ?? product.name[0]}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product._count.topics} topics
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Community Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">
                    {topics.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Topics</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">
                    {products.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Products</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Help */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
              <CardDescription>
                Can&apos;t find what you&apos;re looking for?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href={products[0] ? `/community/${products[0].slug}/new` : "#"}>
                  Ask a Question
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

