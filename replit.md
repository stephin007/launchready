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
- **Auth**: Clerk (Replit-managed, @clerk/react + @clerk/express)

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

1. **Landing page (/)** — Public landing page for unauthenticated users with sign-in/sign-up CTAs. Authenticated users are redirected to /generate.
2. **Generate PRD (/generate)** — 3-question form, animated loading states, generates PRD via AI (requires auth)
3. **PRD View (/prd/:id)** — Structured PRD with sprint cards, effort/priority badges, task status toggle, share link, markdown export, version history (change log), regenerate (requires auth + ownership)
4. **Admin Dashboard (/admin)** — Real DB stats, Recharts bar/pie charts, PRD table (requires admin role via Clerk publicMetadata `{ role: "admin" }`)
5. **Shared PRD (/share/:token)** — Read-only public PRD view via share token (no auth required)
6. **Sign In (/sign-in)** — Clerk-branded sign-in page (dark theme, email + Google)
7. **Sign Up (/sign-up)** — Clerk-branded sign-up page (dark theme, email + Google)

## Authentication

- Uses Clerk (Replit-managed) with `@clerk/react` (frontend) and `@clerk/express` (backend)
- Clerk proxy runs at `/api/__clerk` via `clerkProxyMiddleware`
- Users sign up/in via email or Google OAuth
- Each PRD is linked to a `userId` (Clerk user ID)
- Admin users require `publicMetadata: { role: "admin" }` set in Clerk dashboard
- Admin dashboard only accessible to admin users
- All PRD CRUD endpoints require auth via `requireAuth` middleware
- Admin stats/list endpoints require admin role via `requireAdmin` middleware

## Backend Routes

- `POST /api/generate` — calls OpenRouter, runs logic layer, saves to DB (auth required, saves userId)
- `GET /api/prds` — list user's own PRDs (auth required, filtered by userId)
- `GET /api/prds/:id` — get PRD by ID (auth required, ownership check)
- `GET /api/prds/share/:token` — get PRD by share token (public, no auth)
- `PATCH /api/prds/:id/tasks/:taskId` — update task status (auth + ownership)
- `POST /api/prds/:id/regenerate` — regenerate PRD, save new version (auth + ownership)
- `GET /api/prds/:id/versions` — version history (auth + ownership)
- `GET /api/admin/prds` — list all PRDs for admin (admin role required)
- `GET /api/admin/stats` — admin dashboard stats (admin role required)

## Logic Layer (in api-server/src/logic/)

- `effortEstimator.ts` — keyword-based S/M/L/XL effort scoring
- `priorityEngine.ts` — rule-based P1/P2/P3 story priority
- `dependencyDetector.ts` — task dependency detection
- `sprintAllocator.ts` — sprint 1/2/3 allocation
- `openrouter.ts` — OpenRouter API caller with exact prompts
- `prdProcessor.ts` — orchestrates all logic layer modules

## Database Schema

Tables: `prds` (has `user_id` column), `task_status`, `prd_versions`

## Design System

Linear-inspired dark design: `--bg-base: #08090a`, indigo accent `#5e6ad2` / `#7170ff`, Inter Variable font (cv01, ss03), max weight 590.

## Environment Variables

- `OPENROUTER_API_KEY` — required secret for AI generation
- `DATABASE_URL` — auto-set by Replit database
- `CLERK_SECRET_KEY` — auto-provisioned by Replit Clerk integration
- `CLERK_PUBLISHABLE_KEY` — auto-provisioned by Replit Clerk integration
- `VITE_CLERK_PUBLISHABLE_KEY` — auto-provisioned by Replit Clerk integration

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
