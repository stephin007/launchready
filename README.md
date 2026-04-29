# LaunchReady

> **From idea to engineering-ready plan in 30 seconds.**
>
> Answer 3 plain-English questions. Get a complete PRD, user stories, sprint plan, and prioritised engineering tasks — powered by GPT-4o.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Tech Stack](#tech-stack)
4. [Frontend Implementation](#frontend-implementation)
5. [Backend Logic Layer](#backend-logic-layer)
6. [Database Schema](#database-schema)
7. [Admin Dashboard](#admin-dashboard)
8. [Running Locally](#running-locally)
9. [Environment Variables](#environment-variables)
10. [Git Commit Progression](#git-commit-progression)

---

## Project Overview

LaunchReady is a full-stack AI-powered Product Requirements Document (PRD) generator built for non-technical founders. Instead of writing lengthy specs, founders answer three questions:

- **What problem does your feature solve?**
- **Who is this feature for?**
- **What does success look like?**

LaunchReady passes these to GPT-4o via OpenRouter, then processes the raw AI output through a deterministic logic pipeline to produce:

- A structured PRD with title and summary
- Goals and success metrics
- User stories (US-1, US-2 …) in standard agile format with acceptance criteria
- Engineering tasks per story with **effort badges** (S / M / L / XL), **priority labels** (P1 / P2 / P3), and **sprint groupings** (Sprint 1 / Sprint 2 / Sprint 3)
- Per-task status tracking (todo → in-progress → done)
- A shareable read-only link for each PRD
- A version changelog when a PRD is regenerated

---

## System Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Browser Client                   │
│          React + Vite  (artifacts/launchready)       │
│                                                      │
│  ┌──────────┐  ┌───────────┐  ┌───────────────────┐ │
│  │  Home    │  │  PRD View │  │  Admin Dashboard  │ │
│  │ /        │  │ /prd/:id  │  │  /admin           │ │
│  └──────────┘  └───────────┘  └───────────────────┘ │
│         │              │                │            │
│         └──────────────┼────────────────┘            │
│                        │  @workspace/api-client-react│
└────────────────────────┼────────────────────────────-┘
                         │ HTTP  (REST JSON)
                         ▼
┌──────────────────────────────────────────────────────┐
│              Express API Server                      │
│          (artifacts/api-server)                      │
│                                                      │
│  POST /api/prds/generate                             │
│  GET  /api/prds/:id                                  │
│  POST /api/prds/:id/regenerate                       │
│  PATCH /api/prds/:id/tasks/:taskId/status            │
│  GET  /api/prds/share/:token                         │
│  GET  /api/prds/:id/versions                         │
│  GET  /api/admin/stats                               │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │              Logic Layer                       │  │
│  │  openrouter.ts      → GPT-4o prompt & parse    │  │
│  │  prdProcessor.ts    → orchestrates pipeline    │  │
│  │  effortEstimator.ts → keyword → S/M/L/XL       │  │
│  │  priorityEngine.ts  → P1/P2/P3 scoring         │  │
│  │  dependencyDetector.ts → task deps graph       │  │
│  │  sprintAllocator.ts → sprint 1/2/3 grouping    │  │
│  └────────────────────────────────────────────────┘  │
│                        │                             │
│          @workspace/db (Drizzle ORM)                 │
└────────────────────────┼─────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│            PostgreSQL Database                       │
│                                                      │
│   prds            task_status       prd_versions     │
└──────────────────────────────────────────────────────┘
                         ▲
                         │ OPENROUTER_API_KEY
                         ▼
                  ┌─────────────┐
                  │  OpenRouter │
                  │  (GPT-4o)   │
                  └─────────────┘
```

**Monorepo packages** (pnpm workspaces):

| Package | Role |
|---|---|
| `artifacts/launchready` | React + Vite frontend |
| `artifacts/api-server` | Express REST API |
| `lib/db` | Drizzle ORM schema + client |
| `lib/api-spec` | OpenAPI spec (YAML) |
| `lib/api-zod` | Generated Zod validators from spec |
| `lib/api-client-react` | Generated React Query hooks from spec |

---

## Tech Stack

### Frontend
| Layer | Library / Tool |
|---|---|
| Framework | React 19 + Vite 6 |
| Routing | Wouter |
| Data fetching | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| UI components | shadcn/ui (Radix primitives) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Icons | Lucide React |
| Typography | Inter Variable (self-hosted) |

### Backend
| Layer | Library / Tool |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| ORM | Drizzle ORM |
| Validation | Zod (generated from OpenAPI) |
| Logging | Pino + pino-http |
| AI | OpenRouter → GPT-4o |
| ID generation | uuid v4 |

### Infrastructure
| Layer | Tool |
|---|---|
| Database | PostgreSQL (Replit managed) |
| Package manager | pnpm workspaces |
| API contract | OpenAPI 3.1 → codegen (Zod + React Query) |
| Type checking | TypeScript (project references) |

### Design System
- Background base: `#08090a`
- Accent (indigo): `#5e6ad2`
- Accent bright: `#7170ff`
- Max font weight: 590 (Inter Variable)
- Inspired by Linear's dark UI

---

## Frontend Implementation

```
artifacts/launchready/src/
├── pages/
│   ├── home.tsx              # 3-question form → triggers generation
│   ├── prd-view.tsx          # Full PRD output, task status updates, share/export/regen
│   ├── admin-dashboard.tsx   # Stats cards, charts, PRD table
│   ├── shared-prd.tsx        # Read-only public view via share token
│   └── not-found.tsx         # 404 page
├── components/
│   ├── layout.tsx            # Navbar + page shell
│   ├── prd-content-display.tsx  # Goals, user stories, sprint cards, tasks
│   └── ui/                   # shadcn/ui primitives (button, badge, card …)
└── main.tsx                  # Router, QueryClient provider
```

### Key flows

**Generation flow** (`home.tsx`)
1. User fills out 3 text areas + optional product name
2. Form submits via `useGeneratePrd` mutation hook
3. Button swaps to spinner + "Generating…" while disabled; fields are disabled
4. Cycling status messages animate below the button (e.g. "Reading your idea...", "Designing user stories...")
5. On success → `navigate(/prd/:id)`

**PRD view** (`prd-view.tsx` + `prd-content-display.tsx`)
- Tabs: **Plan** (default) and **Changelog**
- Plan tab renders: Summary → Goals/Metrics → User Stories (collapsible) → Sprint Plan
- Task status cycles `todo → in-progress → done` on click with optimistic local state and a PATCH call to persist
- Share Link copies the `/share/:token` URL to clipboard
- Export `.md` downloads a Markdown file
- Regenerate re-calls the AI and snapshots the previous version

**Sprint cards**
- Grouped by sprint number; each card header shows task count + total effort points
- Effort badge colours: S (green) / M (blue) / L (amber) / XL (red)
- Priority badge colours: P1 (red) / P2 (amber) / P3 (green)

---

## Backend Logic Layer

The Express API receives raw user input, calls GPT-4o, and then runs the AI output through a deterministic five-stage pipeline before saving anything to the database.

### Pipeline (`artifacts/api-server/src/logic/`)

```
callOpenRouter()          Sends a structured prompt to GPT-4o via OpenRouter.
       │                  Returns a typed RawPrdContent object.
       ▼
prdProcessor.processPrd()
       │
       ├─ effortEstimator.ts
       │    Keyword-match each task title/description against four buckets:
       │    S  → copy, label, color, icon, tooltip, rename …
       │    M  → form, button, page, component, modal, filter …
       │    L  → api, database, auth, algorithm, endpoint, hook …
       │    XL → payment, real-time, websocket, oauth, encryption …
       │    Maps bucket → numeric score (S=1, M=2, L=3, XL=4).
       │
       ├─ priorityEngine.ts
       │    Scores each user story P1/P2/P3:
       │    P1 if title contains login/auth/onboard keywords, or any XL task.
       │    P3 if all tasks are S effort.
       │    P2 otherwise.
       │
       ├─ dependencyDetector.ts
       │    Scans task titles for cross-references and marks isBlocked / blockedBy.
       │
       └─ sprintAllocator.ts
            Assigns sprint 1/2/3 per task:
            P1 unblocked tasks → Sprint 1
            P1 blocked + P2 unblocked → Sprint 2
            Everything else → Sprint 3
```

### API Routes (`artifacts/api-server/src/routes/`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/prds/generate` | Generate new PRD from 3 answers |
| `GET` | `/api/prds/:id` | Fetch PRD with live task statuses merged in |
| `POST` | `/api/prds/:id/regenerate` | Re-run AI, snapshot previous version |
| `PATCH` | `/api/prds/:id/tasks/:taskId/status` | Update a single task status |
| `GET` | `/api/prds/share/:token` | Public read-only PRD by share token |
| `GET` | `/api/prds/:id/versions` | List all version snapshots |
| `GET` | `/api/admin/stats` | Aggregate stats + per-PRD rows for dashboard |

---

## Database Schema

Three tables, all managed by Drizzle ORM with PostgreSQL.

### `prds`
| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | UUID v4 |
| `title` | `text` NOT NULL | AI-generated title |
| `problem` | `text` | User's problem statement |
| `audience` | `text` | User's target audience |
| `success_criteria` | `text` | User's success definition |
| `product_name` | `text` | Optional product name |
| `raw_output` | `text` NOT NULL | Full JSON blob of processed PRD content |
| `share_token` | `text` UNIQUE NOT NULL | UUID v4 for public share link |
| `created_at` | `timestamptz` | Auto-set on insert |

### `task_status`
Stores per-task status overrides so the raw PRD JSON stays immutable.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` PK | UUID v4 |
| `prd_id` | `text` FK → `prds.id` | |
| `task_id` | `text` | Matches task `id` inside `raw_output` |
| `status` | `text` | `todo` / `in-progress` / `done` |
| `updated_at` | `timestamptz` | Auto-updated on change |

### `prd_versions`
Immutable snapshot log for the changelog tab.

| Column | Type | Notes |
|---|---|---|
| `id` | `integer` PK | Auto-increment identity |
| `prd_id` | `text` FK → `prds.id` | |
| `version_number` | `integer` | Increments per regeneration |
| `snapshot` | `text` | Full JSON of PRD content at that point in time |
| `created_at` | `timestamptz` | Auto-set on insert |

---

## Admin Dashboard

Accessible at `/admin`. Provides a live operational view over all generated PRDs.

### Stats cards (top row)
| Card | Value |
|---|---|
| Total PRDs | Count of all rows in `prds` |
| Total Tasks | Sum of all tasks across all PRDs |
| Avg Effort Score | Mean `effortScore` (1–4) across all tasks |
| PRDs This Week | Count of PRDs created in the last 7 days |

### Charts (middle row)
- **PRDs per day (last 7 days)** — bar chart showing daily generation volume
- **Priority Breakdown** — pie chart of P1 / P2 / P3 task distribution across all PRDs
- **Effort Distribution** — horizontal bar chart of S / M / L / XL task counts

### PRD table (bottom)
Lists every PRD with title, creation date, task count, effort breakdown, priority mix badges, and quick-access icons (share link, view PRD).

**Empty state:** if no PRDs have been generated yet, the dashboard shows a prompt with a direct link to the generation form.

---

## Running Locally

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL database (or use the Replit-managed one)

### Steps

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd launchready

# 2. Install all dependencies
pnpm install

# 3. Set up environment variables (see next section)
cp .env.example .env
# Fill in DATABASE_URL and OPENROUTER_API_KEY

# 4. Push the database schema
pnpm --filter @workspace/db run db:push

# 5. Start the API server
pnpm --filter @workspace/api-server run dev

# 6. In a second terminal, start the frontend
pnpm --filter @workspace/launchready run dev
```

The frontend will be at `http://localhost:5173` and the API at `http://localhost:3001`.

### Run typechecks

```bash
pnpm run typecheck
```

### Regenerate API client from OpenAPI spec

```bash
pnpm run codegen
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/launchready` |
| `OPENROUTER_API_KEY` | Yes | API key from [openrouter.ai](https://openrouter.ai) — used to call GPT-4o |
| `PORT` | No | Port the API server listens on (default: `3001`) |

> **Note:** Never commit these values to version control. Use a `.env` file locally and your hosting platform's secrets manager in production.

---

## Git Commit Progression

| Commit | Description |
|---|---|
| `8337c4b` | **Initial commit** — blank pnpm monorepo scaffold |
| `7323546` | Transitioned from planning to build mode |
| `881b41a` – `d655636` – `22b1800` | **Full-stack build** — React+Vite frontend, Express API, PostgreSQL+Drizzle schema, OpenRouter integration, Zod codegen, all 4 pages (Home, PRD View, Admin, Shared), AI prompt + logic pipeline, shareable links |
| `4e4bc73` | Minor fixes and stabilisation post-build |
| `a7ddf40` | **Hero section** — headline, subheadline, feature pills, and radial indigo glow behind the heading on the home page |
| `799b235` | **User Stories section** — collapsible US cards added between Goals/Metrics and Sprint Plan on the PRD view |
| `43a40a5` | **Task status toggle** — click-to-cycle `todo → in-progress → done` with optimistic local state, hollow/filled/checkmark icons |
| `47ad825` | **Visual + UX polish** — navbar logo purple glow, sprint effort point totals in sprint headers, admin empty state, generate button inline loading state (spinner + cycling status messages, fields disabled) |
