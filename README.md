# Projects

A full-stack project management application built with Nuxt 4, MongoDB, and Tailwind CSS.

## Features

- **Authentication** - JWT-based auth with registration, login, and API key support
- **Organizations** - Multi-tenant with owner/admin/member roles
- **Projects** - Create and manage projects within organizations
- **Tasks** - Hierarchical task management with statuses, priorities, and assignees

## Tech Stack

- **Frontend**: Nuxt 4, Vue 3, Pinia, Tailwind CSS
- **Backend**: Nitro, MongoDB, Mongoose
- **Auth**: JWT, bcrypt

## Prerequisites

- Node.js 18+
- MongoDB

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Start MongoDB (or use Docker):
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

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
```

## License

MIT
