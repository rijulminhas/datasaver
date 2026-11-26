# DataSaver

**Your Memories. Your Files. Always Yours.**

DataSaver is a personal cloud storage platform for securely storing, organising, downloading and deleting photos, videos, documents, audio, archives and other files.

## Tech stack

- Next.js 16 (App Router, Cache Components) · React 19 · TypeScript
- Tailwind CSS 4
- PostgreSQL on Neon · Drizzle ORM · Drizzle Kit migrations
- Zod validation · Argon2id password hashing · HTTP-only session cookies
- File contents in S3-compatible object storage (Backblaze B2 by default) via `@aws-sdk/client-s3`

## Getting started

```bash
npm install
npm run db:migrate   # after filling in .env (below)
npm run dev
```

Open http://localhost:3000 — `/` redirects to `/login`.

### Environment variables (`.env`, never committed)

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon Postgres connection string |
| `STORAGE_S3_ENDPOINT` | yes | e.g. `https://s3.us-east-005.backblazeb2.com` |
| `STORAGE_S3_REGION` | yes | e.g. `us-east-005` |
| `STORAGE_S3_BUCKET` | yes | private bucket name |
| `STORAGE_S3_ACCESS_KEY_ID` / `STORAGE_S3_SECRET_ACCESS_KEY` | yes | application key restricted to that bucket |
| `STORAGE_PROVIDER_NAME` | no | label stored per file (default `backblaze-b2`) |
| `STORAGE_QUOTA_BYTES` | no | per-user quota (default 1 GB) |
| `STORAGE_MAX_FILE_BYTES` | no | max single file (default 100 MB) |

The bucket must be **private** and needs a CORS rule allowing `PUT` (header `content-type`) from the app's origins — currently `http://localhost:3000` and `http://localhost:3100`. **Add the production domain before deploying.**

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration from `src/lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations in `drizzle/` |

## Project structure

```
src/
  proxy.ts                  Security headers, CSRF origin check, /dashboard cookie gate
  app/
    (auth)/login, signup    Auth pages
    dashboard/              Private app: overview, files, photos, videos, documents,
                            audio, folders, trash, settings, profile (shared sidebar layout)
    api/auth/               signup, login, logout, me
    api/files/              upload, complete, list, get, download, trash, restore, delete
  components/
    app/                    App shell: sidebar navigation, mobile drawer, header
    dashboard/              Stat cards, storage usage bar, recent files, empty states
    files/                  Upload dialog, file table, row actions (download/trash/restore/delete)
    auth/                   Auth forms, user menu, logout, password strength
    brand/                  Logo
    ui/                     Shared form fields, alerts, buttons, icons, modal, confirm dialog, toasts
  lib/
    auth/                   Argon2id hashing, DB-backed sessions, dal.ts (requireUser)
    files/                  service.ts (all file operations), file-signature detection,
                            filename sanitising, categories, storage overview
    storage/                Provider-independent StorageProvider interface, S3 adapter, limits
    api/http.ts             Shared API auth/error helpers
    format.ts               Byte/count/date formatting
    db/                     Drizzle client + schema
    validations/            Zod schemas
    rate-limit.ts           Auth endpoint rate limiting
```

## Authentication

- Sessions: a random 32-byte token is stored in the `auth_session` HTTP-only, SameSite=Lax cookie; only its SHA-256 hash is stored in the `sessions` table. Sessions last 7 days.
- `getCurrentUser()` (`src/lib/auth/session.ts`) validates the session against the database and is the single source of truth. `src/proxy.ts` only does a fast cookie-presence redirect.
- API: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

### Security notes

- Login and signup are limited to 5 requests per minute per IP. **The limiter is in-memory**, so it is per-instance; replace it with a shared store (e.g. Redis) before deploying to serverless or multiple instances.
- State-changing `/api/*` requests with a cross-site `Origin` header are rejected (403).
- CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` and (in production) HSTS are set on every response.

## File storage

File bytes live in object storage; PostgreSQL holds only metadata. Uploads go **directly from the browser to the bucket**, so large files never pass through the Next.js server:

1. `POST /api/files/upload` — checks size limit and quota, reserves the space, creates a `pending` row and returns a signed PUT URL (15 min). The exact byte size is part of the signature, so storage rejects a different-sized body.
2. Browser `PUT`s the file to storage with progress.
3. `POST /api/files/[id]/complete` — re-checks the stored size and quota, reads the first bytes to detect the **real** file type (client MIME types are never trusted), then marks the file `ready`. Invalid uploads are deleted.

Other rules:
- Storage keys are generated by the server (`users/<userId>/<fileId>.<ext>`); filenames are only display metadata.
- Every query is scoped to the signed-in user; another user's file returns 404.
- Downloads go through `GET /api/files/[id]/download`, which checks ownership and redirects to a signed URL valid for 60 s, always as an attachment. Nothing in the bucket is public.
- Abandoned uploads expire after 20 minutes and are cleaned up on the user's next upload.

### Viewing files in the app

Click a file name (or thumbnail) to open the viewer; ← / → switch files.

| Type | Viewer |
| --- | --- |
| Images (JPG, PNG, GIF, WEBP, AVIF, BMP, SVG) | Image view, thumbnails, Photos grid |
| Video (MP4, WEBM, MOV, MKV, OGG) | Video player with seeking |
| Audio (MP3, WAV, AAC, M4A, FLAC, OGG) | Audio player |
| PDF | Browser PDF viewer |
| Text, CSV/TSV, Markdown, JSON, code | Text view (CSV as a table), first 256 KB |
| Office files, archives, others | Details + Download (no third-party viewers, to keep files private) |

- `GET /api/files/[id]/preview` checks ownership on every request and redirects to a signed **inline** URL — only for the allow-listed image/video/audio/PDF types (`src/lib/files/preview.ts`); anything else gets 415.
- `GET /api/files/[id]/text` returns the start of text files as JSON (rendered as text, never HTML).
- Preview URLs are re-signed per 30-minute window, so the browser can cache images and long videos can still seek.
- SVGs are only displayed through `<img>`, where embedded scripts never run.

### Trash and deletion

- `DELETE /api/files/[id]` moves a file to **Trash**. It can be restored (`POST /api/files/[id]/restore`) for **30 days**, then it is permanently deleted.
- `DELETE /api/files/[id]?permanent=true` deletes a file forever immediately; `DELETE /api/files/trash` empties the Trash.
- Permanent deletion removes the object from storage first, then the database row.
- Files in Trash still count toward the quota.
- Expired Trash is purged when that user next uses the app (dashboard, Trash page, uploads). **Before production, add a scheduled job** so inactive users' expired files are purged too.

## Database

Tables: `users`, `sessions`, `files`, `folders` (public schema) and `drizzle.__drizzle_migrations` (Drizzle's migration journal). Every `files`/`folders` row belongs to a user and is deleted with that user. **Note:** deleting a user row does not yet delete their objects from storage — an account-deletion feature must do that.

## Roadmap

See `CLAUDE.md` for the full plan. Phases 1 (authentication UI), 2 (dashboard UI) and 3 (file storage, including Trash with 30-day recovery from Phase 5) are done. Next is Phase 4: search, sorting, folders, moving files and bulk actions.
