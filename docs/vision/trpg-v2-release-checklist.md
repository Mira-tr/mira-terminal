# TRPG v2 Release Checklist

Last updated: 2026-08-22

This checklist is the release gate for moving RELMUA TRPG v2 from the verified
staging vertical slice to production. Do not use production as a development
sandbox.

## Environment Separation

Staging:

```text
Project: relmua-staging
Ref: xojrvxifeeamydfkhjgp
```

Production:

```text
Project: relmua
Ref: wvtsddeegsiiqmgsbfgi
```

Rules:

- Verify on staging before touching production.
- Do not apply staging Discord secrets to production.
- Do not apply production migrations, Auth config, frontend config, or deploys
  during routine staging work.
- Do not commit service role keys, Discord client secrets, guest tokens,
  private OAuth material, or screenshots/logs containing those values.

## Staging E2E Cleanup

The staging vertical-slice E2E session is intentionally retained as a regression
fixture:

```text
Title: Codex E2E 卓 09:12:01
Share ID: redacted; check staging directly when regression work requires it
```

Rationale:

- It contains the only known staging fixture that has completed A/B Discord
  OAuth, Guest join, aggregate, confirm, NEXT SESSION, KP transfer, old KP
  denial, and new KP management.
- Auth User A/B and Discord profiles must not be deleted.
- Partial cleanup of participants, responses, candidates, or confirmed slots
  would reduce the value of the fixture and can create misleading regression
  data.
- Staging does not need to be empty; it needs to be understandable.

Cleanup rule for future runs:

- Delete only records that are clearly disposable duplicate E2E attempts.
- Keep at least one complete vertical-slice fixture until a named staging
  fixture strategy replaces it.
- Never delete unknown user data by inference.

## Release Gate

`READY FOR PRODUCTION` requires all of the following:

- Staging Vertical Slice COMPLETE.
- Production migration reviewed in order.
- Production Discord OAuth application prepared.
- Production Supabase Auth config prepared.
- Production frontend config prepared with publishable key only.
- Syntax checks pass.
- Node tests pass.
- Public readiness passes.
- Public build passes and reports `Admin included: no`.
- Secret exposure check complete.
- Rollback plan documented.
- Scenario Library unaffected.

## Database

Before production:

- Confirm production migration status against local migration history.
- Apply migrations in chronological order only.
- Review `supabase/migrations/20260818_schedule_db_v1.sql`.
- Review `supabase/migrations/20260818120000_schedule_db_v1_policy_fix.sql`.
- Review `supabase/migrations/20260818121000_schedule_db_v1_token_default_fix.sql`.
- Review `supabase/migrations/20260818122000_schedule_db_v1_policy_helper_grants.sql`.
- Review `supabase/migrations/20260818133000_schedule_account_participants.sql`.
- Review `supabase/migrations/20260822170000_trpg_v2_vertical_slice.sql`.
- Confirm a production backup or point-in-time recovery plan before applying.
- Do not run destructive rollback, table drop, project reset, or migration
  repair as part of rollout.

Schema/RPC checks:

- `profiles.avatar_url` exists.
- `profiles.discord_user_id` exists.
- `schedules.created_by` exists, is backfilled, and is not confused with
  `owner_id`.
- `trpg_v2_upsert_profile_from_auth()` exists.
- `trpg_v2_create_session(text, integer, text)` exists.
- `trpg_v2_add_candidate(uuid, timestamptz, timestamptz, text)` exists.
- `trpg_v2_transfer_kp(uuid, uuid)` exists.
- Grants expose v2 RPCs only to `authenticated`.
- Existing Guest RPC grants remain unchanged.
- RLS is enabled on schedule tables.
- Schedule participant access remains participant-scoped.
- Owner/KP management remains owner-scoped.
- Guest direct table access remains denied.
- Run Supabase Security Advisor after migration application.

## Auth

Production Discord setup:

- Discord Team: `RELMUA`.
- Discord Application for staging: `RELMUA Staging`.
- Discord Application for production: `RELMUA`.
- Production uses its own Client ID.
- Production uses its own Client Secret.
- Staging and production client secrets are never mixed.
- Client Secret is stored only in the Supabase Dashboard or approved secret
  manager.
- Client Secret is never committed to repository, public config, screenshots,
  logs, or docs.

Supabase Auth production config:

- Enable Discord Provider on production only after production Discord app is
  ready.
- Callback URL:

```text
https://wvtsddeegsiiqmgsbfgi.supabase.co/auth/v1/callback
```

