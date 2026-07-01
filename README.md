# Book Nook

Full-stack reading community app built from the original HTML prototype.

## Stack

- Frontend: React + Vite
- Backend: Spring Boot + Spring Data JPA + Flyway
- Database: PostgreSQL

## Run Locally

1. Start PostgreSQL:

```bash
docker compose up -d postgres
```

Or create a PostgreSQL database manually:

```sql
CREATE DATABASE booknook;
```

2. Start backend without installing Maven locally:

```bash
docker compose up backend
```

Default backend URL: `http://localhost:8080`

If you have Maven installed locally, you can also run:

```bash
cd backend
mvn spring-boot:run
```

3. Start frontend:

```bash
cd frontend
npm install
npm run dev
```

Default frontend URL: `http://localhost:5173`

## Database Config

Backend reads these environment variables, with defaults:

```text
BOOKNOOK_DB_URL=jdbc:postgresql://localhost:5432/booknook
BOOKNOOK_DB_USER=postgres
BOOKNOOK_DB_PASSWORD=postgres
```

For this prototype, the current user is resolved by email:

```text
BOOKNOOK_CURRENT_USER_EMAIL=gaurav.choudhary@booknook.com
```
