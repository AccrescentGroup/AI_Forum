import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { MarkdownContent } from "@/components/markdown-content";
import { TopicHeader } from "@/components/topic/topic-header";
import { TopicActions } from "@/components/topic/topic-actions";
import { ReplyList } from "@/components/topic/reply-list";
import { ReplyForm } from "@/components/topic/reply-form";
import { RelatedTopics } from "@/components/topic/related-topics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TopicPageProps {
  params: { productSlug: string; topicSlug: string };
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const topic = await db.topic.findFirst({
    where: {
      slug: params.topicSlug,
      product: { slug: params.productSlug },
    },
    select: { title: true, body: true },
  });

  if (!topic) return { title: "Topic Not Found" };

  return {
    title: topic.title,
    description: topic.body.slice(0, 160),
  };
}

async function getTopic(productSlug: string, topicSlug: string) {
  const topic = await db.topic.findFirst({
    where: {
      slug: topicSlug,
      product: { slug: productSlug },
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          role: true,
          reputation: true,
          createdAt: true,
        },
      },
      product: { select: { id: true, slug: true, name: true, color: true } },
      category: { select: { id: true, slug: true, name: true } },
      tags: { include: { tag: true } },
      acceptedReply: {
        include: {
          author: {
            select: { id: true, name: true, username: true, image: true, role: true },
          },
          votes: true,
        },
      },
      votes: true,
      bookmarks: true,
    },
  });

  if (topic) {
    // Increment view count
    await db.topic.update({
      where: { id: topic.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  return topic;
}

async function getReplies(topicId: string) {
  return db.reply.findMany({
    where: { topicId, isDeleted: false, parentId: null },
    orderBy: [{ voteScore: "desc" }, { createdAt: "asc" }],
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true, role: true, reputation: true },
      },
      votes: true,
      children: {
        where: { isDeleted: false },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: { id: true, name: true, username: true, image: true, role: true },
          },
          votes: true,
        },
      },
    },
  });
}

async function getRelatedTopics(topicId: string, productId: string, tagIds: string[]) {
  return db.topic.findMany({
    where: {
      id: { not: topicId },
      productId,
      OR: tagIds.length > 0
        ? [
            { tags: { some: { tagId: { in: tagIds } } } },
            { productId },
          ]
        : undefined,
    },
    take: 5,
    orderBy: { voteScore: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      voteScore: true,
      replyCount: true,
      product: { select: { slug: true } },
    },
  });
}

export default async function TopicPage({ params }: TopicPageProps) {
  const [topic, session] = await Promise.all([
    getTopic(params.productSlug, params.topicSlug),
    getSession(),
  ]);

  if (!topic) {
    notFound();
  }

  const replies = await getReplies(topic.id);
  const relatedTopics = await getRelatedTopics(
    topic.id,
    topic.product.id,
    topic.tags.map((t) => t.tagId)
  );

  const userVote = session?.user?.id
    ? topic.votes.find((v) => v.userId === session.user.id)
    : null;
  const isBookmarked = session?.user?.id
    ? topic.bookmarks.some((b) => b.userId === session.user.id)
    : false;
  const isAuthor = session?.user?.id === topic.authorId;
  const canModerate =
    session?.user?.role === "MODERATOR" || session?.user?.role === "ADMIN";

  return (
    <div className="container py-8">
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Topic Header */}
          <TopicHeader topic={topic} />

          {/* Topic Body */}
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* Voting */}
                <TopicActions
                  topicId={topic.id}
                  voteScore={topic.voteScore}
                  userVote={userVote?.type}
                  isBookmarked={isBookmarked}
                  isAuthor={isAuthor}
                  canModerate={canModerate}
                  status={topic.status}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <MarkdownContent content={topic.body} />

                  {/* Author info */}
                  <div className="mt-6 pt-6 border-t flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {topic.author.image ? (
                          <img
                            src={topic.author.image}
                            alt={topic.author.name ?? ""}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {topic.author.name?.[0] ?? "?"}
                          </span>
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/u/${topic.author.username ?? topic.author.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {topic.author.name ?? topic.author.username}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {topic.author.reputation} reputation
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Asked {new Date(topic.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accepted Answer */}
          {topic.acceptedReply && (
            <Card className="border-success/50 bg-success/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="success">Accepted Answer</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <MarkdownContent content={topic.acceptedReply.body} />
                <div className="mt-4 pt-4 border-t flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                    {topic.acceptedReply.author.image ? (
                      <img
                        src={topic.acceptedReply.author.image}
                        alt={topic.acceptedReply.author.name ?? ""}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <span className="text-xs font-medium">
                        {topic.acceptedReply.author.name?.[0] ?? "?"}
                      </span>
                    )}
                  </div>
                  <div>
                    <Link
                      href={`/u/${topic.acceptedReply.author.username ?? topic.acceptedReply.author.id}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {topic.acceptedReply.author.name}
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Replies */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
            </h2>
            <ReplyList
              replies={replies}
              topicId={topic.id}
              topicAuthorId={topic.authorId}
              acceptedReplyId={topic.acceptedReplyId}
              currentUserId={session?.user?.id}
              canModerate={canModerate}
            />
          </section>

          {/* Reply Form */}
          {session ? (
            topic.status !== "LOCKED" && topic.status !== "ARCHIVED" ? (
              <ReplyForm topicId={topic.id} productSlug={params.productSlug} />
            ) : (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground">
                  This topic is {topic.status.toLowerCase()} and cannot receive new replies.
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Sign in to reply to this topic
                </p>
                <Link
                  href="/auth/signin"
                  className="text-primary hover:underline"
                >
                  Sign in
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Tags */}
          {topic.tags.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Tags</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {topic.tags.map(({ tag }) => (
                    <Link
                      key={tag.id}
                      href={`/community/search?tagIds=${tag.id}`}
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-accent"
                        style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                      >
                        {tag.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Topics */}
          {relatedTopics.length > 0 && (
            <RelatedTopics topics={relatedTopics} />
          )}

          {/* Topic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Topic Info</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Views</span>
                <span>{topic.viewCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Replies</span>
                <span>{topic.replyCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last activity</span>
                <span>{new Date(topic.lastActivity).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

