# Memora AI training backend — prelaunch

Status: **Database scaffold created; no real-player ingestion enabled.**

## Database
Supabase project: `nwvbyyybhjnwbrdcdybk`.
Private PostgreSQL schema: `memora_training`.
- `consent_records`: hashed random participant token, adult age band, notice version, consent and withdrawal timestamps.
- `game_trials`: consent foreign key, game type, level, correct flag, response time, attempt number, difficulty version, played/received times.
- Both tables have RLS enabled. The schema and tables are not granted to `anon` or `authenticated`. No public insert/read policies exist.
- The schema is isolated from existing legacy Supabase tables; those tables were not changed.

## Release gates (all required before real-player uploads)
1. Finalize plain-language privacy notice, specific fields, lawful basis, storage region, retention duration, controller/contact, withdrawal and deletion workflow. Get qualified privacy/legal and youth-safeguarding review.
2. Launch adult-only contribution first; prevent under-18 uploads. Don't treat a self-selected age band as strong age verification.
3. Implement secure consent and ingestion endpoint with abuse prevention, schema validation, server-enforced consent status, minimum two locally completed introductory levels, event timestamps strictly after consent, no backfill, and minimal pseudonymous data. Client-supplied consent flags or timestamps alone cannot prove compliance.
4. Implement withdrawal and deletion (including related trial rows) with participant-held revocation credential, without exposing records to other players.
5. Add limits, retention/deletion automation, access auditing, monitoring, and secure administrator access.
6. Test using synthetic records, validate row-level access restrictions, test decline/withdraw/underage paths, and run security review.
7. Only then enable the browser uploader and explicitly update the UI and policy.

## Current behavior
The website stores gameplay locally; accepting the current UI agreement only records a local preference. No gameplay records are sent to Supabase. No AI model has been trained.

## Model plan
Start with a difficulty prediction baseline using aggregated consented adult trials; separate train/validation/test by pseudonymous participant (not by row), compare to existing game rules, and monitor performance and fairness before deployment.
