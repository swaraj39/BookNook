# Book Nook

Full-stack reading community app — borrow and lend books within your team.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express + Prisma
- Database: PostgreSQL
- Cache: Redis
- Auth: JWT + Bcrypt

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) >= 18
- npm (ships with Node.js)

---

## Local Setup

### 1. Infrastructure (PostgreSQL + Redis + pgAdmin)

Start all services:

```bash
docker compose -f docker-compose.yml up -d postgres redis
```

Or separately:

```bash
docker compose -f backend-node/docker-compose.yml up -d postgres pgadmin
docker compose -f redis-docker/docker-compose.yml up -d redis
```

This starts:
| Service    | Container          | Port  | Credentials                     |
|------------|--------------------|-------|----------------------------------|
| PostgreSQL | `local-postgres`   | 5433  | `postgres` / `postgres` / `app` |
| pgAdmin    | `pgadmin`          | 5050  | `admin@example.com` / `admin`   |
| Redis      | `booknook-redis`   | 6378  | —                                |

> **Note:** If you prefer the root docker-compose, PostgreSQL runs on port **5432** and Redis on **6379** instead. Adjust `DATABASE_URL` and `REDIS_URL` in `backend-node/.env` accordingly.

### 2. Backend

```bash
cd backend-node

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Apply database migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio to browse data
npx prisma studio

# Start dev server (auto-restarts on changes)
npm run dev
```

Backend runs at **http://localhost:8080**.

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at **http://localhost:5173**.

---

## Environment Variables

### Backend (`backend-node/.env`)

```env
# Database (local)
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/app"

# Redis (local)
REDIS_URL=redis://localhost:6378

# JWT secret (generate one via: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET="your-secret-here"

# Server
PORT=8080
FRONTEND_URL=http://localhost:5173

# Workato webhooks (for OTP emails)
WORKATO_SIGNUP_WEBHOOK_URL="https://webhooks.workato.com/..."
WORKATO_FORGOT_PASSWORD_WEBHOOK_URL="https://webhooks.workato.com/..."
WORKATO_SIGNUP_VERIFICATION_WEBHOOK_URL="https://webhooks.workato.com/..."
```

> If PostgreSQL runs on a different port (e.g. 5432 from root docker-compose), update `DATABASE_URL` to `postgresql://postgres:postgres@localhost:5432/booknook`.

### Frontend (`frontend/.env`)

```env
VITE_API_URL="http://localhost:8080/api"
```

If `VITE_API_URL` is not set, the app falls back to `http://localhost:8080/api` automatically.

---

## Useful Commands

| Action                    | Command                                        |
|---------------------------|------------------------------------------------|
| Start PostgreSQL + Redis  | `docker compose -f docker-compose.yml up -d postgres redis` |
| Start pgAdmin             | `docker compose -f backend-node/docker-compose.yml up -d pgadmin` |
| Stop all containers       | `docker compose -f docker-compose.yml down`    |
| View logs                 | `docker compose logs -f postgres redis`         |
| Backend dev               | `cd backend-node && npm run dev`               |
| Frontend dev              | `cd frontend && npm run dev`                   |
| Prisma Studio             | `cd backend-node && npx prisma studio`         |
| Regenerate Prisma client  | `cd backend-node && npx prisma generate`       |
| Apply migrations          | `cd backend-node && npx prisma migrate dev`    |
| Type check                | `cd backend-node && npm run typecheck`         |
| Build frontend            | `cd frontend && npm run build`                 |
