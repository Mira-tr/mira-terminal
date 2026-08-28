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
const COMPOSER_MIGRATION_PATH = "supabase/migrations/20260826152026_trpg_v2_scheduler_candidate_composer.sql";
const INTELLIGENCE_MIGRATION_PATH = "supabase/migrations/20260826180304_trpg_v2_scheduling_intelligence.sql";
const COMPACT_TABLE_MIGRATION_PATH = "supabase/migrations/20260827113652_trpg_v4_compact_schedule_table.sql";
const CANDIDATE_MANAGEMENT_MIGRATION_PATH = "supabase/migrations/20260828125029_trpg_v5_candidate_management.sql";

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

test("TRPG v2 Scheduler composer migration keeps participant identity separate from presentation", async () => {
    const sql = await read(COMPOSER_MIGRATION_PATH);

    [
        "trpg_v2_update_session_display_name",
        "trpg_v2_add_candidates",
        "trpg_v31_get_personal_availability",
        "trpg_v31_save_personal_availability"
    ].forEach(name => {
        assert.match(sql, new RegExp(`create or replace function public\\.${name}`));
        assert.match(sql, new RegExp(`revoke all on function public\\.${name}`));
        assert.match(sql, new RegExp(`grant execute on function public\\.${name}`));
        assert.doesNotMatch(sql, new RegExp(`grant execute on function public\\.${name}[^;]+ to anon`, "i"));
    });

    assert.match(sql, /participant\.user_id = auth\.uid\(\)/);
    assert.match(sql, /profile\.display_name = discord_identity\.technical_id/);
    assert.match(sql, /participant\.display_name = discord_identity\.technical_id/);
    assert.match(sql, /end_minute > 1800/);
    assert.match(sql, /jsonb_array_length\(p_candidates\) > 120/);
    assert.match(sql, /create table public\.trpg_personal_availability_weekly_days/);
    assert.match(sql, /create table public\.trpg_personal_availability_date_exceptions/);
    assert.match(sql, /create table public\.trpg_personal_availability_date_ranges/);
    assert.match(sql, /delete from public\.trpg_personal_availability_date_exceptions[\s\S]+where user_id = auth\.uid\(\)/);
    assert.match(sql, /delete from public\.trpg_personal_availability_weekly_days[\s\S]+where user_id = auth\.uid\(\)/);
    assert.doesNotMatch(sql, /drop table|drop column|truncate|delete from public\.schedule_slots/i);
});

test("TRPG V3.2 confirmation revalidates the latest required responses without exposing private availability", async () => {
    const sql = await read(INTELLIGENCE_MIGRATION_PATH);

    assert.match(sql, /create or replace function public\.trpg_v32_confirm_recommendation/);
    assert.match(sql, /schedule\.owner_id = auth\.uid\(\)/);
    assert.match(sql, /recommendation is stale/);
    assert.match(sql, /recommendation has unanswered required participants/);
    assert.match(sql, /recommendation has uncertain required participants/);
    assert.match(sql, /recommendation conflicts with another confirmed session/);
    assert.match(sql, /confirmed time must stay within the candidate/);
    assert.match(sql, /for update/);
    assert.match(sql, /revoke all on function public\.trpg_v32_confirm_recommendation/);
    assert.match(sql, /grant execute on function public\.trpg_v32_confirm_recommendation[^;]+ to authenticated/);
    assert.doesNotMatch(sql, /grant execute on function public\.trpg_v32_confirm_recommendation[^;]+ to anon/i);
    assert.doesNotMatch(sql, /drop table|drop column|truncate|delete from public\.schedule_slots/i);
});

