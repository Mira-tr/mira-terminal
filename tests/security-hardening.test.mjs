import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    DISCORD_INTERACTION_MAX_AGE_SECONDS,
    DISCORD_INTERACTION_MAX_FUTURE_SKEW_SECONDS,
    isFreshDiscordTimestamp
} from "../supabase/functions/discord-next-session/requestSecurity.js";

const ROOT = new URL("../", import.meta.url);

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

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
