import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TOPIC_STATUS_CONFIG } from "@/lib/utils";
import { MessageSquare, ThumbsUp } from "lucide-react";
import type { TopicStatus } from "@prisma/client";

interface RelatedTopic {
  id: string;
  slug: string;
  title: string;
  status: TopicStatus;
  voteScore: number;
  replyCount: number;
  product: { slug: string };
}

interface RelatedTopicsProps {
  topics: RelatedTopic[];
}

export function RelatedTopics({ topics }: RelatedTopicsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Related Topics</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {topics.map((topic) => {
          const statusConfig = TOPIC_STATUS_CONFIG[topic.status];
          return (
            <Link
              key={topic.id}
              href={`/community/${topic.product.slug}/topic/${topic.slug}`}
              className="block p-2 -mx-2 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start gap-2">
                <Badge
                  variant="outline"
                  className={`shrink-0 text-[10px] ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </Badge>
                <p className="text-sm line-clamp-2 flex-1">{topic.title}</p>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {topic.voteScore}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {topic.replyCount}
                </span>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

