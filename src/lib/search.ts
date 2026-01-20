import { db } from "./db";
import type { TopicStatus, TopicType } from "@prisma/client";

// Search provider interface for future swap to Meilisearch/Elastic
export interface SearchProvider {
  search(params: SearchParams): Promise<SearchResult>;
  indexTopic(topic: IndexableDocument): Promise<void>;
  deleteTopic(id: string): Promise<void>;
}

export interface SearchParams {
  query: string;
  productId?: string;
  categoryId?: string;
  tagIds?: string[];
  status?: TopicStatus;
  type?: TopicType;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  items: SearchHit[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SearchHit {
  id: string;
  title: string;
  body: string;
  slug: string;
  status: TopicStatus;
  type: TopicType;
  productSlug: string;
  productName: string;
  categorySlug?: string;
  categoryName?: string;
  authorName: string;
  authorUsername?: string;
  createdAt: Date;
  voteScore: number;
  replyCount: number;
  tags: { name: string; slug: string }[];
  highlights?: {
    title?: string;
    body?: string;
  };
}

export interface IndexableDocument {
  id: string;
  title: string;
  body: string;
  productId: string;
  categoryId?: string;
  authorId: string;
  tags: string[];
}

// PostgreSQL Full-Text Search implementation
class PostgresSearchProvider implements SearchProvider {
  async search(params: SearchParams): Promise<SearchResult> {
    const {
      query,
      productId,
      categoryId,
      tagIds,
      status,
      type,
      page = 1,
      limit = 20,
    } = params;

    const offset = (page - 1) * limit;

    // Build the where clause
    const whereConditions: string[] = [];
    const whereParams: unknown[] = [];
    let paramIndex = 1;

    if (query) {
      whereConditions.push(
        `(to_tsvector('english', t.title || ' ' || t.body) @@ plainto_tsquery('english', $${paramIndex}))`
      );
      whereParams.push(query);
      paramIndex++;
    }

    if (productId) {
      whereConditions.push(`t."productId" = $${paramIndex}`);
      whereParams.push(productId);
      paramIndex++;
    }

    if (categoryId) {
      whereConditions.push(`t."categoryId" = $${paramIndex}`);
      whereParams.push(categoryId);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`t.status = $${paramIndex}::"TopicStatus"`);
      whereParams.push(status);
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`t.type = $${paramIndex}::"TopicType"`);
      whereParams.push(type);
      paramIndex++;
    }

    if (tagIds && tagIds.length > 0) {
      whereConditions.push(
        `EXISTS (SELECT 1 FROM "TopicTag" tt WHERE tt."topicId" = t.id AND tt."tagId" = ANY($${paramIndex}))`
      );
      whereParams.push(tagIds);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await db.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "Topic" t ${whereClause}`,
      ...whereParams
    );
    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated results with relevance ranking
    const rankClause = query
      ? `ts_rank(to_tsvector('english', t.title || ' ' || t.body), plainto_tsquery('english', $1)) DESC,`
      : "";

    const results = await db.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        body: string;
        slug: string;
        status: TopicStatus;
        type: TopicType;
        createdAt: Date;
        voteScore: number;
        replyCount: number;
        productSlug: string;
        productName: string;
        categorySlug: string | null;
        categoryName: string | null;
        authorName: string | null;
        authorUsername: string | null;
      }>
    >(
      `
      SELECT 
        t.id, t.title, t.body, t.slug, t.status, t.type, t."createdAt", t."voteScore", t."replyCount",
        p.slug as "productSlug", p.name as "productName",
        c.slug as "categorySlug", c.name as "categoryName",
        u.name as "authorName", u.username as "authorUsername"
      FROM "Topic" t
      JOIN "Product" p ON t."productId" = p.id
      LEFT JOIN "Category" c ON t."categoryId" = c.id
      JOIN "User" u ON t."authorId" = u.id
      ${whereClause}
      ORDER BY ${rankClause} t."lastActivity" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      ...whereParams,
      limit,
      offset
    );

    // Get tags for each topic
    const topicIds = results.map((r) => r.id);
    const tags = topicIds.length > 0
      ? await db.topicTag.findMany({
          where: { topicId: { in: topicIds } },
          include: { tag: { select: { name: true, slug: true } } },
        })
      : [];

    const tagsByTopic = tags.reduce(
      (acc, tt) => {
        if (!acc[tt.topicId]) acc[tt.topicId] = [];
        acc[tt.topicId].push(tt.tag);
        return acc;
      },
      {} as Record<string, { name: string; slug: string }[]>
    );

    const items: SearchHit[] = results.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body.slice(0, 300),
      slug: r.slug,
      status: r.status,
      type: r.type,
      productSlug: r.productSlug,
      productName: r.productName,
      categorySlug: r.categorySlug ?? undefined,
      categoryName: r.categoryName ?? undefined,
      authorName: r.authorName ?? "Unknown",
      authorUsername: r.authorUsername ?? undefined,
      createdAt: r.createdAt,
      voteScore: r.voteScore,
      replyCount: r.replyCount,
      tags: tagsByTopic[r.id] ?? [],
    }));

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async indexTopic(_topic: IndexableDocument): Promise<void> {
    // PostgreSQL handles indexing automatically via full-text search
    // This method is a no-op but exists for interface compatibility
  }

  async deleteTopic(_id: string): Promise<void> {
    // PostgreSQL handles this automatically when the topic is deleted
  }
}

// Factory to get the current search provider
export function getSearchProvider(): SearchProvider {
  // In the future, check feature flags or environment to switch providers
  // if (process.env.SEARCH_PROVIDER === 'meilisearch') {
  //   return new MeilisearchProvider();
  // }
  return new PostgresSearchProvider();
}

// Helper function for simple topic search
export async function searchTopics(params: SearchParams): Promise<SearchResult> {
  const provider = getSearchProvider();
  return provider.search(params);
}

