import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

import {
    createDashboardViewModel,
    createScheduleBundleViewModel,
    datetimeLocalToIso,
    formatDateLockup,
    formatTimeRange,
    summarizeSlotResponses
} from "../apps/web/creators/chikage/trpg/v2/js/sessionViewModel.js";
import {
    SupabaseScheduleRepository
} from "../apps/web/creators/chikage/trpg/scheduler/js/supabaseRepository.js";

const ROOT = new URL("../", import.meta.url);
const MIGRATION_PATH = "supabase/migrations/20260822170000_trpg_v2_vertical_slice.sql";

test("TRPG v2 migration extends Schedule DB v1 instead of creating duplicate session tables", async () => {
    const sql = await read(MIGRATION_PATH);

    assert.match(sql, /alter table public\.schedules[\s\S]+add column if not exists created_by uuid/);
    assert.match(sql, /update public\.schedules[\s\S]+set created_by = owner_id/);
    assert.match(sql, /alter column created_by set not null/);
    assert.match(sql, /alter table public\.profiles[\s\S]+discord_user_id text/);
    assert.doesNotMatch(sql, /create table public\.sessions/i);
    assert.doesNotMatch(sql, /create table public\.session_members/i);
});

test("TRPG v2 migration exposes authenticated RPCs for create, candidate, profile, and KP transfer", async () => {
    const sql = await read(MIGRATION_PATH);

    [
        "trpg_v2_upsert_profile_from_auth",
        "trpg_v2_create_session",
        "trpg_v2_add_candidate",
        "trpg_v2_transfer_kp"
    ].forEach(name => {
        assert.match(sql, new RegExp(`create or replace function public\\.${name}`));
        assert.match(sql, new RegExp(`grant execute on function public\\.${name}`));
        assert.doesNotMatch(sql, new RegExp(`grant execute on function public\\.${name}[^;]+ to anon`, "i"));
    });

    assert.match(sql, /where schedule\.id = p_schedule_id[\s\S]+and schedule\.owner_id = auth\.uid\(\)/);
    assert.match(sql, /p_new_owner_user_id is null/);
    assert.match(sql, /role = 'owner'/);
    assert.match(sql, /role = 'participant'/);
});

test("TRPG v2 dashboard view model finds NEXT SESSION and ACTION REQUIRED from real schedule rows", () => {
    const view = createDashboardViewModel({
        schedules: [{
            id: "schedule-a",
            share_id: "share-a",
            title: "VOID",
            status: "collecting",
            owner_id: "user-a"
        }, {
            id: "schedule-b",
            share_id: "share-b",
            title: "庭師は何を口遊む",
            status: "confirmed",
            owner_id: "user-b"
        }],
        participants: [{
            id: "participant-a",
            schedule_id: "schedule-a",
            user_id: "user-a",
            role: "owner",
            sort_order: 0
        }, {
            id: "participant-b",
            schedule_id: "schedule-b",
            user_id: "user-a",
            role: "participant",
            sort_order: 1
        }],
        slots: [{
            id: "slot-a",
            schedule_id: "schedule-a",
            sort_order: 0,
            starts_at: "2026-08-24T12:00:00.000Z",
            start_minute: 1260,
            end_minute: 1500
        }, {
            id: "slot-b",
            schedule_id: "schedule-b",
            sort_order: 0,
            starts_at: "2026-08-25T12:00:00.000Z",
            start_minute: 1260,
            end_minute: 1500
        }],
        responses: [{
            schedule_id: "schedule-b",
            participant_id: "participant-b",
            slot_id: "slot-b",
            answer: "yes"
        }],
        confirmedSlots: [{
            schedule_id: "schedule-b",
            slot_id: "slot-b",
            status: "confirmed",
            sequence: 0,
            starts_at: "2026-08-25T12:00:00.000Z",
            start_minute: 1260,
            end_minute: 1500
        }]
    }, "user-a", new Date("2026-08-22T00:00:00.000Z"));

    assert.equal(view.nextSession.title, "庭師は何を口遊む");
    assert.equal(view.actionRequired.length, 1);
    assert.equal(view.actionRequired[0].title, "VOID");
    assert.equal(view.hosting.length, 1);
    assert.equal(view.playing.length, 1);
});

test("TRPG v2 schedule view model summarizes mobile candidate cards", () => {
    const detail = createScheduleBundleViewModel({
        schedule: {
            id: "schedule-a",
            shareId: "share-a",
            title: "拝啓、贖イ郵便局の皆様へ",
            status: "collecting",
            ownerId: "user-a"
        },
        me: {
            participantId: "participant-a",
            role: "owner"
        },
        slots: [{
            id: "slot-a",
            localDate: "2026-08-24",
            startMinute: 1260,
            endMinute: 1500,
            sortOrder: 0
        }],
        participants: [{
            id: "participant-a",
            displayName: "KP",
            role: "owner"
        }, {
            id: "participant-b",
            displayName: "PL",
            role: "participant"
        }],
        responses: [{
            participantId: "participant-a",
            slotId: "slot-a",
            answer: "yes"
        }, {
            participantId: "participant-b",
            slotId: "slot-a",
            answer: "maybe"
        }]
    }, "user-a");

    const summary = summarizeSlotResponses(detail.slots[0].id, detail.participants, detail.responses);

    assert.equal(detail.isOwner, true);
    assert.equal(detail.roleLabel, "KP");
    assert.equal(formatTimeRange(detail.slots[0]), "21:00 - 25:00");
    assert.deepEqual(summary, {
        yes: 1,
        maybe: 1,
        no: 0,
        answered: 2,
        unknown: 0
    });
});

