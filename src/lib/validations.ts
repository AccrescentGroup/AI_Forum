import { z } from "zod";

// Auth schemas
export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Topic schemas
export const createTopicSchema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(200, "Title must be less than 200 characters"),
  body: z
    .string()
    .min(30, "Body must be at least 30 characters")
    .max(50000, "Body must be less than 50000 characters"),
  productId: z.string().min(1, "Product is required"),
  categoryId: z.string().optional(),
  type: z.enum(["QUESTION", "DISCUSSION", "ANNOUNCEMENT", "SHOWCASE"]),
  tagIds: z.array(z.string()).max(5, "Maximum 5 tags allowed").default([]),
});

export const updateTopicSchema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(200, "Title must be less than 200 characters")
    .optional(),
  body: z
    .string()
    .min(30, "Body must be at least 30 characters")
    .max(50000, "Body must be less than 50000 characters")
    .optional(),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).max(5, "Maximum 5 tags allowed").optional(),
});

export const topicStatusSchema = z.object({
  status: z.enum(["OPEN", "ANSWERED", "RESOLVED", "LOCKED", "ARCHIVED"]),
});

// Reply schemas
export const createReplySchema = z.object({
  body: z
    .string()
    .min(10, "Reply must be at least 10 characters")
    .max(30000, "Reply must be less than 30000 characters"),
  parentId: z.string().optional(),
});

export const updateReplySchema = z.object({
  body: z
    .string()
    .min(10, "Reply must be at least 10 characters")
    .max(30000, "Reply must be less than 30000 characters"),
});

// Vote schemas
export const voteSchema = z.object({
  type: z.enum(["UP", "DOWN"]),
  topicId: z.string().optional(),
  replyId: z.string().optional(),
}).refine((data) => data.topicId || data.replyId, {
  message: "Either topicId or replyId must be provided",
});

// Report schemas
export const reportSchema = z.object({
  reason: z.enum(["SPAM", "HARASSMENT", "INAPPROPRIATE", "OFF_TOPIC", "DUPLICATE", "OTHER"]),
  details: z.string().max(1000, "Details must be less than 1000 characters").optional(),
  topicId: z.string().optional(),
  replyId: z.string().optional(),
}).refine((data) => data.topicId || data.replyId, {
  message: "Either topicId or replyId must be provided",
});

// User profile schemas
export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
    .optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  website: z.string().url("Invalid URL").or(z.literal("")).optional(),
  github: z.string().max(50).optional(),
  twitter: z.string().max(50).optional(),
});

// Admin schemas
export const createProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(1000).optional(),
  icon: z.string().max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
  status: z.enum(["ACTIVE", "BETA", "HIDDEN"]).default("HIDDEN"),
  docsUrl: z.string().url().or(z.literal("")).optional(),
  releaseUrl: z.string().url().or(z.literal("")).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional(),
  icon: z.string().max(100).optional(),
  productId: z.string().optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(30),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(30)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
});

// Search schemas
export const searchSchema = z.object({
  q: z.string().min(2, "Search query must be at least 2 characters").max(200),
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  status: z.enum(["OPEN", "ANSWERED", "RESOLVED", "LOCKED", "ARCHIVED"]).optional(),
  type: z.enum(["QUESTION", "DISCUSSION", "ANNOUNCEMENT", "SHOWCASE"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// Moderation schemas
export const modActionSchema = z.object({
  type: z.enum([
    "LOCK_TOPIC",
    "UNLOCK_TOPIC",
    "PIN_TOPIC",
    "UNPIN_TOPIC",
    "MOVE_TOPIC",
    "DELETE_TOPIC",
    "DELETE_REPLY",
    "BAN_USER",
    "UNBAN_USER",
    "WARN_USER",
    "CHANGE_STATUS",
    "RESOLVE_REPORT",
    "DISMISS_REPORT",
  ]),
  reason: z.string().max(500).optional(),
  topicId: z.string().optional(),
  replyId: z.string().optional(),
  reportId: z.string().optional(),
  targetUserId: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

// Type exports
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;
export type CreateReplyInput = z.infer<typeof createReplySchema>;
export type UpdateReplyInput = z.infer<typeof updateReplySchema>;
export type VoteInput = z.infer<typeof voteSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type ModActionInput = z.infer<typeof modActionSchema>;

