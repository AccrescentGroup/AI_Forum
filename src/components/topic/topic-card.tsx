"use client";

import Link from "next/link";
import { formatRelativeTime, TOPIC_STATUS_CONFIG, TOPIC_TYPE_CONFIG } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, getInitials } from "@/lib/utils";
import {
  MessageSquare,
  ThumbsUp,
  Eye,
  HelpCircle,
  Megaphone,
  Sparkles,
  Pin,
} from "lucide-react";
import type { TopicStatus, TopicType } from "@prisma/client";

interface TopicCardProps {
  topic: {
    id: string;
    slug: string;
    title: string;
    status: TopicStatus;
    type: TopicType;
    isPinned: boolean;
    voteScore: number;
    viewCount: number;
    replyCount: number;
    createdAt: Date;
    lastActivity: Date;
    author: {
      id: string;
      name: string | null;
      username: string | null;
      image: string | null;
    };
    product: {
      slug: string;
      name: string;
      color: string | null;
    };
    category: {
      slug: string;
      name: string;
    } | null;
    tags: Array<{
      tag: {
        id: string;
        name: string;
        slug: string;
        color: string | null;
      };
    }>;
    _count: {
      replies: number;
    };
  };
  index?: number;
}

const typeIcons = {
  QUESTION: HelpCircle,
  DISCUSSION: MessageSquare,
  ANNOUNCEMENT: Megaphone,
  SHOWCASE: Sparkles,
};

export function TopicCard({ topic, index = 0 }: TopicCardProps) {
  const TypeIcon = typeIcons[topic.type];
  const typeConfig = TOPIC_TYPE_CONFIG[topic.type];
  const statusConfig = TOPIC_STATUS_CONFIG[topic.status];

  return (
    <Link
      href={`/community/${topic.product.slug}/topic/${topic.slug}`}
      className="block animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="group p-4 rounded-xl border bg-card hover:bg-accent/30 hover:border-primary/30 transition-all duration-200">
        <div className="flex gap-4">
          {/* Vote Score */}
          <div className="hidden sm:flex flex-col items-center justify-center min-w-[60px] p-2 rounded-lg bg-muted/50">
            <ThumbsUp className="h-4 w-4 mb-1 text-muted-foreground" />
            <span className="text-sm font-semibold">{topic.voteScore}</span>
            <span className="text-xs text-muted-foreground">votes</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {topic.isPinned && (
                <Pin className="h-3.5 w-3.5 text-primary" />
              )}
              <TypeIcon className={cn("h-4 w-4", typeConfig.color)} />
              <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
                {statusConfig.label}
              </Badge>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${topic.product.color}20`, color: topic.product.color ?? "#6366f1" }}
              >
                {topic.product.name}
              </span>
              {topic.category && (
                <span className="text-xs text-muted-foreground">
                  in {topic.category.name}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-medium text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {topic.title}
            </h3>

            {/* Tags */}
            {topic.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {topic.tags.slice(0, 4).map(({ tag }) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="text-xs font-normal"
                    style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                  >
                    {tag.name}
                  </Badge>
                ))}
                {topic.tags.length > 4 && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    +{topic.tags.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={topic.author.image ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(topic.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{topic.author.name ?? topic.author.username}</span>
                </div>
                <span className="hidden sm:inline">
                  {formatRelativeTime(topic.createdAt)}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{topic._count.replies}</span>
                </div>
                <div className="hidden sm:flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{topic.viewCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

