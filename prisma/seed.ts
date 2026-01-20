import { PrismaClient, ProductStatus, TopicStatus, TopicType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // Create admin user
  const adminPassword = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@community.dev" },
    update: {},
    create: {
      email: "admin@community.dev",
      name: "Admin User",
      username: "admin",
      role: UserRole.ADMIN,
      reputation: 1000,
      bio: "Community administrator",
      emailVerified: new Date(),
      accounts: {
        create: {
          type: "credentials",
          provider: "credentials",
          providerAccountId: "admin-account",
          access_token: adminPassword,
        },
      },
    },
  });
  console.log("✅ Created admin user:", admin.email);

  // Create moderator user
  const modPassword = await bcrypt.hash("Mod12345!", 12);
  const moderator = await prisma.user.upsert({
    where: { email: "mod@community.dev" },
    update: {},
    create: {
      email: "mod@community.dev",
      name: "Moderator User",
      username: "moderator",
      role: UserRole.MODERATOR,
      reputation: 500,
      bio: "Community moderator",
      emailVerified: new Date(),
      accounts: {
        create: {
          type: "credentials",
          provider: "credentials",
          providerAccountId: "mod-account",
          access_token: modPassword,
        },
      },
    },
  });
  console.log("✅ Created moderator user:", moderator.email);

  // Create regular users
  const userPassword = await bcrypt.hash("User1234!", 12);
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "alice@example.com" },
      update: {},
      create: {
        email: "alice@example.com",
        name: "Alice Developer",
        username: "alice",
        role: UserRole.TRUSTED,
        reputation: 250,
        bio: "Full-stack developer passionate about building great products",
        github: "alicedev",
        emailVerified: new Date(),
        accounts: {
          create: {
            type: "credentials",
            provider: "credentials",
            providerAccountId: "alice-account",
            access_token: userPassword,
          },
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "bob@example.com" },
      update: {},
      create: {
        email: "bob@example.com",
        name: "Bob Engineer",
        username: "bob",
        role: UserRole.USER,
        reputation: 75,
        bio: "Backend developer",
        emailVerified: new Date(),
        accounts: {
          create: {
            type: "credentials",
            provider: "credentials",
            providerAccountId: "bob-account",
            access_token: userPassword,
          },
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "charlie@example.com" },
      update: {},
      create: {
        email: "charlie@example.com",
        name: "Charlie Designer",
        username: "charlie",
        role: UserRole.USER,
        reputation: 120,
        bio: "UI/UX designer and frontend developer",
        twitter: "charliedesigns",
        emailVerified: new Date(),
        accounts: {
          create: {
            type: "credentials",
            provider: "credentials",
            providerAccountId: "charlie-account",
            access_token: userPassword,
          },
        },
      },
    }),
  ]);
  console.log("✅ Created", users.length, "regular users");

  // Create products
  const mainProduct = await prisma.product.upsert({
    where: { slug: "acme-platform" },
    update: {},
    create: {
      slug: "acme-platform",
      name: "Acme Platform",
      description: "The main Acme Platform - your all-in-one solution for building amazing applications",
      icon: "🚀",
      color: "#6366f1",
      status: ProductStatus.ACTIVE,
      ordering: 1,
      docsUrl: "https://docs.acme.dev",
      releaseUrl: "https://acme.dev/changelog",
    },
  });
  console.log("✅ Created main product:", mainProduct.name);

  // Create future products (hidden)
  const futureProducts = await Promise.all([
    prisma.product.upsert({
      where: { slug: "acme-analytics" },
      update: {},
      create: {
        slug: "acme-analytics",
        name: "Acme Analytics",
        description: "Advanced analytics and insights platform (coming soon)",
        icon: "📊",
        color: "#10b981",
        status: ProductStatus.HIDDEN,
        ordering: 2,
      },
    }),
    prisma.product.upsert({
      where: { slug: "acme-ai" },
      update: {},
      create: {
        slug: "acme-ai",
        name: "Acme AI",
        description: "AI-powered automation tools (beta)",
        icon: "🤖",
        color: "#f59e0b",
        status: ProductStatus.BETA,
        ordering: 3,
      },
    }),
  ]);
  console.log("✅ Created", futureProducts.length, "future products");

  // Create categories for main product
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { productId_slug: { productId: mainProduct.id, slug: "getting-started" } },
      update: {},
      create: {
        slug: "getting-started",
        name: "Getting Started",
        description: "New to Acme? Start here for setup guides and tutorials",
        icon: "🎯",
        ordering: 1,
        productId: mainProduct.id,
      },
    }),
    prisma.category.upsert({
      where: { productId_slug: { productId: mainProduct.id, slug: "api" } },
      update: {},
      create: {
        slug: "api",
        name: "API & Integration",
        description: "Questions about API endpoints, SDKs, and integrations",
        icon: "🔗",
        ordering: 2,
        productId: mainProduct.id,
      },
    }),
    prisma.category.upsert({
      where: { productId_slug: { productId: mainProduct.id, slug: "authentication" } },
      update: {},
      create: {
        slug: "authentication",
        name: "Authentication",
        description: "SSO, OAuth, API keys, and security topics",
        icon: "🔐",
        ordering: 3,
        productId: mainProduct.id,
      },
    }),
    prisma.category.upsert({
      where: { productId_slug: { productId: mainProduct.id, slug: "troubleshooting" } },
      update: {},
      create: {
        slug: "troubleshooting",
        name: "Troubleshooting",
        description: "Having issues? Get help debugging and fixing problems",
        icon: "🔧",
        ordering: 4,
        productId: mainProduct.id,
      },
    }),
    prisma.category.upsert({
      where: { productId_slug: { productId: mainProduct.id, slug: "feature-requests" } },
      update: {},
      create: {
        slug: "feature-requests",
        name: "Feature Requests",
        description: "Suggest new features and improvements",
        icon: "💡",
        ordering: 5,
        productId: mainProduct.id,
      },
    }),
  ]);
  console.log("✅ Created", categories.length, "categories");

  // Create tags
  const tags = await Promise.all([
    prisma.tag.upsert({ where: { slug: "javascript" }, update: {}, create: { name: "JavaScript", slug: "javascript", color: "#f7df1e" } }),
    prisma.tag.upsert({ where: { slug: "typescript" }, update: {}, create: { name: "TypeScript", slug: "typescript", color: "#3178c6" } }),
    prisma.tag.upsert({ where: { slug: "react" }, update: {}, create: { name: "React", slug: "react", color: "#61dafb" } }),
    prisma.tag.upsert({ where: { slug: "nextjs" }, update: {}, create: { name: "Next.js", slug: "nextjs", color: "#000000" } }),
    prisma.tag.upsert({ where: { slug: "nodejs" }, update: {}, create: { name: "Node.js", slug: "nodejs", color: "#339933" } }),
    prisma.tag.upsert({ where: { slug: "api" }, update: {}, create: { name: "API", slug: "api", color: "#6366f1" } }),
    prisma.tag.upsert({ where: { slug: "authentication" }, update: {}, create: { name: "Authentication", slug: "authentication", color: "#ef4444" } }),
    prisma.tag.upsert({ where: { slug: "database" }, update: {}, create: { name: "Database", slug: "database", color: "#8b5cf6" } }),
    prisma.tag.upsert({ where: { slug: "performance" }, update: {}, create: { name: "Performance", slug: "performance", color: "#22c55e" } }),
    prisma.tag.upsert({ where: { slug: "deployment" }, update: {}, create: { name: "Deployment", slug: "deployment", color: "#f59e0b" } }),
    prisma.tag.upsert({ where: { slug: "docker" }, update: {}, create: { name: "Docker", slug: "docker", color: "#2496ed" } }),
    prisma.tag.upsert({ where: { slug: "webhooks" }, update: {}, create: { name: "Webhooks", slug: "webhooks", color: "#ec4899" } }),
  ]);
  console.log("✅ Created", tags.length, "tags");

  // Create sample topics
  const topics = await Promise.all([
    // Announcement
    prisma.topic.create({
      data: {
        slug: "welcome-to-acme-community",
        title: "Welcome to the Acme Platform Community! 🎉",
        body: `# Welcome to our community!

We're excited to have you here. This is your space to:

- **Ask questions** about using Acme Platform
- **Share solutions** you've discovered
- **Discuss best practices** with other developers
- **Showcase** what you've built

## Getting Started

1. Browse existing topics to see if your question has been answered
2. Use the search function to find specific topics
3. When asking a question, be specific and include code examples
4. Tag your posts appropriately to help others find them

## Community Guidelines

- Be respectful and helpful
- Search before posting
- Use code blocks for code
- Mark answers as accepted when your question is resolved

Happy building! 🚀`,
        type: TopicType.ANNOUNCEMENT,
        status: TopicStatus.OPEN,
        isPinned: true,
        productId: mainProduct.id,
        authorId: admin.id,
        voteScore: 25,
        viewCount: 500,
        replyCount: 3,
      },
    }),

    // Questions
    prisma.topic.create({
      data: {
        slug: "how-to-set-up-oauth-with-google",
        title: "How to set up OAuth with Google in Acme Platform?",
        body: `I'm trying to integrate Google OAuth into my Acme Platform project but I'm getting stuck on the callback configuration.

## What I've tried

\`\`\`typescript
const authConfig = {
  providers: ['google'],
  callbackUrl: '/api/auth/callback'
};
\`\`\`

## The error I'm seeing

\`\`\`
Error: Invalid redirect_uri
\`\`\`

## Environment

- Acme Platform v2.5
- Node.js 18
- Running locally on port 3000

Any help would be appreciated!`,
        type: TopicType.QUESTION,
        status: TopicStatus.ANSWERED,
        productId: mainProduct.id,
        categoryId: categories[2].id, // Authentication
        authorId: users[0].id,
        voteScore: 12,
        viewCount: 234,
        replyCount: 4,
        tags: {
          create: [
            { tagId: tags[6].id }, // authentication
            { tagId: tags[5].id }, // api
          ],
        },
      },
    }),

    prisma.topic.create({
      data: {
        slug: "best-practices-for-api-rate-limiting",
        title: "Best practices for API rate limiting?",
        body: `I'm building an application that makes heavy use of the Acme API and I want to make sure I'm handling rate limits properly.

## Questions

1. What are the current rate limits for the API?
2. How should I implement exponential backoff?
3. Are there any client libraries that handle this automatically?

I'm using TypeScript with Node.js. Thanks!`,
        type: TopicType.QUESTION,
        status: TopicStatus.OPEN,
        productId: mainProduct.id,
        categoryId: categories[1].id, // API
        authorId: users[1].id,
        voteScore: 8,
        viewCount: 156,
        replyCount: 2,
        tags: {
          create: [
            { tagId: tags[5].id }, // api
            { tagId: tags[1].id }, // typescript
            { tagId: tags[4].id }, // nodejs
          ],
        },
      },
    }),

    prisma.topic.create({
      data: {
        slug: "getting-started-with-acme-sdk",
        title: "Getting started with the Acme SDK - a complete guide",
        body: `After spending some time with the SDK, I wanted to share a comprehensive getting started guide for newcomers.

## Installation

\`\`\`bash
npm install @acme/sdk
# or
pnpm add @acme/sdk
\`\`\`

## Basic Setup

\`\`\`typescript
import { AcmeClient } from '@acme/sdk';

const client = new AcmeClient({
  apiKey: process.env.ACME_API_KEY,
  environment: 'production'
});
\`\`\`

## Making Your First Request

\`\`\`typescript
const result = await client.projects.list();
console.log(result.data);
\`\`\`

## Error Handling

Always wrap your API calls in try-catch:

\`\`\`typescript
try {
  const result = await client.projects.create({ name: 'My Project' });
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    // Handle rate limiting
  }
}
\`\`\`

Hope this helps someone! Let me know if you have questions.`,
        type: TopicType.DISCUSSION,
        status: TopicStatus.OPEN,
        productId: mainProduct.id,
        categoryId: categories[0].id, // Getting Started
        authorId: users[0].id,
        voteScore: 35,
        viewCount: 890,
        replyCount: 12,
        tags: {
          create: [
            { tagId: tags[1].id }, // typescript
            { tagId: tags[4].id }, // nodejs
          ],
        },
      },
    }),

    prisma.topic.create({
      data: {
        slug: "my-saas-dashboard-built-with-acme",
        title: "Showcase: My SaaS dashboard built with Acme Platform",
        body: `I just launched my SaaS analytics dashboard built entirely on Acme Platform and wanted to share!

## Features

- Real-time data visualization
- Custom reporting
- Team collaboration
- Webhook integrations

## Tech Stack

- Acme Platform for the backend
- Next.js for the frontend
- Tailwind CSS for styling
- Vercel for deployment

## Screenshots

[Coming soon - will add images when image uploads are supported]

## What I learned

Building with Acme was a great experience. The SDK is well-documented and the API is intuitive. Would definitely recommend for similar projects!

Check it out at [example.com](https://example.com)

Would love to hear your feedback!`,
        type: TopicType.SHOWCASE,
        status: TopicStatus.OPEN,
        productId: mainProduct.id,
        authorId: users[2].id,
        voteScore: 42,
        viewCount: 567,
        replyCount: 8,
        tags: {
          create: [
            { tagId: tags[3].id }, // nextjs
            { tagId: tags[2].id }, // react
            { tagId: tags[9].id }, // deployment
          ],
        },
      },
    }),

    prisma.topic.create({
      data: {
        slug: "webhook-signature-verification-failing",
        title: "Webhook signature verification failing in production",
        body: `I have webhooks working perfectly in development but when I deploy to production, the signature verification always fails.

## My verification code

\`\`\`typescript
const signature = req.headers['x-acme-signature'];
const isValid = verifySignature(payload, signature, webhookSecret);
// Always returns false in production
\`\`\`

## What I've checked

- [x] Webhook secret is correctly set in environment variables
- [x] Payload is being read as raw body
- [x] Works in development with ngrok

## Environment

- Deployed on AWS Lambda
- Using API Gateway

Any ideas what could be different in production?`,
        type: TopicType.QUESTION,
        status: TopicStatus.OPEN,
        productId: mainProduct.id,
        categoryId: categories[3].id, // Troubleshooting
        authorId: users[1].id,
        voteScore: 5,
        viewCount: 89,
        replyCount: 1,
        tags: {
          create: [
            { tagId: tags[11].id }, // webhooks
            { tagId: tags[9].id }, // deployment
          ],
        },
      },
    }),
  ]);
  console.log("✅ Created", topics.length, "sample topics");

  // Create sample replies
  const replies = await Promise.all([
    // Reply to OAuth question
    prisma.reply.create({
      data: {
        body: `The issue is likely that your callback URL isn't matching what's registered in the Google Cloud Console.

Make sure you have the exact URL registered:

\`\`\`
http://localhost:3000/api/auth/callback/google
\`\`\`

Note that it should include \`/google\` at the end for the Google provider.

Also, make sure you've set the \`GOOGLE_CLIENT_ID\` and \`GOOGLE_CLIENT_SECRET\` environment variables correctly.`,
        topicId: topics[1].id,
        authorId: users[0].id,
        voteScore: 8,
      },
    }),

    // Reply to rate limiting question
    prisma.reply.create({
      data: {
        body: `Great question! Here are the current rate limits:

- **Free tier**: 100 requests/minute
- **Pro tier**: 1000 requests/minute
- **Enterprise**: Custom limits

For exponential backoff, I recommend using the \`p-retry\` library:

\`\`\`typescript
import pRetry from 'p-retry';

const result = await pRetry(
  () => client.api.call(),
  { retries: 5 }
);
\`\`\`

The official SDK actually handles rate limiting automatically in v2.0+!`,
        topicId: topics[2].id,
        authorId: moderator.id,
        voteScore: 15,
      },
    }),

    // Reply to showcase
    prisma.reply.create({
      data: {
        body: `This looks amazing! 🎉 

Love the clean design and the feature set. How long did it take you to build this?

Also curious about your experience with the real-time features - did you use webhooks or polling?`,
        topicId: topics[4].id,
        authorId: users[1].id,
        voteScore: 3,
      },
    }),
  ]);
  console.log("✅ Created", replies.length, "sample replies");

  // Mark one reply as accepted answer
  await prisma.topic.update({
    where: { id: topics[1].id },
    data: { acceptedReplyId: replies[0].id },
  });
  console.log("✅ Marked accepted answer");

  // Create badges
  const badges = await Promise.all([
    prisma.badge.upsert({
      where: { slug: "first-post" },
      update: {},
      create: {
        name: "First Post",
        slug: "first-post",
        description: "Created your first topic",
        icon: "✨",
        color: "#6366f1",
      },
    }),
    prisma.badge.upsert({
      where: { slug: "helpful" },
      update: {},
      create: {
        name: "Helpful",
        slug: "helpful",
        description: "Had an answer accepted",
        icon: "🤝",
        color: "#22c55e",
      },
    }),
    prisma.badge.upsert({
      where: { slug: "popular" },
      update: {},
      create: {
        name: "Popular",
        slug: "popular",
        description: "Received 10+ votes on a post",
        icon: "🔥",
        color: "#f59e0b",
      },
    }),
    prisma.badge.upsert({
      where: { slug: "veteran" },
      update: {},
      create: {
        name: "Veteran",
        slug: "veteran",
        description: "Member for over 1 year",
        icon: "🏆",
        color: "#a855f7",
      },
    }),
  ]);
  console.log("✅ Created", badges.length, "badges");

  // Award some badges
  await prisma.userBadge.createMany({
    data: [
      { userId: users[0].id, badgeId: badges[0].id },
      { userId: users[0].id, badgeId: badges[1].id },
      { userId: users[0].id, badgeId: badges[2].id },
      { userId: admin.id, badgeId: badges[3].id },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Awarded badges to users");

  // Update tag usage counts
  await prisma.$executeRaw`
    UPDATE "Tag" 
    SET "usageCount" = (
      SELECT COUNT(*) FROM "TopicTag" WHERE "TopicTag"."tagId" = "Tag".id
    )
  `;
  console.log("✅ Updated tag usage counts");

  console.log("\n🎉 Seeding complete!\n");
  console.log("📧 Demo accounts:");
  console.log("   Admin: admin@community.dev / Admin123!");
  console.log("   Mod: mod@community.dev / Mod12345!");
  console.log("   User: alice@example.com / User1234!");
  console.log("   User: bob@example.com / User1234!");
  console.log("   User: charlie@example.com / User1234!\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

