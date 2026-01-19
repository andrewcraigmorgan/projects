# Projects

A full-stack project management application built with Nuxt 4, MongoDB, and Tailwind CSS.

## Features

- **Authentication** - JWT-based auth with registration, login, and API key support
- **Organizations** - Multi-tenant with owner/admin/member roles
- **Projects** - Create and manage projects within organizations
- **Tasks** - Hierarchical task management with statuses, priorities, and assignees
- **Comments** - Add comments to tasks via the app or email replies
- **Email Notifications** - Get notified of task updates with email reply support
- **Task Subscriptions** - Subscribe to tasks to receive update notifications

## Tech Stack

- **Frontend**: Nuxt 4, Vue 3, Pinia, Tailwind CSS
- **Backend**: Nitro, MongoDB, Mongoose
- **Auth**: JWT, bcrypt

## Quick Start (Docker)

The easiest way to run the app:

```bash
docker-compose up
```

This starts both the app and MongoDB. Available at http://localhost:3000

To run in the background:
```bash
docker-compose up -d
```

To stop:
```bash
docker-compose down
```

## Manual Setup

### Prerequisites

- Node.js 18+
- MongoDB

### Steps

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Start MongoDB:
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

4. Start the dev server:
```bash
npm run dev
```

The app will be available at http://localhost:3000

## Default Credentials

On first startup (when no users exist), a default admin user is created:

- **Email**: `admin@admin.com`
- **Password**: `admin123`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/api-keys` - Generate API key

### Organizations
- `GET /api/organizations` - List user's organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/:id` - Get organization details
- `POST /api/organizations/:id/members` - Add member

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/move` - Move task (reorder/reparent)

### Comments
- `GET /api/tasks/:id/comments` - List comments on a task
- `POST /api/tasks/:id/comments` - Add a comment to a task

### Task Subscriptions
- `GET /api/tasks/:id/subscription` - Check if subscribed to a task
- `POST /api/tasks/:id/subscribe` - Subscribe to task updates
- `DELETE /api/tasks/:id/subscribe` - Unsubscribe from task updates
- `GET /api/tasks/:id/subscribers` - List task subscribers

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/projects` |
| `JWT_SECRET` | Secret for signing JWTs | - |
| `NUXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | - |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | - |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | - |
| `SMTP_FROM_EMAIL` | From address for outbound emails | `tasks@localhost` |
| `SMTP_FROM_NAME` | From name for outbound emails | `Project Tasks` |
| `INBOUND_SMTP_PORT` | Port for inbound SMTP server | `2525` |
| `INBOUND_EMAIL_DOMAIN` | Domain for reply-to addresses | `reply.localhost` |
| `EMAIL_TOKEN_SECRET` | Secret for signing reply tokens | - |
| `EMAIL_TOKEN_EXPIRY_DAYS` | Reply token expiry in days | `30` |
| `USE_MAILPIT` | Use Mailpit for email testing | `false` |
| `MAILPIT_SMTP_PORT` | Mailpit SMTP port | `1025` |

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run smtp:server  # Start inbound SMTP server for email replies
```

## Email Reply-to-Comment System

The app supports email notifications with reply functionality. When users receive task update emails, they can reply directly to add comments without signing in.

### How it works

1. **Task updates trigger notifications** - When a task is updated (status change, new comment, etc.), subscribed users receive an email
2. **Reply-to addresses include a secure token** - Format: `reply+{token}@{domain}`
3. **Replies are processed by the SMTP server** - Run `npm run smtp:server` to start the inbound server
4. **Email content becomes a comment** - Signatures and quoted text are automatically stripped

### Token Security

- Tokens are HMAC-SHA256 signed to prevent forgery
- Include recipient email hash for validation
- Configurable expiry (default: 30 days)

### Development Setup

For local testing, use [Mailpit](https://github.com/axllent/mailpit):

```bash
# Start Mailpit
docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit

# Set in .env
USE_MAILPIT=true

# View emails at http://localhost:8025
```

### Production Setup

1. Configure MX records to point to your inbound SMTP server
2. Set `EMAIL_TOKEN_SECRET` to a secure random string
3. Set `INBOUND_EMAIL_DOMAIN` to your reply domain
4. Run the SMTP server as a background service

## License

MIT
