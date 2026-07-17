# Book Nook

Full-stack reading community app — borrow and lend books within your team.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express + Prisma
- Database: PostgreSQL

## Run Locally

1. Start PostgreSQL:

```bash
docker compose up -d postgres
```

2. Start backend:

```bash
cd backend-node
npm install
npm run dev
```

Default backend URL: `http://localhost:8080`

3. Start frontend:

```bash
cd frontend
npm install
npm run dev
```

Default frontend URL: `http://localhost:5173`

## Environment Variables

Backend (`backend-node/.env`):

| Variable | Default |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/booknook` |
| `JWT_SECRET` | *(required)* |
| `PORT` | `8080` |
| `FRONTEND_URL` | `http://localhost:5173` |

Frontend (`frontend/.env`):

| Variable | Default |
|---|---|
| `VITE_API_URL` | `http://localhost:8080/api` |

If `VITE_API_URL` is not set, the app falls back to `http://localhost:8080/api`.
