import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { TopicCard } from "@/components/topic/topic-card";
import { getInitials, formatRelativeTime, TOPIC_STATUS_CONFIG } from "@/lib/utils";
import {
  Calendar,
  Link as LinkIcon,
  Github,
  Twitter,
  MessageSquare,
  ThumbsUp,
  Bookmark,
  Star,
  Trophy,
  Settings,
} from "lucide-react";

interface ProfilePageProps {
  params: { username: string };
  searchParams: { tab?: string };
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const user = await db.user.findFirst({
    where: {
      OR: [{ username: params.username }, { id: params.username }],
    },
    select: { name: true, username: true, bio: true },
  });

  if (!user) return { title: "User Not Found" };

  return {
    title: user.name ?? user.username ?? "User Profile",
    description: user.bio ?? `View ${user.name ?? user.username}'s profile`,
  };
}

async function getUser(username: string) {
  return db.user.findFirst({
    where: {
      OR: [{ username }, { id: username }],
    },
    include: {
      badges: {
        include: { badge: true },
        orderBy: { awardedAt: "desc" },
      },
      _count: {
        select: {
          topics: true,
          replies: true,
        },
      },
    },
  });
}

async function getUserTopics(userId: string, limit = 10) {
  return db.topic.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: { select: { id: true, name: true, username: true, image: true } },
      product: { select: { slug: true, name: true, color: true } },
      category: { select: { slug: true, name: true } },
      tags: { include: { tag: true } },
      _count: { select: { replies: true } },
    },
  });
}

async function getUserReplies(userId: string, limit = 10) {
  return db.reply.findMany({
    where: { authorId: userId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      topic: {
        select: {
          id: true,
          slug: true,
          title: true,
          product: { select: { slug: true } },
        },
      },
    },
  });
}

async function getUserBookmarks(userId: string, sessionUserId?: string, limit = 10) {
  if (userId !== sessionUserId) return [];

  return db.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      topic: {
        include: {
          author: { select: { id: true, name: true, username: true, image: true } },
          product: { select: { slug: true, name: true, color: true } },
          category: { select: { slug: true, name: true } },
          tags: { include: { tag: true } },
          _count: { select: { replies: true } },
        },
      },
    },
  });
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const [user, session] = await Promise.all([
    getUser(params.username),
    getSession(),
  ]);

  if (!user) {
    notFound();
  }

  const tab = searchParams.tab ?? "topics";
  const isOwnProfile = session?.user?.id === user.id;

  const [topics, replies, bookmarks] = await Promise.all([
    getUserTopics(user.id),
    getUserReplies(user.id),
    getUserBookmarks(user.id, session?.user?.id),
  ]);

  const roleColors: Record<string, string> = {
    GUEST: "bg-muted text-muted-foreground",
    USER: "bg-muted text-muted-foreground",
    TRUSTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    MODERATOR: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    ADMIN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="container py-8">
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Profile Sidebar */}
        <aside className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <h1 className="text-xl font-bold">{user.name}</h1>
                {user.username && (
                  <p className="text-muted-foreground">@{user.username}</p>
                )}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge className={roleColors[user.role]}>
                    {user.role === "USER" ? "Member" : user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                  </Badge>
                </div>
              </div>

              {user.bio && (
                <p className="text-sm text-center mt-4">{user.bio}</p>
              )}

              <Separator className="my-4" />

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{user.reputation}</p>
                  <p className="text-xs text-muted-foreground">Reputation</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{user._count.topics}</p>
                  <p className="text-xs text-muted-foreground">Topics</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{user._count.replies}</p>
                  <p className="text-xs text-muted-foreground">Replies</p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Links */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                {user.website && (
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {new URL(user.website).hostname}
                  </a>
                )}
                {user.github && (
                  <a
                    href={`https://github.com/${user.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Github className="h-4 w-4" />
                    {user.github}
                  </a>
                )}
                {user.twitter && (
                  <a
                    href={`https://twitter.com/${user.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Twitter className="h-4 w-4" />
                    {user.twitter}
                  </a>
                )}
              </div>

              {isOwnProfile && (
                <>
                  <Separator className="my-4" />
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Badges */}
          {user.badges.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Badges
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {user.badges.map(({ badge }) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                      style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
                      title={badge.description}
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue={tab}>
            <TabsList className="mb-6">
              <TabsTrigger value="topics" asChild>
                <Link href={`/u/${params.username}?tab=topics`} className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Topics ({user._count.topics})
                </Link>
              </TabsTrigger>
              <TabsTrigger value="replies" asChild>
                <Link href={`/u/${params.username}?tab=replies`} className="gap-2">
                  <ThumbsUp className="h-4 w-4" />
                  Replies ({user._count.replies})
                </Link>
              </TabsTrigger>
              {isOwnProfile && (
                <TabsTrigger value="bookmarks" asChild>
                  <Link href={`/u/${params.username}?tab=bookmarks`} className="gap-2">
                    <Bookmark className="h-4 w-4" />
                    Bookmarks
                  </Link>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="topics">
              {topics.length > 0 ? (
                <div className="space-y-3">
                  {topics.map((topic, index) => (
                    <TopicCard key={topic.id} topic={topic} index={index} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No topics yet
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="replies">
              {replies.length > 0 ? (
                <div className="space-y-3">
                  {replies.map((reply) => (
                    <Link
                      key={reply.id}
                      href={`/community/${reply.topic.product.slug}/topic/${reply.topic.slug}`}
                      className="block"
                    >
                      <Card className="hover:bg-accent/30 transition-colors">
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground mb-2">
                            Replied to: <span className="text-foreground">{reply.topic.title}</span>
                          </p>
                          <p className="text-sm line-clamp-2">{reply.body.slice(0, 200)}...</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatRelativeTime(reply.createdAt)}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No replies yet
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {isOwnProfile && (
              <TabsContent value="bookmarks">
                {bookmarks.length > 0 ? (
                  <div className="space-y-3">
                    {bookmarks.map(({ topic }, index) => (
                      <TopicCard key={topic.id} topic={topic} index={index} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No bookmarks yet
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}

