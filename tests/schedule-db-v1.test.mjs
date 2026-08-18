import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

import {
    createParticipantInsertPayloads,
    createResponseUpsertPayloads,
    createScheduleInsertPayload,
    createSlotInsertPayloads,
    mapDbScheduleBundleToState
} from "../apps/web/creators/chikage/trpg/scheduler/js/scheduleDbMapper.js";
import {
    normalizeSupabasePublicConfig
} from "../apps/web/creators/chikage/trpg/scheduler/js/supabaseConfig.js";
import {
    createGuestTokenStore,
    createMigrationMapStore,
    SupabaseScheduleRepository
} from "../apps/web/creators/chikage/trpg/scheduler/js/supabaseRepository.js";
import {
    createPublicUrl,
    readSharePayload
} from "../apps/web/creators/chikage/trpg/scheduler/js/share.js";

const ROOT = new URL("../", import.meta.url);
const MIGRATION_PATH = "supabase/migrations/20260818_schedule_db_v1.sql";

test("Schedule DB v1 migration creates the approved tables and stable slot constraints", async () => {
    const sql = await read(MIGRATION_PATH);

    [
        "public.schedules",
        "public.schedule_slots",
        "public.schedule_participants",
        "public.schedule_guest_credentials",
        "public.schedule_responses",
        "public.schedule_response_ranges",
        "public.schedule_confirmed_slots"
    ].forEach(table => assert.match(sql, new RegExp(`create table ${escapeRegExp(table)}`)));

    assert.match(sql, /constraint schedules_status_check check \(status in \('draft', 'collecting', 'ready', 'held', 'confirmed', 'archived', 'expired'\)\)/);
    assert.match(sql, /constraint schedule_slots_minute_check check/);
    assert.match(sql, /unique \(schedule_id, local_date, start_minute, end_minute\)/);
    assert.match(sql, /foreign key \(schedule_id, participant_id\)[\s\S]+references public\.schedule_participants\(schedule_id, id\)/);
    assert.match(sql, /foreign key \(schedule_id, slot_id\)[\s\S]+references public\.schedule_slots\(schedule_id, id\)/);
    assert.doesNotMatch(sql, /starts_on|ends_on|default_start_minute|default_end_minute/);
});

