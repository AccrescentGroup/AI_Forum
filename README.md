# AI Forum - Community Platform

A production-ready, multi-product community forum application built with Next.js 14, TypeScript, TailwindCSS, and PostgreSQL. Similar to Google AI Forum and developer forums, optimized for companies with multiple products.

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

| Software | Version | Download Link |
|----------|---------|---------------|
| Node.js | 18 or higher | [nodejs.org](https://nodejs.org/) |
| npm | 9 or higher | Comes with Node.js |
| PostgreSQL | 14 or higher | [postgresql.org](https://www.postgresql.org/download/) |

### Step-by-Step Installation

#### Step 1: Clone the Repository

```bash
git clone https://github.com/AccrescentGroup/AI_Forum.git
cd AI_Forum
```

#### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages and generate the Prisma client automatically.

#### Step 3: Set Up PostgreSQL Database

**Option A: Using Homebrew (macOS)**
```bash
# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Create the database
/opt/homebrew/opt/postgresql@16/bin/createdb community_forum
```

**Option B: Using Docker**
```bash
docker-compose up -d postgres
```

**Option C: Using existing PostgreSQL**
- Create a database named `community_forum`

#### Step 4: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy this and save as .env file

# Database Connection
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/community_forum?schema=public"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-characters-long"

# Google OAuth (Optional - leave empty to disable)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
NEXT_PUBLIC_GOOGLE_ENABLED="false"

# Email SMTP (Optional - uses Ethereal for development if not set)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""
EMAIL_FROM=""
```

**Generate a secure NEXTAUTH_SECRET:**
```bash
openssl rand -hex 32
```

#### Step 5: Initialize the Database

```bash
# Push the database schema
npm run db:push

# Seed the database with sample data
npm run db:seed
```

#### Step 6: Start the Development Server

```bash
npm run dev
```

#### Step 7: Open the Application

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🔐 Demo Accounts

After running the seed script, use these accounts to test:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@community.dev | Admin123! |
| **Moderator** | mod@community.dev | Mod12345! |
| **User** | alice@example.com | User1234! |
| **User** | bob@example.com | User1234! |
| **User** | charlie@example.com | User1234! |

---

## 📁 Project Structure

```
AI_Forum/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed script
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── (community)/       # Community pages
│   │   │   ├── community/     # Main forum pages
│   │   │   ├── admin/         # Admin dashboard
│   │   │   ├── mod/           # Moderation dashboard
│   │   │   └── u/             # User profiles
│   │   ├── api/               # API routes
│   │   └── auth/              # Authentication pages
│   ├── components/            # React components
│   │   ├── ui/                # UI primitives (Button, Card, etc.)
│   │   ├── layout/            # Layout components
│   │   ├── topic/             # Topic-related components
│   │   └── mod/               # Moderation components
│   └── lib/                   # Utilities & configuration
│       ├── auth.ts            # NextAuth configuration
│       ├── db.ts              # Prisma client
│       ├── email.ts           # Email/OTP service
│       ├── actions.ts         # Server actions
│       └── validations.ts     # Zod schemas
├── docker-compose.yml         # Docker configuration
├── Dockerfile                 # Production Docker image
└── package.json               # Dependencies & scripts
```

---

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

---

## 🌐 Application Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/community` | Community landing page | Public |
| `/community/[product]` | Product community page | Public |
| `/community/[product]/new` | Create new topic | Authenticated |
| `/community/[product]/topic/[slug]` | Topic detail page | Public |
| `/community/search` | Search with filters | Public |
| `/u/[username]` | User profile | Public |
| `/auth/signin` | Sign in page | Public |
| `/auth/signup` | Sign up page | Public |
| `/mod` | Moderation dashboard | Moderator/Admin |
| `/admin` | Admin panel | Admin only |

---

## ✨ Features

### Core Features
- 🏢 **Multi-Product Architecture** - One community, multiple products
- ❓ **Questions & Answers** - Ask questions, get answers, mark solutions
- 💬 **Discussions** - Start conversations and share ideas
- 📢 **Announcements** - Pin important updates
- ✨ **Showcase** - Share what you've built

### Authentication
- 📧 **Email OTP Verification** - Secure sign-up and sign-in with 6-digit codes
- 🔑 **Password Authentication** - Traditional email/password login
- 🔐 **Google OAuth** - Sign in with Google (optional)

### User Features
- 👤 **User Profiles** - Bio, reputation, badges, activity history
- 🗳️ **Voting** - Upvote/downvote topics and replies
- 🔖 **Bookmarks** - Save topics for later
- 🏆 **Reputation System** - Earn points for contributions

### Moderation
- 🚩 **Report System** - Flag inappropriate content
- 🛡️ **Moderation Queue** - Review and resolve reports
- 📋 **Audit Log** - Track all moderation actions
- 🔒 **Role-Based Access** - Guest, User, Trusted, Moderator, Admin

### Search & Discovery
- 🔍 **Full-Text Search** - PostgreSQL-powered search
- 🏷️ **Tags** - Categorize and discover content
- 📂 **Categories** - Organize topics by product area

---

## 🐳 Docker Setup

### Development with Docker

```bash
# Start PostgreSQL only
docker-compose up -d postgres

# Start PostgreSQL and Redis
docker-compose up -d postgres redis
```

### Production Build

```bash
# Build the Docker image
docker build -t ai-forum .

# Run the container
docker run -p 3000:3000 --env-file .env ai-forum
```

---

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Restart PostgreSQL
brew services restart postgresql@16
```

### Port Already in Use

```bash
# Find and kill process on port 3000
lsof -i :3000
kill -9 <PID>
```

### Reset Database

```bash
# Drop and recreate database
/opt/homebrew/opt/postgresql@16/bin/dropdb community_forum
/opt/homebrew/opt/postgresql@16/bin/createdb community_forum
npm run db:push
npm run db:seed
```

---

## 📧 Email Configuration

### Development (Default)
Emails are captured by [Ethereal](https://ethereal.email/) - check your terminal for preview links.

### Production
Add these to your `.env`:
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
EMAIL_FROM="Community Forum <noreply@yourdomain.com>"
```

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

### Self-Hosted

1. Build the production image:
```bash
docker build -t ai-forum .
```

2. Run with your environment:
```bash
docker run -d -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e NEXTAUTH_SECRET="your-secret" \
  -e NEXTAUTH_URL="https://yourdomain.com" \
  ai-forum
```

---

## 📝 License

MIT License - see LICENSE file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
