"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getSession, canModerate } from "./auth";
import { generateSlug } from "./utils";
import {
  createTopicSchema,
  createReplySchema,
  voteSchema,
  reportSchema,
  updateProfileSchema,
  type CreateTopicInput,
  type CreateReplyInput,
  type VoteInput,
  type ReportInput,
  type UpdateProfileInput,
} from "./validations";

// Topic Actions
export async function createTopic(data: CreateTopicInput) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("You must be signed in to create a topic");
  }

  const validated = createTopicSchema.parse(data);
  const slug = generateSlug(validated.title);

  const topic = await db.topic.create({
    data: {
      title: validated.title,
      body: validated.body,
      slug,
      type: validated.type,
      productId: validated.productId,
      categoryId: validated.categoryId || null,
      authorId: session.user.id,
      tags: {
        create: validated.tagIds.map((tagId) => ({ tagId })),
      },
    },
    include: {
      product: { select: { slug: true } },
    },
  });

  // Update tag usage counts
  if (validated.tagIds.length > 0) {
    await db.tag.updateMany({
      where: { id: { in: validated.tagIds } },
      data: { usageCount: { increment: 1 } },
    });
  }

  // Award reputation
  await db.user.update({
    where: { id: session.user.id },
    data: { reputation: { increment: 5 } },
  });

  revalidatePath(`/community/${topic.product.slug}`);
  redirect(`/community/${topic.product.slug}/topic/${topic.slug}`);
}

export async function createReply(topicId: string, data: CreateReplyInput) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("You must be signed in to reply");
  }

  const validated = createReplySchema.parse(data);

  const topic = await db.topic.findUnique({
    where: { id: topicId },
    select: { id: true, status: true, productId: true },
  });

  if (!topic) {
    throw new Error("Topic not found");
  }

  if (topic.status === "LOCKED" || topic.status === "ARCHIVED") {
    throw new Error("This topic is closed for replies");
  }

  const reply = await db.reply.create({
    data: {
      body: validated.body,
      topicId,
      authorId: session.user.id,
      parentId: validated.parentId || null,
    },
  });

  // Update topic stats
  await db.topic.update({
    where: { id: topicId },
    data: {
      replyCount: { increment: 1 },
      lastActivity: new Date(),
    },
  });

  // Award reputation
  await db.user.update({
    where: { id: session.user.id },
    data: { reputation: { increment: 2 } },
  });

  revalidatePath(`/community`);
  return reply;
}

export async function vote(data: VoteInput) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("You must be signed in to vote");
  }

  const validated = voteSchema.parse(data);
  const { type, topicId, replyId } = validated;

  // Check for existing vote
  const existingVote = await db.vote.findFirst({
    where: {
      userId: session.user.id,
      topicId: topicId || null,
      replyId: replyId || null,
    },
  });

  if (existingVote) {
    if (existingVote.type === type) {
      // Remove vote
      await db.vote.delete({ where: { id: existingVote.id } });

      // Update score
      if (topicId) {
        await db.topic.update({
          where: { id: topicId },
          data: { voteScore: { increment: type === "UP" ? -1 : 1 } },
        });
      } else if (replyId) {
        await db.reply.update({
          where: { id: replyId },
          data: { voteScore: { increment: type === "UP" ? -1 : 1 } },
        });
      }
    } else {
      // Change vote
      await db.vote.update({
        where: { id: existingVote.id },
        data: { type },
      });

      const scoreDelta = type === "UP" ? 2 : -2;
      if (topicId) {
        await db.topic.update({
          where: { id: topicId },
          data: { voteScore: { increment: scoreDelta } },
        });
      } else if (replyId) {
        await db.reply.update({
          where: { id: replyId },
          data: { voteScore: { increment: scoreDelta } },
        });
      }
    }
  } else {
    // Create new vote
    await db.vote.create({
      data: {
        type,
        userId: session.user.id,
        topicId: topicId || null,
        replyId: replyId || null,
      },
    });

    const scoreDelta = type === "UP" ? 1 : -1;
    if (topicId) {
      await db.topic.update({
        where: { id: topicId },
        data: { voteScore: { increment: scoreDelta } },
      });
    } else if (replyId) {
      await db.reply.update({
        where: { id: replyId },
        data: { voteScore: { increment: scoreDelta } },
      });
    }
  }

  revalidatePath("/community");
}

export async function toggleBookmark(topicId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("You must be signed in to bookmark");
  }

  const existingBookmark = await db.bookmark.findUnique({
    where: {
      userId_topicId: {
        userId: session.user.id,
        topicId,
      },
    },
  });

  if (existingBookmark) {
    await db.bookmark.delete({
      where: { id: existingBookmark.id },
    });
  } else {
    await db.bookmark.create({
      data: {
        userId: session.user.id,
        topicId,
      },
    });
  }

  revalidatePath("/community");
}

