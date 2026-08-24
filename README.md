# luma

luma is a text-first social app with a text-only feed, image-only 24-hour Statuses, and one-to-one text chat.

## Stack

- Next.js 16 App Router
- Supabase Auth, Postgres, Storage, RLS, and Realtime
- Tailwind CSS and shadcn-style UI

## Local setup

1. Copy `.env.example` to `.env.local` and fill the Supabase values from the project environment.
2. Install dependencies with `pnpm install`.
3. Start the app with `pnpm dev`.
4. Run `pnpm exec tsc --noEmit` and `pnpm build` before deploying.

Email confirmation is enabled by default in Supabase. Sign up through the app with a real mailbox, then confirm the email before using protected social actions. The app uses the Vercel preview redirect proxy for auth callbacks. Supabase sessions are stored in secure browser cookies and automatically refreshed; redeploying does not sign users out when they continue using the same stable production/custom domain. Cookies are domain-specific, so changing domains or clearing browser cookies requires signing in again.

## Supabase requirements

The app expects the existing Luma schema, including profiles, posts, post_likes, comments, comment_likes, follows, notifications, conversations, messages, statuses, status_views, and the private notification preferences table. RLS must remain enabled. The `statuses` Storage bucket must be private, with policies scoped to authenticated users and user-owned paths.

The Status API accepts JPEG, PNG, and WebP images up to 5 MB, validates magic bytes, stores an optional caption up to 280 characters, and expires records after 24 hours. Expired Status cleanup runs best-effort during authenticated feed requests in bounded batches, while the expiry filter hides expired content immediately. The cleanup route remains available for optional manual maintenance and uses the service-role key only on the server. If `CRON_SECRET` is configured, manual requests must include `Authorization: Bearer <CRON_SECRET>`; it is optional when Vercel Cron is disabled.

## Deployment

Deploy with the Vercel Publish flow or connect the repository through GitHub. Configure all variables from `.env.example`, especially `SUPABASE_SERVICE_ROLE_KEY` as a server-only secret. `CRON_SECRET` is not required because Vercel Cron is not used. Never expose service-role credentials through `NEXT_PUBLIC_*` variables or client components.

## Product boundaries

Feed posts are text-only. Statuses are image-only with an optional caption and a 24-hour lifetime. Chat is one-to-one and text-only. Email delivery beyond the configured Supabase Auth provider is not implemented; there is no Resend integration in this project.

## Verification

Use `pnpm exec tsc --noEmit`, `pnpm build`, Supabase security/performance advisors, and browser smoke tests for auth redirects, feed loading, Status upload, chat, search, and settings. There is currently no configured lint script or automated test suite.