test("TRPG V4 keeps account names and multi-day confirmation additive and owner-only", async () => {
    const sql = await read(COMPACT_TABLE_MIGRATION_PATH);

    assert.match(sql, /add column if not exists display_name_override text/);
    assert.match(sql, /trpg_v4_update_account_display_name/);
    assert.match(sql, /trpg_v4_confirm_recommendation_plan/);
    assert.match(sql, /schedule\.owner_id = auth\.uid\(\)/);
    assert.match(sql, /recommendation is stale/);
    assert.match(sql, /recommendation has uncertain required participants/);
    assert.match(sql, /revoke all on function public\.trpg_v4_confirm_recommendation_plan/);
    assert.match(sql, /grant execute on function public\.trpg_v4_confirm_recommendation_plan[^;]+ to authenticated/);
    assert.doesNotMatch(sql, /drop table|drop column|truncate|delete from public\.schedule_slots/i);
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
    assert.equal(formatTimeRange(detail.slots[0]), "21:00 - 翌01:00");
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

test("candidate revisions mark old answers stale and omit them from the active table summary", () => {
    const detail = createScheduleBundleViewModel({
        schedule: { id: "schedule-a", title: "VOID" },
        slots: [{
            id: "slot-a",
            localDate: "2026-09-01",
            startMinute: 1200,
            endMinute: 1440,
            revision: 2,
            status: "active"
        }, {
            id: "slot-history",
            localDate: "2026-08-30",
            startMinute: 1200,
            endMinute: 1440,
            revision: 1,
            status: "retired"
        }],
        participants: [{ id: "participant-a", displayName: "千景", role: "owner" }],
        responses: [{
            participantId: "participant-a",
            slotId: "slot-a",
            answer: "yes",
            candidateRevision: 1
        }]
    });

    assert.equal(detail.responses[0].stale, true);
    assert.deepEqual(summarizeSlotResponses("slot-a", detail.participants, detail.responses), {
        yes: 0,
        maybe: 0,
        no: 0,
        answered: 0,
        unknown: 1
    });
});

test("dashboard ignores retired candidates and answers for an older candidate revision", () => {
    const dashboard = createDashboardViewModel({
        schedules: [{ id: "schedule-a", title: "VOID", owner_id: "user-a" }],
        participants: [{ id: "participant-a", schedule_id: "schedule-a", user_id: "user-a" }],
        slots: [{ id: "active", schedule_id: "schedule-a", revision: 2, status: "active" }, {
            id: "retired",
            schedule_id: "schedule-a",
            revision: 1,
            status: "retired"
        }],
        responses: [{ participant_id: "participant-a", schedule_id: "schedule-a", slot_id: "active", candidate_revision: 1 }, {
            participant_id: "participant-a", schedule_id: "schedule-a", slot_id: "retired", candidate_revision: 1
        }],
        confirmedSlots: []
    }, "user-a");

    assert.equal(dashboard.sessions[0].slots.length, 1);
    assert.equal(dashboard.sessions[0].unansweredCount, 1);
    assert.equal(dashboard.actionRequired.length, 1);
});

test("TRPG v2 date helpers are stable for Japan-time schedule labels", () => {
    assert.equal(formatTimeRange({
        start_minute: 1140,
        end_minute: 1500
    }), "19:00 - 翌01:00");

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
    await repository.addTrpgV2Candidates({
        scheduleId: "schedule-a",
        candidates: [{
            startsAt: "2026-08-25T12:00:00.000Z",
            endsAt: "2026-08-25T16:00:00.000Z",
            label: "夜"
        }]
    });
    await repository.updateTrpgV5Candidate({
        scheduleId: "schedule-a",
        slotId: "slot-a",
        startsAt: "2026-08-25T12:00:00.000Z",
        endsAt: "2026-08-25T16:00:00.000Z"
    });
    await repository.updateTrpgV5CandidateTimes({
        scheduleId: "schedule-a",
        slotIds: ["slot-a", "slot-b"],
        startMinute: 1200,
        endMinute: 1440
    });
    await repository.retireTrpgV5Candidate({ scheduleId: "schedule-a", slotId: "slot-a" });
    await repository.restoreTrpgV5Candidate({ scheduleId: "schedule-a", slotId: "slot-a" });
    await repository.updateTrpgV2SessionDisplayName({
        scheduleId: "schedule-a",
        displayName: "KP 千景"
    });
    await repository.loadTrpgV31PersonalAvailability();
    await repository.saveTrpgV31PersonalAvailability({
        weekly: [],
        exceptions: []
    });
    await repository.transferTrpgV2Kp("schedule-a", "user-b");
    await repository.confirmTrpgV32Recommendation({
        scheduleId: "schedule-a",
        slotId: "slot-a",
        startMinute: 1260,
        endMinute: 1500,
        snapshotAt: "2026-08-26T00:00:00.000Z"
    });

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
        "trpg_v2_add_candidates",
        "trpg_v5_update_candidate",
        "trpg_v5_bulk_update_candidate_times",
        "trpg_v5_retire_candidate",
        "trpg_v5_restore_candidate",
        "trpg_v2_update_session_display_name",
        "trpg_v31_get_personal_availability",
        "trpg_v31_save_personal_availability",
        "trpg_v2_transfer_kp",
        "trpg_v32_confirm_recommendation"
    ]);
});

