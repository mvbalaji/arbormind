# Workspace

## Overview

CRMAI — A comprehensive CRM application built with React-Vite frontend + Express API + PostgreSQL. Modeled after Salesforce and Zoho CRM.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + Recharts + @hello-pangea/dnd
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## CRM Modules

All modules are fully implemented with real data:

1. **Dashboard** — "Sales Command Center" with 5 KPI cards, AI Insights banner, pipeline bar chart + win/loss donut, hot deals panel, recent leads click-through, upcoming activities feed
2. **Contacts** — searchable table with add contact modal, account & owner info; Contact detail page
3. **Leads** — table with lead scoring badges, click-through to `/leads/:id` detail page; Lead detail has score gauge, lifecycle stage stepper, convert flow, email compose, AI summary
4. **Accounts** — company table with extended fields (status, stage, amount, closeDate, probability, forecastCategory, nextStep, optyOwner, optyTeam, createdBy, modifiedBy); click-through to `/accounts/:id` detail page with 6 tabs (Contacts/Opportunities/Activities/Quotes/Cases/About) — full 360-degree view + KPI row
5. **Opportunities** — Kanban pipeline board with drag-and-drop; Opportunity detail page with AI summary, email compose, quote builder, PDF quote generator, tabs for Activities/Quotes/Details
6. **Campaigns** — campaign table with click-through to `/campaigns/:id` detail page with status management, budget progress, simulated metrics, ROI display, AI summary
7. **Activities** — log of calls, emails, meetings, tasks, notes with due dates
8. **Products** — product catalog with pricing and categories
9. **Quotes** — quotes with line items, totals, status tracking (Draft/Sent/Accepted/Rejected/Expired), versioning (clone+increment), PDF generation (pdfkit), quote detail page with version history, send to customer workflow
10. **Orders** — order tracking created from accepted quotes, with status workflow (Pending→Confirmed→Shipped→Delivered/Cancelled)
11. **Cases/Support** — case management with priority/status badges; Support inbox with webhook-based emails (`POST /api/emails`)
12. **Reports** — pipeline by stage bar chart, lead sources, revenue forecast charts
13. **AI Assistant** — Floating AI chatbot (FAB → chat panel) powered by OpenAI via Replit AI Integrations; AI Summary cards on entity list pages (leads, contacts, opportunities, quotes) and detail pages with real-time data analysis
14. **Users / Team & Data** — user management table with roles and teams; includes **Data Import** tab for bulk Excel/CSV import of any entity
15. **Bulk Data Import** — `/api/import/:entity` (POST) accepts JSON records for leads/contacts/accounts/opportunities/campaigns with smart column normalization (camelCase, snake_case, Title Case)

## Key Components

- `artifacts/crmai/src/components/ai-summary.tsx` — AI summary panel calling POST /api/ai/summary; "Generate Summary" button fetches real AI insights from CRM data; used on detail pages and list pages (leads, contacts, opportunities, quotes)
- `artifacts/crmai/src/components/ai-chatbot.tsx` — Floating AI chatbot (FAB → chat panel); messages POST /api/ai/chat with full CRM context; markdown rendering, suggestion chips, clear chat
- `artifacts/crmai/src/components/email-compose.tsx` — Email compose dialog with 5 built-in templates (Initial Outreach, Follow-up, Proposal, Quote Send, Meeting Request), CC support, mock send

## Detail Pages

- `/leads/:id` — Lead detail (score gauge, lifecycle stepper, convert to contact, edit, email compose, AI summary)
- `/accounts/:id` — Account detail 360-degree view (6 tabs: contacts/opportunities/activities/quotes/cases/about, KPI row, extended fields)
- `/opportunities/:id` — Opportunity detail (stage pipeline progress, quotes tab with PDF generation, activities, email compose, AI summary)
- `/campaigns/:id` — Campaign detail (status control: launch/pause/complete, budget progress, simulated metrics, ROI, edit)
- `/quotes/:id` — Quote detail (line items table, version history, PDF download, send to customer, accept/reject, create new version, convert to order)
- `/orders` — Orders list (created from accepted quotes, status workflow: pending→confirmed→shipped→delivered)

## Email Sync / Spacemail Integration

