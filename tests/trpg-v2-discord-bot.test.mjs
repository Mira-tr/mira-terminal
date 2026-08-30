import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

import {
    DISCORD_MESSAGE_FLAG,
    NEXT_SESSION_COMMAND_NAME,
    createInteractionResponse,
    formatNextSessionMessage,
    getInteractionUserId,
    selectNearestFutureSession,
    verifyDiscordRequestSignature
} from "../supabase/functions/discord-next-session/botCore.js";

const ROOT = new URL("../", import.meta.url);

test("Discord bot verifies interaction signatures from timestamp and raw body", () => {
    const body = JSON.stringify({
        type: 1
    });
    const timestamp = "1787338800";
    const signature = "aa".repeat(64);
    const publicKey = "bb".repeat(32);
    const calls = [];
    const verified = verifyDiscordRequestSignature({
        body,
        timestamp,
        signature,
        publicKey,
        verifyDetached(message, signatureBytes, publicKeyBytes){
            calls.push({
                message: new TextDecoder().decode(message),
                signatureBytes,
                publicKeyBytes
            });
            return true;
        }
    });

    assert.equal(verified, true);
    assert.equal(calls[0].message, `${timestamp}${body}`);
    assert.equal(calls[0].signatureBytes.length, 64);
    assert.equal(calls[0].publicKeyBytes.length, 32);
});

test("Discord bot rejects invalid signature inputs", () => {
    const verifyDetached = () => true;

    assert.equal(verifyDiscordRequestSignature({
        body: "{}",
        timestamp: "1787338800",
        signature: "not-hex",
        publicKey: "bb".repeat(32),
        verifyDetached
    }), false);

    assert.equal(verifyDiscordRequestSignature({
        body: "{}",
        timestamp: "1787338800",
        signature: "aa".repeat(64),
        publicKey: "bb",
        verifyDetached
    }), false);
});

test("Discord bot responds to ping without querying data", async () => {
    const response = await createInteractionResponse({
        type: 1
    }, {
        findNextSessionForDiscordUser(){
            throw new Error("should not query");
        }
    });

    assert.deepEqual(response.body, {
        type: 1
    });
});

test("Discord bot uses only the interaction sender Discord ID", async () => {
    const seen = [];
    const response = await createInteractionResponse({
        type: 2,
        data: {
            name: NEXT_SESSION_COMMAND_NAME,
            options: [{
                name: "discord_user_id",
                value: "attacker-controlled"
            }]
        },
        member: {
            user: {
                id: "sender-123"
            }
        }
    }, {
        async findNextSessionForDiscordUser(discordUserId){
            seen.push(discordUserId);
            return null;
        }
    });

    assert.deepEqual(seen, ["sender-123"]);
    assert.equal(getInteractionUserId({
        user: {
            id: "dm-456"
        }
    }), "dm-456");
    assert.equal(response.body.data.flags, DISCORD_MESSAGE_FLAG.ephemeral);
});

test("Discord bot returns a natural no-session message for unknown or empty users", async () => {
    const response = await createInteractionResponse({
        type: 2,
        data: {
            name: NEXT_SESSION_COMMAND_NAME
        },
        member: {
            user: {
                id: "unknown"
            }
        }
    }, {
        async findNextSessionForDiscordUser(){
            return null;
        }
    });

    assert.match(response.body.data.content, /次の予定はありません/);
    assert.equal(response.body.data.flags, DISCORD_MESSAGE_FLAG.ephemeral);
});

test("Discord bot formats KP and PL next-session responses without share tokens", async () => {
    const kpMessage = formatNextSessionMessage({
        title: "VOID",
        role: "KP",
        startsAt: "2026-08-24T12:00:00.000Z",
        endsAt: "2026-08-24T16:00:00.000Z"
    });
    const plMessage = formatNextSessionMessage({
        title: "庭師は何を口遊む",
        role: "PL",
        startsAt: "2026-08-25T12:00:00.000Z",
        endsAt: "2026-08-25T16:00:00.000Z"
    });

    assert.match(kpMessage, /VOID/);
    assert.match(kpMessage, /KP/);
    assert.match(plMessage, /庭師は何を口遊む/);
    assert.match(plMessage, /PL/);
    assert.doesNotMatch(kpMessage, /share/i);
    assert.doesNotMatch(plMessage, /#\/join\//);
});

test("Discord bot chooses nearest future confirmed session and ignores past/held rows", () => {
    const nearest = selectNearestFutureSession([{
        title: "Past",
        role: "PL",
        status: "confirmed",
        startsAt: "2026-08-20T12:00:00.000Z",
        endsAt: "2026-08-20T16:00:00.000Z"
    }, {
        title: "Held",
        role: "PL",
        status: "held",
        startsAt: "2026-08-23T12:00:00.000Z",
        endsAt: "2026-08-23T16:00:00.000Z"
    }, {
        title: "Later",
        role: "KP",
        status: "confirmed",
        startsAt: "2026-08-25T12:00:00.000Z",
        endsAt: "2026-08-25T16:00:00.000Z"
    }, {
        title: "Nearest",
        role: "PL",
        status: "confirmed",
        startsAt: "2026-08-24T12:00:00.000Z",
        endsAt: "2026-08-24T16:00:00.000Z"
    }], new Date("2026-08-22T00:00:00.000Z"));

    assert.equal(nearest.title, "Nearest");
});

test("Discord bot edge function keeps secrets out of source and delegates account resolution to server-side RPCs", async () => {
    const source = await read("supabase/functions/discord-next-session/index.ts");

    assert.match(source, /DISCORD_PUBLIC_KEY/);
    assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(source, /trpg_v10_bot_upcoming_sessions/);
    assert.match(source, /trpg_v10_bot_schedule_context/);
    assert.match(source, /trpg_v10_bot_upsert_response/);
    assert.doesNotMatch(source, /sb_secret_|sb_publishable_|Bot\s+[A-Za-z0-9._-]+/);
});

test("Discord bot Edge Function disables platform JWT verification in Supabase config", async () => {
    const config = await read("supabase/config.toml");

    assert.match(config, /\[functions\.discord-next-session\]/);
    assert.match(config, /verify_jwt\s*=\s*false/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
