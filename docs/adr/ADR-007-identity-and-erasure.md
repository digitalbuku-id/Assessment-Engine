# ADR-007: WordPress owns identity; erasure protocol for assessment data

- **Status:** Proposed (20 Nov 2026). To be raised to Accepted after the legal consultant round (2-year erasure-log retention figure, aggregates wording, backup honesty statement, whether the self-declared 18+ checkbox suffices).
- **Deciders:** William Sie Kapuk (HRDLOKAL IT dept), Loka. **Review pending:** Chief Architect (Hera).
- **Context:** Login happens in WordPress (hrdlokal.id plugin), results live in Supabase. The Assessment API (Node, Vercel serverless) is the only writer/reader of Supabase (ADR-006, Accepted). Participants are 18+ (confirmed rule); pilot scope is mahasiswa + karyawan only. UU PDP applies: results and identifiers are personal data (pseudonymous, not anonymous).

## Decision
1. **WordPress owns identity.** Each participant has a random UUID stored in WP `usermeta`, used as `external_user_id` in Supabase (not the numeric WP `user_id` — resilient to restores, migrations, re-imports; easier to map when digitalbuku.id joins as a second channel).
2. **Minimal PII in Supabase.** No email/name. Each result row stores: `channel`, `external_user_id`, raw answers, version-stamped result, and a consent copy (consent text version + timestamp + 18+ flag). No date of birth is collected.
3. **Erasure is API-first and idempotent.** Participant requests via WordPress → plugin writes a `pending` log entry BEFORE calling the API → API deletes first (server-to-server, separate delete key, API never trusts `external_user_id` from the client) → plugin deletes the WP account after API success (only when `request_type = account`). Log statuses track the last successful step (`pending` → `api_done` → `wp_done`); failures go to `attempts`/`last_error`/`next_retry_at`, resumed by an hourly retry job (backoff 1h → 4h, capped at 4h); the admin is alerted when an entry stays unfinished for more than X hours since `requested_at` (X confirmed by the consultant round; interim 72h).
4. **Restores must replay erasures.** After any Supabase restore, re-execute erasures with `api_done_at` newer than (backup timestamp − 1h) plus still-`pending` entries, before reopening. After any WordPress restore, re-delete accounts from the append-only mirror copy (UUID + date + status, kept outside the WP database, same 2-year retention, restricted access).
5. **Retention:** backup 90 days, erasure log 2 years counted from the request date, retention stored as configuration and enforced by a scheduled job. Rule: backup retention must not exceed log retention.
6. **Aggregates are computed live from `results`.** Deleted participants drop out automatically. The privacy policy must NOT promise aggregates that survive deletion. Display threshold: minimum 5 participants per group, applied to groups AND their complements.
7. **Deferred:** Supabase Auth and engine-owned accounts (SSO not needed for the pilot).
8. **Orphans and races:** a `delete_user` hook (guarded against self-triggering) triggers the same erasure flow for any account-deletion path; a weekly reconciliation job compares Supabase UUIDs with WP usermeta and erases orphans only after marking, a 14-day wait, and safety thresholds (abort on >5% or >50 orphans, on query failure, or on an unexpectedly small result; max 10 deletions per run). The plugin never stores results/answers in WordPress (no transients, object cache, or debug logs; results page excluded from page cache and CDN), and it rejects `run` while an erasure entry is unfinished for that UUID. Known limitation: a `run` in flight when a `data_only` erasure starts can write a new result afterward; reconciliation does not catch it because the account still exists.

## Consequences
- The WP plugin must implement: UUID generation, consent + 18+ gate before the first question, server-side API calls, the erasure log + retry/retention jobs + append-only mirror export, and admin notification on stuck erasures.
- The API must implement: idempotent erasure endpoints (`POST /api/erasures`, `POST /api/erasures/batch`), owner-checked result access (`POST /api/results/get`, `POST /api/results/list` incl. raw answers), split API keys with rotation, and shared-storage rate limiting.
- The 2-year figure, aggregates wording, backup honesty statement, and 18+ checkbox sufficiency are NOT legal advice until the consultant round checks them.

## References
- `docs/project-25-assessment/00-README-Proyek-Assessment.md` (Architecture section)
- `docs/project-25-assessment/05-Skema-Tabel-dan-Kontrak-Endpoint.md` (schema + endpoint contract, rev3)
- `docs/project-25-assessment/TASK/CLAUDE/TUGAS-TAHAP-0-API.md` (Tahap 0 brief)
- ADR-006 (persistence via Node backend + Supabase)
