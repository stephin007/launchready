# LaunchReady Workspace

## Overview

Full-stack pnpm monorepo. LaunchReady is an AI-powered PRD & Sprint Planning tool for non-technical founders. Answer 3 plain-English questions → get a complete engineering-ready PRD in 30 seconds.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Wouter, TanStack Query, shadcn/ui, Recharts
- **AI**: OpenRouter API (`openai/gpt-4o`)

## Artifacts

- **LaunchReady** (react-vite) — previewPath `/` — main web app
- **API Server** (api) — previewPath `/api` — Express backend

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Application Features

1. **Home page (/)** — 3-question form, animated loading states, generates PRD via AI
2. **PRD View (/prd/:id)** — Structured PRD with sprint cards, effort/priority badges, task status toggle, share link, markdown export, version history (change log), regenerate
3. **Admin Dashboard (/admin)** — Real DB stats, Recharts bar/pie charts, PRD table
4. **Shared PRD (/share/:token)** — Read-only public PRD view via share token

## Backend Routes

- `POST /api/generate` — calls OpenRouter, runs logic layer, saves to DB
- `GET /api/prds` — list all PRDs
- `GET /api/prds/:id` — get PRD by ID
- `GET /api/prds/share/:token` — get PRD by share token (public)
- `PATCH /api/prds/:id/tasks/:taskId` — update task status
- `POST /api/prds/:id/regenerate` — regenerate PRD, save new version
- `GET /api/prds/:id/versions` — version history
- `GET /api/admin/stats` — admin dashboard stats

## Logic Layer (in api-server/src/logic/)

- `effortEstimator.ts` — keyword-based S/M/L/XL effort scoring
- `priorityEngine.ts` — rule-based P1/P2/P3 story priority
- `dependencyDetector.ts` — task dependency detection
- `sprintAllocator.ts` — sprint 1/2/3 allocation
- `openrouter.ts` — OpenRouter API caller with exact prompts
- `prdProcessor.ts` — orchestrates all logic layer modules

## Database Schema

Tables: `prds`, `task_status`, `prd_versions`

## Design System

Linear-inspired dark design: `--bg-base: #08090a`, indigo accent `#5e6ad2` / `#7170ff`, Inter Variable font (cv01, ss03), max weight 590.

## Environment Variables

- `OPENROUTER_API_KEY` — required secret for AI generation
- `DATABASE_URL` — auto-set by Replit database

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
