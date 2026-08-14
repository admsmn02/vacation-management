# Vacation Management

Vacation Management is a full-stack web application built as a web development recruitment test for TravelFactory.

It provides role-based workflows for requesters and validators to manage vacation requests, including submission, review, approval/rejection, and team-level planning visibility.

## Tech Stack

Only technologies currently present in this repository are listed below.

- Frontend:
  - Vue.js 3 + Vite
  - Vue Router
  - Axios
  - Tailwind CSS
  - shadcn-vue
- Backend:
  - Node.js
  - Express
  - TypeScript
  - TypeORM
  - JWT authentication
- Database:
  - PostgreSQL
- Local infrastructure:
  - Docker / Docker Compose
- Architecture:
  - Lightweight in-process Command/Event-oriented backend layer

Note:

- Common Event Framework is not used as a separate external framework in this implementation.

## Features

Implemented functionality includes:

- JWT authentication
- Requester and Validator roles
- Vacation request creation (requester)
- Requester request history
- Validator dashboard
- Validator filtering by status and user
- Validator pagination
- Approve/reject workflow
- Rejection comments
- Team vacation planning view
- Business rule validation
- Command/Event-oriented backend architecture for create/approve/reject workflows

## Prerequisites

- Git
- Docker
- Docker Compose
- Node.js (repository currently uses modern toolchain:
  - backend TypeScript 5.6+
  - frontend TypeScript 6 / Vite 8)
  - Recommended: Node.js 20 LTS or newer
- npm

## Installation

1. Clone the repository:

```bash
git clone git@github.com:admsmn02/vacation-management.git
cd assignments
```

2. Install backend dependencies:

```bash
cd backend
npm install
cd ..
```

3. Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

## Database Setup

The repository includes PostgreSQL via Docker Compose in `docker-compose.yml`.

Start the database:

```bash
docker compose up -d
```

Current compose mapping:

- Host port: `5433`
- Container port: `5432`

Backend environment configuration is under `backend/.env` and `backend/.env.example`.

Required backend environment variables:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=change_me
JWT_EXPIRES_IN=1h

DB_HOST=localhost
DB_PORT=5433
DB_USER=vacation_user
DB_PASSWORD=vacation_password
DB_NAME=vacation_db
```

Important:

- Do not use production secrets in local `.env`.
- Keep `DB_PORT` aligned with `docker-compose.yml` host mapping.

## Migrations

For a fresh installation, apply existing migrations with:

```bash
cd backend
npm run migration:run
```

Additional migration scripts:

```bash
npm run migration:generate
npm run migration:revert
```

Usage guidance:

- `migration:generate` is only for developers who changed TypeORM entities/schema and need to create a new migration file.
- `migration:revert` is only for intentionally reverting the most recently applied migration.
- `migration:generate` and `migration:revert` are **not required during normal installation**.

## Seed Data

Two seed commands are available:

1. Demo users:

```bash
cd backend
npm run seed:demo-users
```

What it does:

- Creates or ensures exactly two demo accounts for local testing:
  - 1 REQUESTER account
  - 1 VALIDATOR account

Demo/local credentials (testing only):

| Role      | Email                   | Password       |
| --------- | ----------------------- | -------------- |
| Requester | `requester@example.com` | `Password123!` |
| Validator | `validator@example.com` | `Password123!` |

2. Mock data:

```bash
cd backend
npm run seed:mock-data
```

What it does:

- Keeps demo users
- Creates multiple requester users (~25)
- Creates many vacation requests (~40-60 target range; current implementation generates around 50)
- Includes PENDING / APPROVED / REJECTED statuses
- Includes rejection comments for rejected requests
- Populates data across multiple months for filters, pagination, statuses, and team planning demonstrations

## Running the Application

### Backend

```bash
cd backend
npm run dev
```

Backend base URL:

- `http://localhost:3000`

### Frontend

```bash
cd frontend
npm run dev
```

Frontend URL (Vite default):

- `http://localhost:5173`

## API Overview

Main implemented REST endpoints:

Authentication:

- `POST /api/auth/login`

Requester vacation requests:

- `POST /api/vacation-requests`
- `GET /api/vacation-requests/me`

Team planning:

- `GET /api/vacation-requests/team-planning`

Validator vacation requests:

- `GET /api/vacation-requests`
- `PATCH /api/vacation-requests/:id/approve`
- `PATCH /api/vacation-requests/:id/reject`

Health:

- `GET /api/health`

## Architecture

Backend architecture is modular and route-thin for core vacation actions.

Command/Event flow for core state-changing operations:

```text
HTTP Route
	↓
Command
	↓
Command Handler
	↓
Database / Repository
	↓
Domain Event
	↓
Event Dispatcher
```

This was introduced to satisfy the recruitment requirement for Command/Event-oriented architecture while keeping implementation lightweight and understandable.

- Commands are in `backend/src/application/commands/`
- Handlers are in `backend/src/application/handlers/`
- Events are in `backend/src/application/events/`
- Dispatcher abstraction is in `backend/src/application/event-dispatcher/`

Event dispatching is in-process (no external broker required).

## Business Rules

Implemented rules:

- End date must be after start date.
- Requests cannot overlap for the same user.
- Approved requests cannot be modified through implemented workflows.
- Requests in the past are not allowed.
- Rejected requests require a non-empty comment.
- Only validators can approve/reject.

## Technical Decisions

- Vue.js + Vite:
  - Fast local development, simple SPA architecture, clear role-based page flow.
- Tailwind + shadcn-vue:
  - Consistent, maintainable UI primitives with minimal custom CSS.
- PostgreSQL + TypeORM:
  - Relational model fits users/requests/status lifecycle and supports structured querying.
- JWT auth:
  - Lightweight stateless auth suitable for this assignment scope.
- Command/Event architecture:
  - Improves separation of concerns and keeps route handlers thin while preserving pragmatic complexity.
- Docker for local PostgreSQL:
  - Reproducible local database setup for evaluators.
- Lightweight in-process events:
  - Meets architecture requirement without introducing unnecessary distributed infrastructure.

## Known Limitations

Real limitations of current implementation:

- Event dispatcher is in-process only (no distributed/event-stream infrastructure).
- Team planning is a simplified planning view (not a full calendar engine).
- Authentication is intentionally simple and assignment-focused.
- Automated test suite is not included; verification is currently build/manual-flow based.

## Project Structure

```text
assignments/
├── backend/
│   ├── src/
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   ├── handlers/
│   │   │   ├── events/
│   │   │   └── event-dispatcher/
│   │   ├── config/
│   │   ├── entities/
│   │   ├── enums/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── seeds/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── router/
│   │   ├── services/
│   │   ├── types/
│   │   └── views/
│   └── package.json
└── docker-compose.yml
```

## Testing

Build/type verification commands:

```bash
# Backend
cd backend
npx tsc --noEmit
npm run build

# Frontend
cd ../frontend
npx tsc --noEmit
npm run build
```

Manual verification flow:

1. Start database (`docker compose up -d`).
2. Run backend migrations and seed data.
3. Start backend and frontend.
4. Login as requester:
   - create request
   - verify requester history
5. Login as validator:
   - verify list/filter/pagination
   - approve/reject requests with comments
6. Verify team planning view displays approved requests.