test("Schedule DB v1 migration enables RLS, denies anon table grants, and exposes guests only through RPC", async () => {
    const sql = await read(MIGRATION_PATH);
    const tables = [
        "schedules",
        "schedule_slots",
        "schedule_participants",
        "schedule_guest_credentials",
        "schedule_responses",
        "schedule_response_ranges",
        "schedule_confirmed_slots"
    ];

    tables.forEach(table => {
        assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
        assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`));
        assert.doesNotMatch(sql, new RegExp(`grant (select|insert|update|delete|all)[^;]+public\\.${table} to anon`, "i"));
    });

    assert.match(sql, /revoke all on function public\.schedule_assert_guest\(text, uuid, text\) from public, anon, authenticated/);
    assert.match(sql, /grant execute on function public\.schedule_public_view\(text\) to anon, authenticated/);
    assert.match(sql, /grant execute on function public\.schedule_guest_join\(text, text\) to anon, authenticated/);
    assert.match(sql, /grant execute on function public\.schedule_guest_upsert_response\(text, uuid, text, uuid, text, text, jsonb\) to anon, authenticated/);
    assert.doesNotMatch(sql, /grant .*schedule_guest_credentials.* to anon/i);
});

test("Schedule DB v1 RPCs hash guest tokens and reject IDOR-style access", async () => {
    const sql = await read(MIGRATION_PATH);

    assert.match(sql, /raw_guest_token = public\.schedule_generate_token\(32\)/);
    assert.match(sql, /token_hash[\s\S]+public\.schedule_hash_token\(raw_guest_token\)/);
    assert.match(sql, /create extension if not exists pgcrypto with schema extensions/);
    assert.match(sql, /extensions\.digest/);
    assert.match(sql, /credential\.participant_id = p_participant_id/);
    assert.match(sql, /credential\.token_hash = public\.schedule_hash_token\(p_guest_token\)/);
    assert.match(sql, /schedule\.share_id = p_share_id/);
    assert.match(sql, /schedule\.share_enabled = true/);
    assert.match(sql, /schedule\.expires_at > now\(\)/);
    assert.match(sql, /raise exception 'guest access denied'/);
});

test("Schedule DB v1 RPCs preserve guest privacy and validate ranges", async () => {
    const sql = await read(MIGRATION_PATH);
    const publicView = extractFunction(sql, "schedule_public_view");
    const guestView = extractFunction(sql, "schedule_guest_view");
    const upsert = extractFunction(sql, "schedule_guest_upsert_response");

    assert.doesNotMatch(publicView, /token_hash|owner_id|schedule_response_ranges/);
    assert.match(publicView, /'answered', exists/);
    assert.match(publicView, /'summaries'/);
    assert.match(guestView, /where range_item\.response_id = response\.id/);
    assert.match(guestView, /where participant\.id = p_participant_id/);
    assert.match(upsert, /jsonb_array_length\(coalesce\(p_ranges, '\[\]'::jsonb\)\) > 4/);
    assert.match(upsert, /range_start < target_slot\.start_minute or range_end > target_slot\.end_minute/);
    assert.match(upsert, /overlapping ranges/);
});

test("Schedule DB v1 expiration is rooted in last_activity_at and Cron deletes schedules", async () => {
    const sql = await read(MIGRATION_PATH);
    const cron = await read("supabase/sql/schedule_expiration_cron.sql");

    assert.match(sql, /last_activity_at timestamptz not null default now\(\)/);
    assert.match(sql, /new\.expires_at = new\.last_activity_at \+ interval '1 year'/);
    assert.match(sql, /create trigger schedule_responses_touch_schedule/);
    assert.match(sql, /create trigger schedule_confirmed_slots_touch_schedule/);
    assert.match(cron, /delete from public\.schedules/);
    assert.match(cron, /where expires_at < now\(\)/);
    assert.match(sql, /on delete cascade/);
});

test("Schedule DB mapper turns local v3 schedules into DB-ready stable rows", () => {
    const localSchedule = createLocalSchedule();
    const schedule = createScheduleInsertPayload(localSchedule, "owner-user-id");
    const slots = createSlotInsertPayloads(localSchedule, "db-schedule-id");
    const participants = createParticipantInsertPayloads(localSchedule, "db-schedule-id", "owner-user-id");

    assert.equal(schedule.owner_id, "owner-user-id");
    assert.equal(schedule.title, "DB v1 Test");
    assert.equal("starts_on" in schedule, false);
    assert.equal(slots.length, 2);
    assert.deepEqual(slots.map(slot => [slot.local_date, slot.start_minute, slot.end_minute]), [
        ["2026-08-24", 1140, 1440],
        ["2026-08-25", 1140, 1440]
    ]);
    assert.equal(slots[0].starts_at, "2026-08-24T10:00:00.000Z");
    assert.equal(participants[0].user_id, "owner-user-id");
    assert.equal(participants[1].user_id, null);
});

test("Schedule DB mapper omits unknown responses and keeps detailed ranges attached to own response payloads", () => {
    const localSchedule = createLocalSchedule();
    const participantMap = new Map([
        ["owner-local", "owner-db"],
        ["guest-local", "guest-db"]
    ]);
    const slotMap = new Map([
        ["slot-2026-08-24-1140-1440", "slot-db-a"],
        ["slot-2026-08-25-1140-1440", "slot-db-b"]
    ]);
    const responses = createResponseUpsertPayloads(localSchedule, participantMap, slotMap);

    assert.equal(responses.length, 2);
    assert.equal(responses[0].answer, "yes");
    assert.equal(responses[1].answer, "maybe");
    assert.deepEqual(responses[1].ranges, [{
        startMinute: 1200,
        endMinute: 1380,
        answer: null,
        sortOrder: 0
    }]);
});

test("Schedule DB bundle mapping supports owner result hydration without localStorage authority", () => {
    const state = mapDbScheduleBundleToState({
        schedule: {
            id: "schedule-db",
            share_id: "share-secret",
            title: "DB Schedule",
            timezone: "Asia/Tokyo",
            status: "collecting",
            total_minutes: 360,
            session_minutes: 180
        },
        slots: [{
            id: "slot-db",
            local_date: "2026-08-24",
            start_minute: 1140,
            end_minute: 1440,
            sort_order: 0
        }],
        participants: [{
            id: "participant-db",
            display_name: "Guest",
            role: "guest",
            required: false
        }],
        responses: [{
            participant_id: "participant-db",
            slot_id: "slot-db",
            answer: "yes",
            note: "ok",
            schedule_response_ranges: [{
                start_minute: 1200,
                end_minute: 1380,
                sort_order: 0
            }]
        }]
    });

    assert.equal(state.id, "schedule-db");
    assert.equal(state.shareId, "share-secret");
    assert.equal(state.responses["participant-db"]["slot-db"].answer, "yes");
    assert.equal(state.responses["participant-db"]["slot-db"].ranges[0].startMinute, 1200);
});

test("Schedule share helpers keep legacy payloads and add DB share routes", () => {
    const previousLocation = globalThis.location;
    globalThis.location = {
        origin: "https://relmua.com"
    };

    try{
        const url = createPublicUrl("/creators/chikage/trpg/scheduler/", {
            shareId: "share-id-with-at-least-32-characters"
        });
        const route = readSharePayload("#/s/share-id-with-at-least-32-characters");
        const editRoute = readSharePayload("#/s/share-id-with-at-least-32-characters/me/participant-id.guest-token");
        const legacy = readSharePayload("#schedule-local");

        assert.equal(url, "https://relmua.com/creators/chikage/trpg/scheduler/#/s/share-id-with-at-least-32-characters");
        assert.deepEqual(route, {
            type: "db",
            shareId: "share-id-with-at-least-32-characters",
            scheduleId: "",
            data: null
        });
        assert.deepEqual(editRoute, {
            type: "db",
            shareId: "share-id-with-at-least-32-characters",
            participantId: "participant-id",
            guestToken: "guest-token",
            scheduleId: "",
            data: null
        });
        assert.equal(legacy.type, "id");
    }finally{
        globalThis.location = previousLocation;
    }
});

test("Supabase public config never enables without a public https URL and publishable key", () => {
    assert.equal(normalizeSupabasePublicConfig(null).enabled, false);
    assert.equal(normalizeSupabasePublicConfig({
        enabled: true,
        supabaseUrl: "http://example.invalid",
        publishableKey: "x".repeat(40)
    }).enabled, false);
    assert.equal(normalizeSupabasePublicConfig({
        enabled: true,
        supabaseUrl: "https://project.supabase.co",
        publishableKey: "x".repeat(40),
        scheduleEnabled: true
    }).scheduleEnabled, true);
});

test("Supabase repository centralizes Schedule DB calls and stores guest credentials outside schedule state", async () => {
    const client = createFakeSupabaseClient();
    const repository = new SupabaseScheduleRepository(client);

    await repository.loadSharedSchedule("share-id");
    await repository.joinGuest("share-id", "Guest");
    await repository.upsertResponse({
        shareId: "share-id",
        participantId: "participant-id",
        guestToken: "guest-token",
        slotId: "slot-id",
        answer: "yes",
        ranges: []
    });

    assert.deepEqual(client.rpcCalls.map(call => call.name), [
        "schedule_public_view",
        "schedule_guest_join",
        "schedule_guest_upsert_response"
    ]);

    const storage = createMemoryStorage();
    const tokens = createGuestTokenStore(storage);
    tokens.remember("share-id", {
        participantId: "participant-id",
        guestToken: "secret"
    });
    assert.equal(JSON.parse(storage.getItem("relmua_schedule_guest_tokens_v1"))["share-id"].guestToken, "secret");

    const migrationMap = createMigrationMapStore(storage);
    migrationMap.remember("local-id", {
        id: "db-id",
        shareId: "share-id"
    });
    assert.equal(JSON.parse(storage.getItem("relmua_schedule_db_map_v1"))["local-id"].id, "db-id");
});

test("Public build script generates only public Supabase config keys", async () => {
    const build = await read("scripts/build-public.mjs");

    assert.match(build, /SUPABASE_URL/);
    assert.match(build, /SUPABASE_PUBLISHABLE_KEY/);
    assert.match(build, /\.env\.local/);
    assert.match(build, /supabase-public\.json/);
    assert.doesNotMatch(build, /SERVICE_ROLE|DATABASE_PASSWORD|SUPABASE_SECRET/i);
});

test("Scheduler app routes DB share links through the repository without renderAll", async () => {
    const app = await read("apps/web/creators/chikage/trpg/scheduler/js/app.js");

    assert.match(app, /openSharedDbSchedule/);
    assert.match(app, /persistDbGuestResponse/);
    assert.match(app, /sendOwnerLoginLink/);
    assert.match(app, /refreshActiveDbSchedule/);
    assert.match(app, /createRuntimeScheduleFromDbBundle/);
    assert.doesNotMatch(app, /renderAll/);
});

test("Schedule DB v1 docs record the approved privacy and migration decisions", async () => {
    const docs = await read("docs/spec/schedule/db-v1.md");

    assert.match(docs, /schedule_slots` as the single source of truth/);
    assert.match(docs, /last_activity_at/);
    assert.match(docs, /Guest users can read only their own ranges/);
    assert.match(docs, /Other participants' individual yes\/maybe\/no answers are not exposed to guests/);
    assert.match(docs, /relmua_schedule_db_map_v1/);
    assert.match(docs, /#\/s\/<share_id>/);
    assert.match(docs, /Rollback/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function createLocalSchedule(){
    return {
        id: "local-schedule",
        title: "DB v1 Test",
        description: "",
        timezone: "Asia/Tokyo",
        startDate: "2026-08-24",
        endDate: "2026-08-25",
        startMinute: 1140,
        endMinute: 1440,
        totalMinutes: 360,
        sessionMinutes: 180,
        status: "collecting",
        participants: [
            {
                id: "owner-local",
                userId: "local-user",
                displayName: "Owner",
                role: "owner",
                required: true
            },
            {
                id: "guest-local",
                userId: "",
                displayName: "Guest",
                role: "guest",
                required: false
            }
        ],
        responses: {
            "owner-local": {
                "slot-2026-08-24-1140-1440": {
                    answer: "yes",
                    note: "",
                    ranges: []
                },
                "slot-2026-08-25-1140-1440": {
                    answer: "unknown",
                    note: "",
                    ranges: []
                }
            },
            "guest-local": {
                "slot-2026-08-25-1140-1440": {
                    answer: "maybe",
                    note: "late",
                    ranges: [{
                        startMinute: 1200,
                        endMinute: 1380
                    }]
                }
            }
        }
    };
}

function extractFunction(sql, name){
    const start = sql.indexOf(`function public.${name}`);
    assert.notEqual(start, -1, `${name} exists`);
    const next = sql.indexOf("\ncreate or replace function public.", start + 1);
    return next === -1 ? sql.slice(start) : sql.slice(start, next);
}

function escapeRegExp(value){
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createFakeSupabaseClient(){
    const client = {
        rpcCalls: [],
        rpc(name, params){
            this.rpcCalls.push({
                name,
                params
            });
            return Promise.resolve({
                data: {},
                error: null
            });
        }
    };

    return client;
}

function createMemoryStorage(){
    const data = new Map();

    return {
        getItem(key){
            return data.has(key) ? data.get(key) : null;
        },
        setItem(key, value){
            data.set(key, String(value));
        }
    };
}
