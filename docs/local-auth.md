# Local authentication (Phase 1)

Supabase Auth, SSR cookies, account-state routing, onboarding, and the five primary roles are retained. No backend or database migration is introduced.

## Manual environment setup

From PowerShell in `C:\Users\Jai\nextgen`:

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Only run the copy command if `.env.local` does not already exist. Populate these two variables yourself:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<actual project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<matching public anon or publishable key>
```

Copy the project URL and public key from your Supabase project's connection/API settings. Use the same project for both values. Never use a secret key or legacy service-role key. `.env.local` is ignored by Git; do not commit it or share its contents. `.env.example` contains empty placeholders only.

For an already-running local Supabase stack, use that stack's URL and public key instead. This phase does not start/reset a database or apply migrations. Hosted project settings and applied migrations must be verified separately.

Allow `http://localhost:3000/auth/callback` in the selected project's Auth redirect settings and use `http://localhost:3000` as the local site URL where appropriate. Include `http://127.0.0.1:3000/auth/callback` only if using that hostname; use one hostname consistently during authentication.

## Run

```powershell
Set-Location C:\Users\Jai\nextgen
npm run dev
```

Open `http://localhost:3000`. Stop and restart Next.js after changing environment variables. If port 3000 is busy, stop the conflicting application or explicitly configure the chosen port's callback URLs.

Configured values are validated before startup/build to prevent recognizable privileged keys from being embedded into browser assets. Both values absent is allowed so login/signup can display setup guidance. Runtime validation also protects direct client creation. Validation checks shape and public-key role, not signatures or project ownership; Supabase validates credentials. Never place privileged keys in any `NEXT_PUBLIC_` variable: if previously bundled, they must be rotated.

## Manual verification once configured

### Student signup

1. Use a signed-out browser and open `/signup`.
2. Enter a new email, name, a password of at least eight characters, matching confirmation, select Student, and accept the terms.
3. Submit. With confirmation enabled, expect `/verify-email`, follow the actual Supabase email link, and return through `/auth/callback`. With confirmation disabled, expect onboarding immediately.
4. Complete onboarding. Expect `/dashboard/overview` with the signed-in user's name and Student workspace.
5. Confirm the actual profile has `primary_role = student`. Do not fabricate a session or bypass email/account checks.

### Login and logout

1. Sign out from the dashboard menu. Expect `/login`.
2. Visit `/dashboard/overview` while signed out. Expect `/login?next=...`.
3. Log in with the real Student account. Expect the ready account to reach `/dashboard/overview`.
4. Try an incorrect password: expect the invalid-credentials message, not a network/config message.
5. Where real test accounts exist, check unverified, pending, suspended/disabled, and incomplete-onboarding states. Expect the existing verification, approval, unavailable, or onboarding route.
6. Log out, then sign in with an existing Founder (or another non-student) account. Expect its existing role workspace; Student restrictions must not replace it.
7. Verify a real recovery email and reset flow if a test mailbox is available.

## Automated checks

Use Node.js 22.18+ or Node.js 24 for native TypeScript stripping in tests:

```powershell
node --test tests/*.test.mjs
npm run lint
npm run typecheck
npm run build
```

The tests use synthetic public-key shapes and account snapshots, not valid credentials or successful fake logins. They verify error/configuration/routing policy. They do not establish that a live Supabase project is reachable or that signup, cookie refresh, email delivery, onboarding RPCs, or logout work against it.

## Error handling

UI messages distinguish `CONFIG_MISSING`, `CONFIG_INVALID`, `NETWORK_ERROR`, `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_PENDING`, `ACCOUNT_DISABLED`, and `UNKNOWN_AUTH_ERROR`. Expired links, rate limits, and weak passwords also have safe messages. Pending/disabled profile states continue to use their existing dedicated pages.

Callback errors carry only an allowlisted code. Provider exception text, database details, stack traces, and arbitrary query-string messages are not displayed. Unknown errors use a generic authentication failure instead of claiming a network failure.