- Site URL should point to the production public site.
- Redirect Allow List includes the production TRPG v2 route:

```text
https://relmua.com/creators/chikage/trpg/v2/
```

- If invite return needs wildcard handling, add the narrowest safe route pattern
  accepted by Supabase for:

```text
https://relmua.com/creators/chikage/trpg/v2/?invite=*
```

Auth E2E checks:

- Discord A login.
- Discord B login.
- OAuth invite return keeps the original invite context.
- Login persistence after reload.
- Profile sync creates/updates display name, avatar URL, and Discord user ID.

## Frontend Config

Before production build/deploy:

- Use production Supabase URL only:

```text
https://wvtsddeegsiiqmgsbfgi.supabase.co
```

- Use production publishable key only.
- `scheduleEnabled` is true only for intended production rollout.
- Build-time public config contains no service role key.
- Build-time public config contains no Discord Client Secret.
- Build-time public config contains no guest credential or private token.
- Verify generated `dist/config/supabase-public.json` before deploy.

## E2E

Run production smoke E2E after deploy:

- Discord A login.
- Discord B login.
- Guest join.
- Create session.
- Initial creator becomes KP.
- Invite URL generated.
- B joins from invite after OAuth callback.
- Guest joins from invite.
- KP creates candidate.
- A answers.
- B answers.
- Guest answers.
- Aggregate shows `○ / △ / × / 未`.
- KP confirms date.
- NEXT SESSION updates.
- KP Transfer A -> B succeeds.
- A becomes PL.
- B becomes KP.
- Owner participant count is exactly one.
- `schedules.created_by` remains A.
- Old KP management is denied.
- New KP management is allowed.
- Reload persistence holds roles and NEXT SESSION.

## Mobile

Check at approximately 390 px:

- No horizontal overflow.
- Header remains light enough for the TRPG first view.
- Bottom navigation does not obscure critical controls.
- Safe-area spacing is acceptable on iOS Safari.
- Tap targets for create, join, answer, confirm, and transfer are usable.
- Candidate answer UI remains one-candidate-readable, not table-first.

## Security

Verify in staging before production and again during production smoke:

- Non-member cannot read private schedule data.
- Guest cannot spoof another guest credential.
- Guest credential cannot directly select protected tables.
- PL cannot create candidates.
- PL cannot confirm dates.
- PL cannot transfer KP.
- Old KP is denied after transfer.
- New KP is allowed after transfer.
- Guest cannot become KP.
- Exactly one KP exists after transfer.
- `created_by` remains immutable and distinct from `owner_id`.
- No service role secret is exposed in public output.

## Regression

Before production rollout:

```text
node scripts/check-syntax.mjs
node --test tests/trpg-v2-vertical-slice.test.mjs
node scripts/check-public-readiness.mjs
node scripts/build-public.mjs
```

Required results:

- Syntax passes.
- Node tests pass.
- Public readiness passes.
- Public build passes.
- Public build reports `Admin included: no`.
- Scenario Library search, JavaScript, JSON, and display logic have no
  unintended diff.

## Rollout Order

1. Confirm staging vertical slice remains complete.
2. Review production migration order and backup/PITR status.
3. Apply production database migration.
4. Run production database verification SQL or equivalent targeted SQL checks.
5. Configure production Discord Application.
6. Configure production Supabase Discord Provider.
7. Build frontend with production public config.
8. Verify generated public config contains only production publishable values.
9. Deploy frontend.
10. Run production smoke test.
11. Run A/B/Guest production E2E.
12. Record production release status in `docs/current-status.md`.

## Rollback

Frontend rollback:

- Prefer rolling back the frontend deploy first when the issue is UI, routing,
  public config, or OAuth return handling.
- Keep the database intact when data written during E2E remains valid.

Auth rollback:

- Disable the production Discord Provider if login is misconfigured or causing
  unsafe redirects.
- Remove only the incorrect redirect allow-list entries.
- Do not delete Discord users or profiles to fix OAuth configuration.

Database rollback:

- Avoid destructive rollback after users have created sessions.
- Do not drop schedule tables, profiles, responses, or confirmed slots.
- Prefer forward fixes for RLS/RPC issues after identifying the exact failing
  policy/function.
- Use backup/PITR only for severe data integrity incidents and only after
  explicitly deciding what production data will be lost.

Do not:

- Run production reset.
- Run migration repair casually.
- Drop tables.
- Delete Auth users to undo session data.
- Copy staging secrets into production.
