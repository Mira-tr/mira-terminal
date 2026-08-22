# TRPG v2 Discord Bot

Last updated: 2026-08-22

Current verdict:

```text
BLOCKED
```

The first bot slice is intentionally small. It adds a Discord Interactions
Endpoint for staging and the `/次の卓` command only. It does not add a
long-running Node bot, production Discord configuration, notification delivery,
or bot-owned session tables.

## Purpose

`/次の卓` answers the Discord user who ran the command with their nearest future
confirmed RELMUA TRPG v2 session.

The command is scoped to:

- logged-in RELMUA accounts with a synced Discord user ID,
- KP and PL participants,
- future `confirmed` slots only.

Guests are out of scope because they do not have a Discord identity mapping.

## Architecture

Preferred architecture:

```text
Discord Interaction
        |
        v
Supabase Edge Function: discord-next-session
        |
        v
profiles.discord_user_id
        |
        v
schedule_participants.user_id
        |
        v
schedule_confirmed_slots
```

Files:

```text
supabase/functions/discord-next-session/index.ts
supabase/functions/discord-next-session/botCore.js
tests/trpg-v2-discord-bot.test.mjs
```

The Edge Function is a public webhook endpoint, so Supabase JWT verification
must be disabled for this function at deployment time and Discord request
signature verification must run inside the handler.

Function JWT verification is tracked in repository config:

```text
supabase/config.toml

[functions.discord-next-session]
verify_jwt = false
```

Staging deployment:

```text
supabase functions deploy discord-next-session --project-ref xojrvxifeeamydfkhjgp --no-verify-jwt
```

Current staging state:

- `discord-next-session` deployed to `relmua-staging`
  (`xojrvxifeeamydfkhjgp`).
- Endpoint:

```text
https://xojrvxifeeamydfkhjgp.supabase.co/functions/v1/discord-next-session
```

- Function status: `ACTIVE`.
- Function `verify_jwt`: `false`.
- Discord Interactions Endpoint URL is configured on `RELMUA Staging`.
- Discord Ping/Pong verification passed during endpoint save.
- Function logs reviewed after deploy; only runtime boot/shutdown entries were
  visible, with no secret values or full interaction payload logs.

Do not deploy this function to production until the production rollout receives
an explicit GO.

## Identity Mapping

The command uses the Discord Interaction sender only:

```text
interaction.member.user.id
or
interaction.user.id
```

It must not accept arbitrary user IDs from command options. It must not match by
username or display name.

Lookup path:

```text
Discord User ID
-> profiles.discord_user_id
-> profiles.id
-> schedule_participants.user_id
-> schedule_confirmed_slots
```

## Security

Required controls:

- Verify `X-Signature-Ed25519` and `X-Signature-Timestamp` with
  `DISCORD_PUBLIC_KEY`.
- Return `401` for invalid Discord signatures.
- Use only the sender's Discord user ID.
- Do not expose `share_id` in Discord responses.
- Return responses as ephemeral Discord messages.
- Keep raw DB errors and stack traces out of responses.

The Edge Function uses `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS. For that
reason, every query is explicitly filtered:

- profile by exact `discord_user_id`,
- participants by exact `profile.id`,
- confirmed slots by participant schedule IDs,
- future slots by `starts_at >= now`,
- status by `confirmed`.

## /次の卓

Response when a session exists:

```text
次の卓は「VOID」です。
08.24 月 21:00 - 25:00 / KP
RELMUAのMy Sessionsで詳細を確認してください。
```

Response when no future confirmed session exists:

```text
現在、確定している次の卓はありません。
```

The message intentionally avoids invite URLs and capability tokens. Users should
open RELMUA My Sessions for the full detail view.

## Secrets

Staging secrets belong only to the staging project:

```text
Project: relmua-staging
Ref: xojrvxifeeamydfkhjgp
Discord Application: RELMUA Staging
```

Required Edge Function secrets:

```text
DISCORD_PUBLIC_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Optional for future work:

```text
DISCORD_BOT_TOKEN
```

Never commit or publish:

- Discord Bot Token,
- Discord Client Secret,
- Supabase service role key,
- private connection strings,
- guest credentials,
- share IDs from staging fixtures.

## Staging / Production Separation

Production remains untouched:

```text
Project: relmua
Ref: wvtsddeegsiiqmgsbfgi
Discord Application: RELMUA
```

Do not reuse staging Client Secret, Bot Token, Public Key, service role key, or
redirect settings in production. Production bot rollout is a separate release
step after TRPG v2 production migration and OAuth are complete.

## Future Confirmed DM

Future requirement:

```text
日程確定 -> 参加者へDiscord DM
```

Candidate approaches:

- RPC after `schedule_owner_confirm_slots` calls an Edge Function.
- Database webhook on `schedule_confirmed_slots`.
- Notification queue table plus Edge Function worker.

Recommended direction:

```text
confirmation RPC -> notification queue -> Edge Function delivery
```

Reasons:

- idempotency key can be stored per participant/session/confirmed slot,
- duplicate DM prevention is explicit,
- delivery failure and retry state can be recorded,
- quiet hours and user notification preferences can be layered later.

Not implemented in v0.

## Known Limitations

- `/次の卓` command registration is blocked until a `RELMUA Staging` Bot Token
  is provided through a secure non-repository channel. Do not reset the existing
  Bot Token unless explicitly approved at action time.
- Real Discord command E2E is not complete because command registration is
  blocked.
- The command returns no direct session link to avoid leaking `share_id`.
- Guests are not supported.
- The command only reads the nearest future `confirmed` slot, not held slots or
  unconfirmed candidates.
- No DM delivery, retry queue, quiet hours, or notification settings exist yet.