export async function acceptAnswer(topicId: string, replyId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("You must be signed in");
  }

  const topic = await db.topic.findUnique({
    where: { id: topicId },
    select: { authorId: true, acceptedReplyId: true },
  });

  if (!topic) {
    throw new Error("Topic not found");
  }

  const isMod = canModerate(session.user.role);
  if (topic.authorId !== session.user.id && !isMod) {
    throw new Error("Only the topic author can accept answers");
  }

  const reply = await db.reply.findUnique({
    where: { id: replyId },
    select: { authorId: true },
  });

  if (!reply) {
    throw new Error("Reply not found");
  }

  // Update topic
  await db.topic.update({
    where: { id: topicId },
    data: {
      acceptedReplyId: replyId,
      status: "ANSWERED",
    },
  });

  // Award reputation to reply author
  await db.user.update({
    where: { id: reply.authorId },
    data: { reputation: { increment: 15 } },
  });

  revalidatePath("/community");
}

export async function reportContent(data: ReportInput) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("You must be signed in to report");
  }

  const validated = reportSchema.parse(data);

  await db.report.create({
    data: {
      reason: validated.reason,
      details: validated.details,
      reporterId: session.user.id,
      topicId: validated.topicId || null,
      replyId: validated.replyId || null,
    },
  });

  return { success: true };
}

export async function updateProfile(data: UpdateProfileInput) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("You must be signed in");
  }

  const validated = updateProfileSchema.parse(data);

  // Check username uniqueness
  if (validated.username) {
    const existing = await db.user.findFirst({
      where: {
        username: validated.username,
        id: { not: session.user.id },
      },
    });
    if (existing) {
      throw new Error("Username is already taken");
    }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      name: validated.name,
      username: validated.username,
      bio: validated.bio,
      website: validated.website || null,
      github: validated.github || null,
      twitter: validated.twitter || null,
    },
  });

  revalidatePath(`/u/${validated.username ?? session.user.id}`);
  return { success: true };
}

// Moderation Actions
export async function lockTopic(topicId: string, reason?: string) {
  const session = await getSession();
  if (!session?.user?.id || !canModerate(session.user.role)) {
    throw new Error("Unauthorized");
  }

  await db.topic.update({
    where: { id: topicId },
    data: { status: "LOCKED" },
  });

  await db.modAction.create({
    data: {
      type: "LOCK_TOPIC",
      reason,
      moderatorId: session.user.id,
      topicId,
    },
  });

  revalidatePath("/community");
}

export async function unlockTopic(topicId: string) {
  const session = await getSession();
  if (!session?.user?.id || !canModerate(session.user.role)) {
    throw new Error("Unauthorized");
  }

  await db.topic.update({
    where: { id: topicId },
    data: { status: "OPEN" },
  });

  await db.modAction.create({
    data: {
      type: "UNLOCK_TOPIC",
      moderatorId: session.user.id,
      topicId,
    },
  });

  revalidatePath("/community");
}

export async function pinTopic(topicId: string) {
  const session = await getSession();
  if (!session?.user?.id || !canModerate(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const topic = await db.topic.findUnique({
    where: { id: topicId },
    select: { isPinned: true },
  });

  await db.topic.update({
    where: { id: topicId },
    data: { isPinned: !topic?.isPinned },
  });

  await db.modAction.create({
    data: {
      type: topic?.isPinned ? "UNPIN_TOPIC" : "PIN_TOPIC",
      moderatorId: session.user.id,
      topicId,
    },
  });

  revalidatePath("/community");
}

export async function deleteTopic(topicId: string, reason?: string) {
  const session = await getSession();
  if (!session?.user?.id || !canModerate(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const topic = await db.topic.findUnique({
    where: { id: topicId },
    select: { productId: true, product: { select: { slug: true } } },
  });

  if (!topic) {
    throw new Error("Topic not found");
  }

  await db.topic.delete({
    where: { id: topicId },
  });

  await db.modAction.create({
    data: {
      type: "DELETE_TOPIC",
      reason,
      moderatorId: session.user.id,
    },
  });

  revalidatePath(`/community/${topic.product.slug}`);
  redirect(`/community/${topic.product.slug}`);
}

export async function resolveReport(reportId: string, action: "RESOLVE" | "DISMISS") {
  const session = await getSession();
  if (!session?.user?.id || !canModerate(session.user.role)) {
    throw new Error("Unauthorized");
  }

  await db.report.update({
    where: { id: reportId },
    data: { status: action === "RESOLVE" ? "RESOLVED" : "DISMISSED" },
  });

  await db.modAction.create({
    data: {
      type: action === "RESOLVE" ? "RESOLVE_REPORT" : "DISMISS_REPORT",
      moderatorId: session.user.id,
      reportId,
    },
  });

  revalidatePath("/mod");
}

