"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  BookmarkCheck,
  Share2,
  Flag,
  MoreHorizontal,
  Pencil,
  Lock,
  Unlock,
  Pin,
  Trash2,
} from "lucide-react";
import { vote, toggleBookmark } from "@/lib/actions";
import type { VoteType, TopicStatus } from "@prisma/client";

interface TopicActionsProps {
  topicId: string;
  voteScore: number;
  userVote?: VoteType;
  isBookmarked: boolean;
  isAuthor: boolean;
  canModerate: boolean;
  status: TopicStatus;
}

export function TopicActions({
  topicId,
  voteScore,
  userVote,
  isBookmarked,
  isAuthor,
  canModerate,
  status,
}: TopicActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentVote, setCurrentVote] = useState(userVote);
  const [currentScore, setCurrentScore] = useState(voteScore);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (type: VoteType) => {
    if (isVoting) return;
    setIsVoting(true);

    // Optimistic update
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
      await vote({ type, topicId });
      router.refresh();
    } catch {
      // Revert on error
      setCurrentVote(previousVote);
      setCurrentScore(previousScore);
      toast({
        title: "Error",
        description: "Failed to vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleBookmark = async () => {
    const wasBookmarked = bookmarked;
    setBookmarked(!bookmarked);

    try {
      await toggleBookmark(topicId);
      toast({
        title: bookmarked ? "Removed from bookmarks" : "Added to bookmarks",
      });
      router.refresh();
    } catch {
      setBookmarked(wasBookmarked);
      toast({
        title: "Error",
        description: "Failed to update bookmark.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      {/* Upvote */}
      <Button
        variant={currentVote === "UP" ? "default" : "ghost"}
        size="icon-sm"
        onClick={() => handleVote("UP")}
        disabled={isVoting}
        aria-label="Upvote"
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>

      {/* Score */}
      <span className="text-lg font-semibold">{currentScore}</span>

      {/* Downvote */}
      <Button
        variant={currentVote === "DOWN" ? "destructive" : "ghost"}
        size="icon-sm"
        onClick={() => handleVote("DOWN")}
        disabled={isVoting}
        aria-label="Downvote"
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>

      {/* Bookmark */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleBookmark}
        className="mt-2"
        aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
      >
        {bookmarked ? (
          <BookmarkCheck className="h-4 w-4 text-primary" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
      </Button>

      {/* Share */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleShare}
        aria-label="Share"
      >
        <Share2 className="h-4 w-4" />
      </Button>

      {/* More actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="More actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {isAuthor && status !== "LOCKED" && status !== "ARCHIVED" && (
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem>
            <Flag className="mr-2 h-4 w-4" />
            Report
          </DropdownMenuItem>
          {canModerate && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                {status === "LOCKED" ? (
                  <>
                    <Unlock className="mr-2 h-4 w-4" />
                    Unlock Topic
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Lock Topic
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Pin className="mr-2 h-4 w-4" />
                Pin Topic
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Topic
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

