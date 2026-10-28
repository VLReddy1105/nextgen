# GenZnect Student Workspace API

Run from `C:\Users\Jai\nextgen`. Supabase owns authentication; this API validates each bearer token with Supabase Auth, then checks the server-side profile's verification, onboarding, active state and role. Database access forwards that user's token with the existing public key, so PostgreSQL RLS remains effective. No service key, second password system, AI API or mock data is used.

## Start locally

With Python 3.12 available:

```powershell
python -m pip install --target backend/.deps -r backend/requirements.txt
python backend/run.py
```

Exact command using the Python runtime available on this computer:

```powershell
& 'C:\Users\Jai\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' backend/run.py
```

Dependencies are already installed in the ignored `backend/.deps` directory on this machine. A conventional activated virtual environment with the same requirements also works. The launcher binds `127.0.0.1:8000`. Health: `http://localhost:8000/health`; API reference: `http://localhost:8000/docs`.

In another terminal:

```powershell
npm run dev
```

Open `http://localhost:3000`. Do not alternate localhost and 127.0.0.1 during sign-in. Shared public `.env.development` defaults are loaded by `python backend/run.py`; no `.env.local` is required. The launcher defaults `NODE_ENV` to development without overriding an existing value. Direct ASGI/production startup defaults to production and requires explicit configuration. Set `NODE_ENV=development` if using uvicorn directly for local work.

Precedence (highest first): process environment, `.env.<mode>.local`, `.env.local` (except test), `.env.<mode>`, `.env`. Files use plain `NAME=value` or quoted values; shell interpolation/multiline values are not supported by this backend loader. Never put secrets in the tracked `.env.development`.

Runtime variables:

| Name | Use |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Existing Supabase project |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Existing public anon/publishable key; secret/service keys rejected |
| NEXT_PUBLIC_API_BASE_URL | Browser business API; defaults to http://localhost:8000 |
| FRONTEND_ORIGIN | Exact allowed browser origin; defaults to http://localhost:3000 |

Set an HTTPS API URL and matching frontend origin for a future deployment; a remote browser cannot use this computer's localhost API.

## Database installation

The maintainer confirmed all 24 local migration versions match hosted project `orhoolcpcbihfrbkpioz`. No migration deployment is required. Normal developers do not install/link Supabase, use Pooler credentials, or run migration commands. Runtime uses a public key and each authenticated user's token under existing RLS.

Read [the shared setup report](../docs/supabase-final-setup.md) for verified evidence and outstanding hosted metadata checks. `scripts/verify-supabase-readonly.sql` is maintainer-only metadata inspection, not a startup step. Do not reset, repair, or deploy migrations as part of developer onboarding.

## Structure and contracts

- `api/dependencies.py`: verified identity and role dependencies.
- `api/routes/`: Student profile, workspace, opportunities, applications, spaces, events, mentorship, notifications, settings/support.
- `schemas/`: strict request validation and bounded normalized tags.
- `services/`: shared Student Data Core and catalogs.
- `matching/`: deterministic, explained ranking.
- `repositories/`: user-scoped PostgREST; safe error mapping.
- `core/`: configuration, consistent errors, structured logging without tokens or payloads.
- SQL RPCs perform permission checks, writes, histories and shared notifications atomically.

Errors use `{ "error": { "code": "...", "message": "...", "details": null } }`. A missing migration produces a visible setup error, never an empty-success response.

Minimal cross-role integration is available through authenticated API calls: organization owners publish opportunities; permitted organizers publish events; employers list their visible applications and update statuses; space managers invite members/create tasks. Their existing frontend dashboards remain intact. Use the generated `/docs` request schemas with an authorized account's session token; never paste tokens into project files.

## Tests

```powershell
python backend/run.py --test
node --test tests/auth.test.mjs
```

Isolated SQL test tooling (installed locally under ignored `work/`):

```powershell
npm install --prefix work/sql-test @electric-sql/pglite
node tests/workspace-database.test.mjs
```

Component test tooling:

```powershell
npm install --prefix work/ui-test vite @playwright/test prettier
node work/ui-test/node_modules/vite/bin/vite.js --config tests/workspace-ui/vite.config.mjs
```

In another terminal, using installed Edge:

```powershell
$env:UI_BROWSER_CHANNEL='msedge'
node tests/workspace-ui/verify.mjs
```

The UI harness uses test-only fixtures and never authenticates to, reads from or writes to Supabase. Screenshots are in ignored `work/ui-review/`. Production source contains no demo records.

## Current scope limits

Workspace lists load up to 500 visible records per table; opportunity API filtering/pagination operates within that bounded set. Large-scale server pagination, full-text search, scheduled background delivery and WebSocket subscriptions are later work. UI refreshes after mutations, on focus and every 30 seconds while visible. Due reminders are generated idempotently on workspace refresh, not while everyone is offline. Email and push are not enabled.

Mentorship is discovery plus existing connections/session display; new booking, requests and ratings are intentionally unavailable. AI Tools is Launching Soon with a curated skill-domain preview only. Project files are HTTPS references, not file uploads; resumes are private PDF uploads. Old resume objects are retained in private storage when a replacement is uploaded. Avatar upload, external account imports, selectable themes and translations are not implemented. Support reports are persisted for the maintainer to review; no external support delivery or service-level promise is made.
