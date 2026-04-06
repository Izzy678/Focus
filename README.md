# Focus

**Focus** is a time-driven daily execution app: you **plan** tasks in fixed windows, see them on a **timeline**, work in **focus** mode while a task is active, and review **analytics** for the day. The backend enforces schedules (auto-start / auto-end), tracks actual time, and syncs the dashboard over **Server-Sent Events**.

## What it does

- **Plan** — Create tasks with title, category, multiple goals, and a scheduled start/end window. Overlapping windows on the same day are rejected. Upcoming tasks can be edited or deleted from the timeline.
- **Timeline** — Chronological view of today’s tasks, live “up next” / in-progress execution, optional SSE refresh, and debrief prompts when the scheduler closes a window.
- **Focus** — Session view for the active task, aligned with the scheduled window and API state.
- **Analytics (Summary)** — Planned vs actual minutes, completion counts, per-task breakdown, and debrief status.

Authentication is **Clerk** (web session → Bearer JWT to the API). Data is per user in **PostgreSQL** via **TypeORM**.

## Tech stack

| Area | Stack |
|------|--------|
| Monorepo | [Turborepo](https://turbo.build/repo/docs) + Yarn workspaces |
| Web | Next.js 15, React 19, TypeScript, Tailwind CSS, Clerk, Sonner, next-themes |
| API | NestJS, TypeORM, PostgreSQL, `@nestjs/schedule` (cron), Clerk JWT verification, SSE |

## Prerequisites

- **Node.js** ≥ 22 (see `apps/web/package.json` engines)
- **PostgreSQL** database the API can reach
- **Clerk** application (publishable + secret key) shared between web and API

## Quick start

1. **Install dependencies** (from repo root):

   ```bash
   yarn install
   ```

2. **Configure environment**

   - **`apps/api/.env`** — PostgreSQL (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`), `CLERK_SECRET_KEY`, optional `PORT` (default `3000`).
   - **`apps/web/.env`** — Clerk keys for Next.js (`NEXT_PUBLIC_CLERK_*` as required by your Clerk dashboard), and **`NEXT_PUBLIC_API_URL`** pointing at the API base including the global prefix, e.g. `http://localhost:3000/api`.

3. **Run dev servers**:

   ```bash
   yarn dev
   ```

   - **Web**: [http://localhost:6006](http://localhost:6006)  
   - **API**: [http://localhost:3000](http://localhost:3000) (HTTP routes are under `/api`, e.g. `/api/tasks/today`)

## Project structure

```
Focus/
├── apps/
│   ├── web/          # Next.js app (Plan, Timeline, Focus, Summary, auth)
│   └── api/          # NestJS app (tasks, summary, scheduler, SSE)
├── package.json      # Root scripts and workspaces
└── turbo.json        # Turbo pipeline
```

## Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start all apps in development (Turbo) |
| `yarn build` | Production build for all apps |
| `yarn lint` | Lint via Turbo |
| `yarn format` | Prettier write for common file types |

App-specific scripts live in `apps/web/package.json` and `apps/api/package.json`.

## API notes

- Global prefix: **`/api`** (see `apps/api/src/main.ts`).
- Protected routes expect **`Authorization: Bearer <Clerk session token>`**.
- Cron-driven scheduling updates task status and emits SSE events for connected clients.

## License

Private / unlicensed unless otherwise noted in individual packages (`apps/api` is `UNLICENSED` in its `package.json`).