test("TRPG V5 candidate management is additive, owner-only, and response-aware", async () => {
    const sql = await read(CANDIDATE_MANAGEMENT_MIGRATION_PATH);
    const app = await read("apps/web/creators/chikage/trpg/v2/js/app.js");
    const repository = await read("apps/web/creators/chikage/trpg/scheduler/js/supabaseRepository.js");

    [
        "trpg_v5_update_candidate",
        "trpg_v5_bulk_update_candidate_times",
        "trpg_v5_retire_candidate",
        "trpg_v5_restore_candidate"
    ].forEach(name => {
        assert.match(sql, new RegExp(`create or replace function public\\.${name}`));
        assert.match(sql, new RegExp(`revoke all on function public\\.${name}`));
        assert.doesNotMatch(sql, new RegExp(`grant execute on function public\\.${name}[^;]+ to anon`, "i"));
    });

    assert.match(sql, /add column if not exists status text/);
    assert.match(sql, /add column if not exists revision integer/);
    assert.match(sql, /add column if not exists candidate_revision integer/);
    assert.match(sql, /target_schedule\.owner_id = auth\.uid\(\)/);
    assert.match(sql, /confirmed candidate cannot be edited/);
    assert.match(sql, /confirmed candidate cannot be retired/);
    assert.match(sql, /p_slot_ids uuid\[\]/);
    assert.match(sql, /duplicate candidate selection/);
    assert.match(sql, /selectedCount/);
    assert.match(sql, /status = 'retired'/);
    assert.match(sql, /response\.candidate_revision <> slot\.revision/);
    assert.match(sql, /slot\.status = 'active'/);
    assert.doesNotMatch(sql, /drop table|drop column|truncate|delete from public\.schedule_slots/i);

    assert.match(app, /function candidateManager/);
    assert.match(app, /function candidateBulkEditPanel/);
    assert.match(app, /saveCandidateBulkTimes/);
    assert.match(app, /この候補は更新されました/);
    assert.match(app, /再回答が必要/);
    assert.match(repository, /rpc\("trpg_v5_update_candidate"/);
    assert.match(repository, /rpc\("trpg_v5_bulk_update_candidate_times"/);
    assert.match(repository, /rpc\("trpg_v5_retire_candidate"/);
    assert.match(repository, /rpc\("trpg_v5_restore_candidate"/);
});

test("TRPG v2 app preserves invite intent across Discord OAuth redirects", async () => {
    const app = await read("apps/web/creators/chikage/trpg/v2/js/app.js");

    assert.match(app, /AUTH_INTENT_KEY = "relmua_trpg_v2_auth_intent_v1"/);
    assert.match(app, /sessionStorage\.setItem\(AUTH_INTENT_KEY/);
    assert.match(app, /url\.searchParams\.set\("invite", appState\.route\.shareId\)/);
    assert.match(app, /history\.replaceState\(null, "", `\$\{location\.pathname\}#\/join\/\$\{shareId\}`\)/);
});

test("TRPG v2 invite routes restore an existing account participant before rendering join", async () => {
    const app = await read("apps/web/creators/chikage/trpg/v2/js/app.js");

    assert.match(app, /if\(appState\.user\)\{\s+const accountView = await appState\.repository\.loadAccountView\(shareId\);/);
    assert.match(app, /if\(accountDetail\.ownParticipantId\)\{[\s\S]*?renderDetail\(\);[\s\S]*?return;/);
});

test("TRPG v2 app keeps action buttons from staying disabled after busy renders", async () => {
    const app = await read("apps/web/creators/chikage/trpg/v2/js/app.js");

    assert.match(app, /if\(appState\.busy\)/);
    assert.doesNotMatch(app, /disabled: appState\.busy/);
});

test("TRPG v2 calendar rerender imports its candidate batch limit", async () => {
    const app = await read("apps/web/creators/chikage/trpg/v2/js/app.js");

    assert.match(app, /inspectCandidateSelection,\s+MAX_CANDIDATES_PER_BATCH,\s+removeComposerWindow/);
    assert.match(app, /candidateWindows\.length < MAX_CANDIDATES_PER_BATCH/);
});

test("TRPG V3.2 keeps recommendation calculation in a pure module and confirmation behind the repository", async () => {
    const app = await read("apps/web/creators/chikage/trpg/v2/js/app.js");
    const repository = await read("apps/web/creators/chikage/trpg/scheduler/js/supabaseRepository.js");

    assert.match(app, /from "\.\/recommendationEngine\.js"/);
    assert.match(app, /recommendSchedule\(/);
    assert.match(app, /confirmTrpgV32Recommendation/);
    assert.match(app, /この日で確定/);
    assert.match(repository, /rpc\("trpg_v32_confirm_recommendation"/);
});

test("TRPG V4 renders a compact browse table and keeps edits behind explicit controls", async () => {
    const app = await read("apps/web/creators/chikage/trpg/v2/js/app.js");
    const repository = await read("apps/web/creators/chikage/trpg/scheduler/js/supabaseRepository.js");

    assert.match(app, /voteMode: false/);
    assert.match(app, /function compactScheduleTable/);
    assert.match(app, /投票する/);
    assert.match(app, /この日のひとことメモ/);
    assert.match(app, /recommendMultiDayPlan/);
    assert.match(app, /アカウント表示名を変更/);
    assert.match(repository, /rpc\("trpg_v4_confirm_recommendation_plan"/);
    assert.match(repository, /rpc\("trpg_v4_update_account_display_name"/);
});

test("Scheduler edit and vote modes survive local edits until an explicit close", async () => {
    const app = await read("apps/web/creators/chikage/trpg/v2/js/app.js");
    const answerStart = app.indexOf("async function answerSlot");
    const answerEnd = app.indexOf("async function confirmRecommendation", answerStart);
    const answerBody = app.slice(answerStart, answerEnd);

    assert.match(app, /candidateEditorOpen: false/);
    assert.match(app, /open: appState\.candidateEditorOpen/);
    assert.match(app, /appState\.candidateEditorOpen = event\.currentTarget\.open/);
    assert.match(app, /onToggle/);
    assert.match(app, /投票を終える/);
    assert.doesNotMatch(answerBody, /appState\.voteMode\s*=\s*false/);

    const candidateEditorStart = app.indexOf("function candidateWindowEditor");
    const candidateEditorEnd = app.indexOf("function timeEditorFields", candidateEditorStart);
    const candidateEditor = app.slice(candidateEditorStart, candidateEditorEnd);
    assert.match(candidateEditor, /updateComposerWindow\(appState\.candidateComposer, dateKey, index, fields\)/);
    assert.match(app, /updateComposerWindow\(appState\.candidateComposer, dateKey, index, fields\);\s*\}\),\s*actionButton\("削除"/);

    const partialEditorStart = app.indexOf("function partialResponseEditor");
    const partialEditorEnd = app.indexOf("function responseForm", partialEditorStart);
    const partialEditor = app.slice(partialEditorStart, partialEditorEnd);
    assert.match(partialEditor, /itemIndex === index \? nextRange : normalizeMinuteRange\(item\)/);
    assert.match(partialEditor, /itemIndex === index \? nextRange : normalizeMinuteRange\(item\)\)\s*\};\s*\},/);
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
