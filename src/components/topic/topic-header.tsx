import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TOPIC_STATUS_CONFIG, TOPIC_TYPE_CONFIG } from "@/lib/utils";
import { ChevronRight, Pin } from "lucide-react";
import type { TopicStatus, TopicType } from "@prisma/client";

interface TopicHeaderProps {
  topic: {
    title: string;
    status: TopicStatus;
    type: TopicType;
    isPinned: boolean;
    product: {
      slug: string;
      name: string;
      color: string | null;
    };
    category: {
      slug: string;
      name: string;
    } | null;
  };
}

export function TopicHeader({ topic }: TopicHeaderProps) {
  const statusConfig = TOPIC_STATUS_CONFIG[topic.status];
  const typeConfig = TOPIC_TYPE_CONFIG[topic.type];

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <Link href="/community" className="hover:text-foreground transition-colors">
          Community
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/community/${topic.product.slug}`}
          className="hover:text-foreground transition-colors"
          style={{ color: topic.product.color ?? undefined }}
        >
          {topic.product.name}
        </Link>
        {topic.category && (
          <>
            <ChevronRight className="h-4 w-4" />
            <Link
              href={`/community/${topic.product.slug}?category=${topic.category.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {topic.category.name}
            </Link>
          </>
        )}
      </nav>

      {/* Title and badges */}
      <div className="flex items-start gap-3">
        {topic.isPinned && (
          <Pin className="h-5 w-5 text-primary mt-1 shrink-0" />
        )}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="outline" className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
            <Badge variant="secondary" className={typeConfig.color}>
              {typeConfig.label}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">{topic.title}</h1>
        </div>
      </div>
    </div>
  );
}

