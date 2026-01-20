import { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, canModerate } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRelativeTime } from "@/lib/utils";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Flag,
  Clock,
  User,
} from "lucide-react";
import { ReportActions } from "@/components/mod/report-actions";

export const metadata: Metadata = {
  title: "Moderation",
  description: "Manage reports and moderation queue",
};

async function getReports(status: string) {
  return db.report.findMany({
    where: status === "all" ? undefined : { status: status.toUpperCase() as "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      reporter: { select: { id: true, name: true, username: true } },
      topic: {
        select: {
          id: true,
          slug: true,
          title: true,
          product: { select: { slug: true } },
        },
      },
      reply: {
        select: {
          id: true,
          body: true,
          topic: {
            select: {
              slug: true,
              product: { select: { slug: true } },
            },
          },
        },
      },
    },
  });
}

async function getStats() {
  const [pending, resolved, dismissed] = await Promise.all([
    db.report.count({ where: { status: "PENDING" } }),
    db.report.count({ where: { status: "RESOLVED" } }),
    db.report.count({ where: { status: "DISMISSED" } }),
  ]);
  return { pending, resolved, dismissed, total: pending + resolved + dismissed };
}

async function getRecentActions() {
  return db.modAction.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      moderator: { select: { id: true, name: true, username: true } },
    },
  });
}

export default async function ModPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getSession();

  if (!session?.user?.id || !canModerate(session.user.role)) {
    redirect("/community");
  }

  const status = searchParams.status ?? "pending";
  const [reports, stats, recentActions] = await Promise.all([
    getReports(status),
    getStats(),
    getRecentActions(),
  ]);

  const reasonLabels = {
    SPAM: "Spam",
    HARASSMENT: "Harassment",
    INAPPROPRIATE: "Inappropriate",
    OFF_TOPIC: "Off-topic",
    DUPLICATE: "Duplicate",
    OTHER: "Other",
  };

  const statusColors = {
    PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    REVIEWED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    DISMISSED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Moderation Dashboard</h1>
            <p className="text-muted-foreground">Manage reports and content moderation</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dismissed</p>
                <p className="text-2xl font-bold text-gray-600">{stats.dismissed}</p>
              </div>
              <XCircle className="h-8 w-8 text-gray-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Flag className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Reports */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Reports Queue</CardTitle>
              <CardDescription>Review and resolve user reports</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={status}>
                <TabsList className="mb-4">
                  <TabsTrigger value="pending" asChild>
                    <Link href="/mod?status=pending">
                      Pending ({stats.pending})
                    </Link>
                  </TabsTrigger>
                  <TabsTrigger value="resolved" asChild>
                    <Link href="/mod?status=resolved">Resolved</Link>
                  </TabsTrigger>
                  <TabsTrigger value="dismissed" asChild>
                    <Link href="/mod?status=dismissed">Dismissed</Link>
                  </TabsTrigger>
                  <TabsTrigger value="all" asChild>
                    <Link href="/mod?status=all">All</Link>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={status} className="mt-0">
                  {reports.length > 0 ? (
                    <div className="space-y-4">
                      {reports.map((report) => (
                        <div
                          key={report.id}
                          className="p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <Badge className={statusColors[report.status]}>
                                  {report.status}
                                </Badge>
                                <Badge variant="outline">
                                  {reasonLabels[report.reason]}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(report.createdAt)}
                                </span>
                              </div>

                              {report.topic && (
                                <Link
                                  href={`/community/${report.topic.product.slug}/topic/${report.topic.slug}`}
                                  className="font-medium hover:text-primary line-clamp-1"
                                >
                                  <MessageSquare className="h-4 w-4 inline mr-1" />
                                  {report.topic.title}
                                </Link>
                              )}

                              {report.reply && (
                                <Link
                                  href={`/community/${report.reply.topic.product.slug}/topic/${report.reply.topic.slug}`}
                                  className="font-medium hover:text-primary"
                                >
                                  <MessageSquare className="h-4 w-4 inline mr-1" />
                                  Reply: {report.reply.body.slice(0, 100)}...
                                </Link>
                              )}

                              {report.details && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {report.details}
                                </p>
                              )}

                              <p className="text-xs text-muted-foreground mt-2">
                                <User className="h-3 w-3 inline mr-1" />
                                Reported by {report.reporter.name ?? report.reporter.username}
                              </p>
                            </div>

                            {report.status === "PENDING" && (
                              <ReportActions reportId={report.id} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No reports found</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Recent Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActions.length > 0 ? (
                <div className="space-y-4">
                  {recentActions.map((action) => (
                    <div key={action.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">
                            {action.moderator.name ?? action.moderator.username}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {action.type.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </p>
                        {action.reason && (
                          <p className="text-xs text-muted-foreground truncate">
                            {action.reason}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(action.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm">
                  No recent actions
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

