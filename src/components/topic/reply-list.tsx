"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownContent } from "@/components/markdown-content";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { vote, acceptAnswer } from "@/lib/actions";
import {
  ThumbsUp,
  ThumbsDown,
  Check,
  Flag,
  Reply,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole, VoteType } from "@prisma/client";

interface ReplyData {
  id: string;
  body: string;
  voteScore: number;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    role: UserRole;
    reputation?: number;
  };
  votes: Array<{ userId: string; type: VoteType }>;
  children?: ReplyData[];
}

interface ReplyListProps {
  replies: ReplyData[];
  topicId: string;
  topicAuthorId: string;
  acceptedReplyId: string | null;
  currentUserId?: string;
  canModerate: boolean;
}

export function ReplyList({
  replies,
  topicId,
  topicAuthorId,
  acceptedReplyId,
  currentUserId,
  canModerate,
}: ReplyListProps) {
  if (replies.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No replies yet. Be the first to respond!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {replies.map((reply) => (
        <ReplyCard
          key={reply.id}
          reply={reply}
          topicId={topicId}
          topicAuthorId={topicAuthorId}
          isAccepted={reply.id === acceptedReplyId}
          currentUserId={currentUserId}
          canModerate={canModerate}
        />
      ))}
    </div>
  );
}

interface ReplyCardProps {
  reply: ReplyData;
  topicId: string;
  topicAuthorId: string;
  isAccepted: boolean;
  currentUserId?: string;
  canModerate: boolean;
  isNested?: boolean;
}

function ReplyCard({
  reply,
  topicId,
  topicAuthorId,
  isAccepted,
  currentUserId,
  canModerate,
  isNested = false,
}: ReplyCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isVoting, setIsVoting] = useState(false);

  const userVote = currentUserId
    ? reply.votes.find((v) => v.userId === currentUserId)?.type
    : undefined;

  const [currentVote, setCurrentVote] = useState(userVote);
  const [currentScore, setCurrentScore] = useState(reply.voteScore);

  const isAuthor = currentUserId === reply.author.id;
  const isTopicAuthor = currentUserId === topicAuthorId;
  const canAccept = isTopicAuthor && !isAccepted;

  const handleVote = async (type: VoteType) => {
    if (!currentUserId) {
      toast({ title: "Please sign in to vote", variant: "destructive" });
      return;
    }
    if (isVoting) return;
    setIsVoting(true);

    const previousVote = currentVote;
    const previousScore = currentScore;

    if (currentVote === type) {
      setCurrentVote(undefined);
      setCurrentScore(currentScore + (type === "UP" ? -1 : 1));
    } else {
      const scoreDelta = type === "UP" ? 1 : -1;
      const adjustment = currentVote ? scoreDelta * 2 : scoreDelta;
      setCurrentVote(type);
      setCurrentScore(currentScore + adjustment);
    }

    try {
      await vote({ type, replyId: reply.id });
      router.refresh();
    } catch {
      setCurrentVote(previousVote);
      setCurrentScore(previousScore);
      toast({
        title: "Error",
        description: "Failed to vote.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleAcceptAnswer = async () => {
    try {
      await acceptAnswer(topicId, reply.id);
      toast({ title: "Answer accepted!" });
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "Failed to accept answer.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={isNested ? "ml-8 mt-3" : ""}>
      <Card className={isAccepted ? "border-success/50 bg-success/5" : ""}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Voting */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <Button
                variant={currentVote === "UP" ? "default" : "ghost"}
                size="icon-sm"
                onClick={() => handleVote("UP")}
                disabled={isVoting}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </Button>
              <span className="text-sm font-medium">{currentScore}</span>
              <Button
                variant={currentVote === "DOWN" ? "destructive" : "ghost"}
                size="icon-sm"
                onClick={() => handleVote("DOWN")}
                disabled={isVoting}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </Button>
              {canAccept && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleAcceptAnswer}
                  className="mt-2 text-muted-foreground hover:text-success"
                  title="Accept as answer"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              {isAccepted && (
                <div className="mt-2 text-success">
                  <Check className="h-5 w-5" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <MarkdownContent content={reply.body} />

              {/* Footer */}
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={reply.author.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(reply.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/u/${reply.author.username ?? reply.author.id}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {reply.author.name ?? reply.author.username}
                    </Link>
                    {(reply.author.role === "MODERATOR" || reply.author.role === "ADMIN") && (
                      <Badge variant="secondary" className="text-xs">
                        {reply.author.role === "ADMIN" ? "Admin" : "Mod"}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(reply.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!isNested && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Flag className="mr-2 h-3.5 w-3.5" />
                        Report
                      </DropdownMenuItem>
                      {(isAuthor || canModerate) && (
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nested replies */}
      {reply.children && reply.children.length > 0 && (
        <div className="space-y-3">
          {reply.children.map((child) => (
            <ReplyCard
              key={child.id}
              reply={child}
              topicId={topicId}
              topicAuthorId={topicAuthorId}
              isAccepted={false}
              currentUserId={currentUserId}
              canModerate={canModerate}
              isNested
            />
          ))}
        </div>
      )}
    </div>
  );
}