test("TRPG v2 schedule view model includes Guest RPC self responses", () => {
    const detail = createScheduleBundleViewModel({
        schedule: {
            id: "schedule-a",
            shareId: "share-a",
            title: "VOID",
            status: "collecting"
        },
        me: {
            participantId: "guest-a",
            role: "guest",
            responses: [{
                slotId: "slot-a",
                answer: "maybe",
                note: "",
                ranges: []
            }]
        },
        slots: [{
            id: "slot-a",
            localDate: "2026-08-24",
            startMinute: 1260,
            endMinute: 1500,
            sortOrder: 0
        }],
        participants: [{
            id: "guest-a",
            displayName: "Guest",
            role: "guest"
        }]
    });

    const summary = summarizeSlotResponses(detail.slots[0].id, detail.participants, detail.responses);

    assert.equal(detail.ownParticipantId, "guest-a");
    assert.deepEqual(summary, {
        yes: 0,
        maybe: 1,
        no: 0,
        answered: 1,
        unknown: 0
    });
});

test("TRPG v2 date helpers are stable for Japan-time schedule labels", () => {
    assert.equal(formatTimeRange({
        start_minute: 1140,
        end_minute: 1500
    }), "19:00 - 25:00");

    const lockup = formatDateLockup({
        starts_at: "2026-08-24T12:00:00.000Z"
    });

    assert.equal(lockup.month, "AUG");
    assert.equal(lockup.day, "24");
    assert.equal(lockup.weekday, "MON");
    assert.match(datetimeLocalToIso("2026-08-24T21:00"), /^2026-08-24T/);
});

test("TRPG v2 repository keeps Discord OAuth and vertical-slice RPCs behind the repository boundary", async () => {
    const client = createFakeSupabaseClient();
    const repository = new SupabaseScheduleRepository(client);

    await repository.signInWithDiscord("https://relmua.com/creators/chikage/trpg/v2/");
    await repository.ensureTrpgV2Profile();
    await repository.createTrpgV2Session({
        title: "VOID",
        totalMinutes: 240,
        memo: ""
    });
    await repository.addTrpgV2Candidate({
        scheduleId: "schedule-a",
        startsAt: "2026-08-24T12:00:00.000Z",
        endsAt: "2026-08-24T16:00:00.000Z",
        label: "夜"
    });
    await repository.transferTrpgV2Kp("schedule-a", "user-b");

    assert.deepEqual(client.oauthCalls, [{
        provider: "discord",
        options: {
            redirectTo: "https://relmua.com/creators/chikage/trpg/v2/"
        }
    }]);
    assert.deepEqual(client.rpcCalls.map(call => call.name), [
        "trpg_v2_upsert_profile_from_auth",
        "trpg_v2_create_session",
        "trpg_v2_add_candidate",
        "trpg_v2_transfer_kp"
    ]);
});

test("TRPG v2 app preserves invite intent across Discord OAuth redirects", async () => {
    const app = await read("apps/web/creators/chikage/trpg/v2/js/app.js");

    assert.match(app, /AUTH_INTENT_KEY = "relmua_trpg_v2_auth_intent_v1"/);
    assert.match(app, /sessionStorage\.setItem\(AUTH_INTENT_KEY/);
    assert.match(app, /url\.searchParams\.set\("invite", appState\.route\.shareId\)/);
    assert.match(app, /history\.replaceState\(null, "", `\$\{location\.pathname\}#\/join\/\$\{shareId\}`\)/);
});

test("TRPG v2 app keeps action buttons from staying disabled after busy renders", async () => {
    const app = await read("apps/web/creators/chikage/trpg/v2/js/app.js");

    assert.match(app, /if\(appState\.busy\)/);
    assert.doesNotMatch(app, /disabled: appState\.busy/);
});

test("TRPG v2 staging verification SQL covers the real vertical-slice security flow", async () => {
    const sql = await read("supabase/tests/trpg_v2_vertical_slice_verification.sql");

    [
        "trpg_v2_create_session",
        "schedule_account_join",
        "schedule_guest_join",
        "schedule_account_upsert_response",
        "schedule_guest_upsert_response",
        "schedule_owner_confirm_slots",
        "trpg_v2_transfer_kp"
    ].forEach(name => assert.match(sql, new RegExp(name)));

    assert.match(sql, /created_by = '00000000-0000-0000-0000-000000000a11'/);
    assert.match(sql, /PL candidate creation unexpectedly succeeded/);
    assert.match(sql, /PL confirmation unexpectedly succeeded/);
    assert.match(sql, /guest participant impersonation unexpectedly succeeded/);
    assert.match(sql, /non-member read private schedule/);
    assert.match(sql, /KP count is not exactly one after transfer/);
    assert.match(sql, /former KP management unexpectedly succeeded/);
    assert.match(sql, /new KP allowed/);
    assert.match(sql, /rollback;/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function createFakeSupabaseClient(){
    const client = {
        oauthCalls: [],
        rpcCalls: [],
        auth: {
            signInWithOAuth(payload){
                client.oauthCalls.push(payload);
                return Promise.resolve({
                    data: {
                        url: "https://discord.com/oauth2/authorize"
                    },
                    error: null
                });
            }
        },
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
