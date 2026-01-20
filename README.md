# Community Forum

A production-ready, multi-product community forum application built with Next.js 14, TypeScript, TailwindCSS, and PostgreSQL. Similar to Google AI Forum and developer forums, optimized for companies with multiple products.

## Features

### Core Features
- 🏢 **Multi-Product Architecture** - One community, multiple products with scoped navigation
- ❓ **Questions & Answers** - Ask questions, get answers, mark accepted solutions
- 💬 **Discussions** - Start conversations and share ideas
- 📢 **Announcements** - Pin important updates
- ✨ **Showcase** - Share what you've built

### User Features
- 🔐 **Authentication** - Email/password and Google OAuth
- 👤 **User Profiles** - Bio, reputation, badges, activity history
- 🗳️ **Voting** - Upvote/downvote topics and replies
- 🔖 **Bookmarks** - Save topics for later
- 🔔 **Subscriptions** - Follow products, categories, topics, or tags
- 🏆 **Reputation System** - Earn points for helpful contributions

### Moderation
- 🚩 **Report System** - Flag inappropriate content
- 🛡️ **Moderation Queue** - Review and resolve reports
- 📋 **Audit Log** - Track all moderation actions
- 🔒 **Role-Based Access** - Guest, User, Trusted, Moderator, Admin

### Search & Discovery
- 🔍 **Full-Text Search** - PostgreSQL-powered search with faceted filtering
- 🏷️ **Tags** - Categorize and discover content
- 📂 **Categories** - Organize topics by product area

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: TailwindCSS, Radix UI components
- **Backend**: Next.js API Routes & Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js with credentials & Google OAuth
- **Search**: PostgreSQL full-text search (swappable to Meilisearch/Elastic)
- **Markdown**: react-markdown with syntax highlighting

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- PostgreSQL 14+
- Docker (optional, for local database)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/community_forum?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-generate-with-openssl"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Feature Flags
ENABLE_REDIS_CACHE="false"
ENABLE_AI_FEATURES="false"

# Redis (optional)
REDIS_URL="redis://localhost:6379"
```

### Installation

1. **Clone and install dependencies**

```bash
git clone <repository>
cd community-forum
pnpm install
```

2. **Start the database**

Using Docker (recommended):
```bash
docker-compose up -d postgres
```

Or use your own PostgreSQL instance.

3. **Set up the database**

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:push

# Seed the database with sample data
pnpm db:seed
```

4. **Start the development server**

```bash
pnpm dev
```

5. **Open the app**

Visit [http://localhost:3000/community](http://localhost:3000/community)

### Demo Accounts

After seeding, you can log in with these accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@community.dev | Admin123! |
| Moderator | mod@community.dev | Mod12345! |
| User | alice@example.com | User1234! |
| User | bob@example.com | User1234! |
| User | charlie@example.com | User1234! |

## Project Structure

```
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed script
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (community)/  # Community pages
│   │   │   ├── community/
│   │   │   │   ├── page.tsx                    # Landing page
│   │   │   │   ├── [productSlug]/
│   │   │   │   │   ├── page.tsx                # Product page
│   │   │   │   │   ├── new/page.tsx            # Create topic
│   │   │   │   │   └── topic/[topicSlug]/      # Topic detail
│   │   │   │   └── search/page.tsx             # Search results
│   │   │   ├── u/[username]/page.tsx           # User profile
│   │   │   └── mod/page.tsx                    # Moderation dashboard
│   │   ├── api/          # API routes
│   │   └── auth/         # Auth pages
│   ├── components/       # React components
│   │   ├── ui/           # Base UI components
│   │   ├── layout/       # Layout components
│   │   ├── topic/        # Topic components
│   │   └── mod/          # Moderation components
│   └── lib/              # Utilities
│       ├── actions.ts    # Server actions
│       ├── auth.ts       # Auth configuration
│       ├── db.ts         # Database client
│       ├── search.ts     # Search provider
│       ├── utils.ts      # Utility functions
│       └── validations.ts # Zod schemas
├── docker-compose.yml    # Docker configuration
├── Dockerfile            # Production Dockerfile
└── package.json
```

## Key Routes

| Route | Description |
|-------|-------------|
| `/community` | Community landing page |
| `/community/[productSlug]` | Product community page |
| `/community/[productSlug]/new` | Create new topic |
| `/community/[productSlug]/topic/[topicSlug]` | Topic detail page |
| `/community/search` | Search with filters |
| `/u/[username]` | User profile |
| `/mod` | Moderation dashboard (mods/admins) |
| `/admin` | Admin panel (admins only) |
| `/auth/signin` | Sign in |
| `/auth/signup` | Sign up |

## Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
pnpm db:migrate   # Run migrations
pnpm db:seed      # Seed database
pnpm db:studio    # Open Prisma Studio
```

## Docker

### Development

```bash
# Start just the database
docker-compose up -d postgres

# Or with Redis
docker-compose up -d postgres redis
```

### Production

```bash
# Build and run everything
docker-compose --profile production up -d
```

## Phase 2 Roadmap

Features designed for but not fully implemented:

- [ ] **Email Digests** - Daily/weekly notification emails
- [ ] **Notification Preferences** - Granular notification settings
- [ ] **Badges Engine** - Automatic badge awards based on rules
- [ ] **Rich Editor** - WYSIWYG with image uploads
- [ ] **SSO/SAML** - Enterprise single sign-on
- [ ] **Meilisearch/Elastic** - Pluggable search backend (interface ready)
- [ ] **Docs Integration** - Link topics to documentation
- [ ] **AI Helper** - Draft answers and suggest related topics

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