- IMAP defaults to `support@arbormind.in` on `mail.spacemail.com:993`. Override per-deployment with `IMAP_HOST` / `IMAP_PORT` / `IMAP_USER` / `IMAP_PASSWORD` env vars, or per-tenant via the `email_settings` DB row.
- Email body parsing uses `mailparser`'s `simpleParser` to extract both plain text (`message`) and HTML (`body_html`); the support inbox renders HTML via DOMPurify with a text fallback.
- Deduplication is enforced by a `messageUid` column with a unique index plus `onConflictDoNothing` on insert — re-running the sync is a no-op once a message has been imported.
- The support inbox UI auto-refreshes silently every 30 seconds (POST `/api/admin/email-sync` then GET `/api/emails`); the manual Refresh button does the same with a visible spinner.
- Email sync auto-creates Activity records (type=email) for every inbound email and links them to contact/lead/opportunity/account where possible.
- Server-side poller runs every `sync_interval_minutes` (default 1 min) on server boot if credentials are configured.

## Database Schema (11 tables)

- `users` — CRM users with roles (admin/manager/rep)
- `accounts` — Company accounts with industry, revenue, employees, plus extended fields: status, stage, amount, closeDate, probability, forecastCategory, nextStep, optyOwner, optyTeam, createdBy, modifiedBy
- `contacts` — Individual contacts linked to accounts
- `leads` — Leads with scoring (0-100), source, status tracking
- `lead_contacts` — Join table for 1-to-many lead→contacts relationship
- `opportunities` — Deals with stages, amounts, probabilities, close dates
- `activities` — Activities (call/email/meeting/task/note) linked to contacts/opportunities/leads/accounts
- `products` — Product catalog with pricing
- `cases` — Support cases with priority/status/type
- `quotes` + `quote_items` — Quotes linked to opportunities with line item details
- `emails` — Inbound email records from IMAP sync
- `email_settings` — IMAP/SMTP configuration

## Seed Data

Run with: `pnpm --filter @workspace/scripts run seed-crm`

Seeds: 8 users, 20 accounts, 28 contacts, 20 leads, 30 opportunities, 12 products, 20 activities, 15 cases, 3 quotes

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080)
│   └── crmai/              # React-Vite CRM frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed-crm.ts     # Database seeder
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers for all CRM resources
- Depends on: `@workspace/db`, `@workspace/api-zod`, `@workspace/integrations-openai-ai-server`

API routes: `/api/users`, `/api/accounts`, `/api/contacts`, `/api/leads` (+ `/api/leads/:id/convert`), `/api/opportunities`, `/api/activities`, `/api/products`, `/api/cases`, `/api/quotes`, `/api/reports/dashboard`, `/api/reports/pipeline`, `/api/reports/lead-sources`, `/api/reports/activities-summary`, `/api/reports/revenue-forecast`, `/api/ai/chat`, `/api/ai/summary`

### `artifacts/crmai` (`@workspace/crmai`)

React-Vite CRM frontend application. Uses shadcn/ui components, TailwindCSS (default light theme, toggleable dark mode), Recharts for analytics, @hello-pangea/dnd for Kanban drag-and-drop.

- `src/pages/` — one file per CRM module
- `src/components/layout.tsx` — sidebar navigation layout
- `src/components/ui/` — shadcn/ui components
- `src/lib/utils.ts` — `cn()` utility

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/schema/index.ts` — all 9 CRM table definitions

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `scripts` (`@workspace/scripts`)

Utility scripts package. Run with `pnpm --filter @workspace/scripts run <script>`.

Available scripts:
- `seed-crm` — Seeds the database with realistic CRM data

## Support Inbox (support@arbormind.in)

The support inbox is powered by a **webhook model** — no Gmail OAuth needed.

- **Endpoint**: `POST /api/emails` — accepts `{ fromEmail, fromName, subject, message }`
- **How to connect**: Configure your domain's email routing (Cloudflare Email Routing, Google Workspace routing, SendGrid Inbound Parse, etc.) to forward emails from `support@arbormind.in` to this endpoint via HTTP POST.
- **UI**: Accessible at `/support` (admin-only). Shows all tickets with from address, subject, datetime, and status.
- **Auto-actions**: Known customers (matched by email in contacts table) → creates an Opportunity. New contacts → creates a Lead.
- **Statuses**: `new` / `replied` / `assigned` / `pending` — can be updated via `PATCH /api/emails/:id`

> Note: Gmail OAuth integration (`connector:ccfg_google-mail_B959E7249792448ABBA58D46AF`) was dismissed by the user. The inbox works without it — email routing to the webhook is the intended mechanism. If direct Gmail reading is needed in the future, use that connector ID to re-propose.
