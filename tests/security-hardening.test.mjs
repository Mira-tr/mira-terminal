import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

import {
    DISCORD_INTERACTION_MAX_AGE_SECONDS,
    DISCORD_INTERACTION_MAX_FUTURE_SKEW_SECONDS,
    isFreshDiscordTimestamp
} from "../supabase/functions/discord-next-session/requestSecurity.js";

const ROOT = new URL("../", import.meta.url);
const MIGRATIONS = new URL("../supabase/migrations/", import.meta.url);

test("Discord interaction timestamps accept only a narrow replay window", () => {
    const now = new Date("2026-09-08T12:00:00.000Z");
    const nowSeconds = Math.floor(now.getTime() / 1000);

    assert.equal(isFreshDiscordTimestamp(String(nowSeconds), now), true);
    assert.equal(isFreshDiscordTimestamp(String(nowSeconds - DISCORD_INTERACTION_MAX_AGE_SECONDS), now), true);
    assert.equal(isFreshDiscordTimestamp(String(nowSeconds - DISCORD_INTERACTION_MAX_AGE_SECONDS - 1), now), false);
    assert.equal(isFreshDiscordTimestamp(String(nowSeconds + DISCORD_INTERACTION_MAX_FUTURE_SKEW_SECONDS), now), true);
    assert.equal(isFreshDiscordTimestamp(String(nowSeconds + DISCORD_INTERACTION_MAX_FUTURE_SKEW_SECONDS + 1), now), false);
    assert.equal(isFreshDiscordTimestamp("not-a-timestamp", now), false);
});

test("Discord Edge Function applies timestamp freshness before accepting interactions", async () => {
    const source = await read("supabase/functions/discord-next-session/index.ts");

    assert.match(source, /isFreshDiscordTimestamp/);
    assert.match(source, /if\(!isFreshDiscordTimestamp\(timestamp\)\)/);
});

test("Browser Supabase SDK uses an exact pinned version", async () => {
    const source = await read("apps/web/creators/chikage/trpg/scheduler/js/supabaseConfig.js");

    assert.match(source, /@supabase\/supabase-js@2\.56\.0\/\+esm/);
    assert.doesNotMatch(source, /@supabase\/supabase-js@2\/\+esm/);
});

test("TRPG internal trigger helpers are removed from the public RPC surface", async () => {
    const names = (await readdir(MIGRATIONS)).filter(name => name.endsWith(".sql"));
    const migrations = await Promise.all(names.map(async name => ({
        name,
        source: (await readFile(new URL(name, MIGRATIONS), "utf8")).toLowerCase()
    })));

    const hardening = migrations.find(({ source }) =>
        source.includes("revoke execute on function public.rls_auto_enable() from public, anon, authenticated;")
        && source.includes("revoke execute on function public.trpg_v11_round_status_trigger() from public, anon, authenticated;")
        && source.includes("revoke execute on function public.trpg_v11_schedule_slot_trigger() from public, anon, authenticated;")
    );

    assert.ok(hardening, "a migration must revoke direct RPC access from internal event/trigger helpers");

    assert.doesNotMatch(hardening.source, /revoke execute on function public\.schedule_guest_join/);
    assert.doesNotMatch(hardening.source, /revoke execute on function public\.schedule_guest_view/);
    assert.doesNotMatch(hardening.source, /revoke execute on function public\.schedule_guest_upsert_response/);
    assert.doesNotMatch(hardening.source, /revoke execute on function public\.schedule_guest_update_name/);
    assert.doesNotMatch(hardening.source, /revoke execute on function public\.schedule_public_view/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
