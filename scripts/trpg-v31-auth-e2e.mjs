import { randomBytes } from "node:crypto";

const config = readConfig();
const runId = `v31-${Date.now()}-${randomBytes(4).toString("hex")}`;
const created = {
    userIds: [],
    scheduleId: ""
};

try{
    const kp = await createTemporaryUser("Test KP");
    const pl = await createTemporaryUser("Test PL");

    await rpc(kp.accessToken, "trpg_v2_upsert_profile_from_auth");
    await rpc(pl.accessToken, "trpg_v2_upsert_profile_from_auth");

    const session = await rpc(kp.accessToken, "trpg_v2_create_session", {
        p_title: `TRPG V3.1 E2E ${runId}`,
        p_total_minutes: 240,
        p_memo: "Temporary automated verification"
    });
    const schedule = session?.schedule ?? {};
    const scheduleId = String(schedule.id ?? "");
    const shareId = String(schedule.shareId ?? schedule.share_id ?? "");

    assert(scheduleId && shareId, "Session creation did not return a schedule identity.");
    created.scheduleId = scheduleId;

    const ownerSchedule = await selectOne(kp.accessToken, "schedules", {
        select: "id,owner_id,created_by",
        id: `eq.${scheduleId}`
    });
    assert(ownerSchedule.owner_id === kp.userId, "Creator was not recorded as the KP.");
    assert(ownerSchedule.created_by === kp.userId, "Creator was not recorded as created_by.");

    await rpc(kp.accessToken, "trpg_v2_update_session_display_name", {
        p_schedule_id: scheduleId,
        p_display_name: "KP Test Name"
    });

    await rpc(pl.accessToken, "schedule_account_join", {
        p_share_id: shareId,
        p_display_name: "Ignored account default"
    });
    await rpc(pl.accessToken, "trpg_v2_update_session_display_name", {
        p_schedule_id: scheduleId,
        p_display_name: "PL Test Name"
    });

    const participants = await select(kp.accessToken, "schedule_participants", {
        select: "id,user_id,display_name,role,required",
        schedule_id: `eq.${scheduleId}`
    });
    assert(participants.filter(item => item.role === "owner").length === 1, "Schedule must have exactly one KP.");
    assert(participants.some(item => item.user_id === kp.userId && item.display_name === "KP Test Name"), "KP session display name did not persist.");
    assert(participants.some(item => item.user_id === pl.userId && item.display_name === "PL Test Name"), "PL session display name did not persist.");

    await rpc(kp.accessToken, "trpg_v31_save_personal_availability", {
        p_weekly: [{
            weekday: 6,
            state: "available",
            ranges: [{ startMinute: 780, endMinute: 1080 }, { startMinute: 1260, endMinute: 1620 }]
        }],
        p_exceptions: [{
            localDate: "2030-01-05",
            state: "available",
            ranges: [{ startMinute: 1260, endMinute: 1620 }]
        }]
    });
    const availability = await rpc(kp.accessToken, "trpg_v31_get_personal_availability");
    assert(availability?.weekly?.[0]?.ranges?.length === 2, "Multiple weekly availability windows did not persist.");
    assert(availability?.exceptions?.[0]?.localDate === "2030-01-05", "Specific-date exception did not persist.");

    const candidates = [{
        startsAt: "2030-01-05T11:00:00.000Z",
        endsAt: "2030-01-05T15:00:00.000Z",
        label: ""
    }, {
        startsAt: "2030-01-05T04:00:00.000Z",
        endsAt: "2030-01-05T09:00:00.000Z",
        label: ""
    }, {
        startsAt: "2030-01-12T12:00:00.000Z",
        endsAt: "2030-01-12T16:00:00.000Z",
        label: ""
    }];
    const batch = await rpc(kp.accessToken, "trpg_v2_add_candidates", {
        p_schedule_id: scheduleId,
        p_candidates: candidates
    });
    assert(batch?.candidateCount === 3, "Atomic candidate batch did not insert all candidate windows.");

    await expectRpcFailure(pl.accessToken, "trpg_v2_add_candidates", {
        p_schedule_id: scheduleId,
        p_candidates: [candidates[0]]
    }, "PL candidate creation must be denied.");

    const slots = await select(kp.accessToken, "schedule_slots", {
        select: "id,local_date,start_minute,end_minute,updated_at",
        schedule_id: `eq.${scheduleId}`,
        order: "sort_order.asc"
    });
    assert(slots.length === 3, "Candidate batch did not persist exactly three independent rows.");
    const overnight = slots.find(item => Number(item.end_minute) > 1440);
    assert(overnight, "Overnight candidate was not represented as a next-day end time.");

    const firstSlot = slots[0];
    await rpc(kp.accessToken, "schedule_account_upsert_response", {
        p_share_id: shareId,
        p_slot_id: firstSlot.id,
        p_answer: "yes",
        p_note: "",
        p_ranges: []
    });
    await rpc(pl.accessToken, "schedule_account_upsert_response", {
        p_share_id: shareId,
        p_slot_id: firstSlot.id,
        p_answer: "maybe",
        p_note: "",
        p_ranges: [{
            startMinute: Number(firstSlot.start_minute),
            endMinute: Number(firstSlot.start_minute) + 90
        }, {
            startMinute: Number(firstSlot.start_minute) + 120,
            endMinute: Number(firstSlot.end_minute)
        }]
    });
    await rpc(pl.accessToken, "schedule_account_upsert_response", {
        p_share_id: shareId,
        p_slot_id: firstSlot.id,
        p_answer: "yes",
        p_note: "",
        p_ranges: []
    });
    await rpc(pl.accessToken, "schedule_account_upsert_response", {
        p_share_id: shareId,
        p_slot_id: firstSlot.id,
        p_answer: "no",
        p_note: "",
        p_ranges: []
    });

    const response = await selectOne(kp.accessToken, "schedule_responses", {
        select: "id,answer,schedule_response_ranges(*)",
        slot_id: `eq.${firstSlot.id}`,
        participant_id: `eq.${participants.find(item => item.user_id === pl.userId)?.id ?? "00000000-0000-0000-0000-000000000000"}`
    });
    assert(response.answer === "no", "PL response transition did not persist.");
    assert(Array.isArray(response.schedule_response_ranges) && response.schedule_response_ranges.length === 0, "Partial ranges remained after changing away from △.");

    await rpc(pl.accessToken, "schedule_account_upsert_response", {
        p_share_id: shareId,
        p_slot_id: firstSlot.id,
        p_answer: "yes",
        p_note: "",
        p_ranges: []
    });

    await expectRpcFailure(pl.accessToken, "trpg_v32_confirm_recommendation", {
        p_schedule_id: scheduleId,
        p_slot_id: firstSlot.id,
        p_start_minute: Number(firstSlot.start_minute),
        p_end_minute: Number(firstSlot.end_minute),
        p_snapshot_at: "2099-01-01T00:00:00.000Z"
    }, "PL V3.2 confirmation must be denied.");
    await expectRpcFailure(kp.accessToken, "trpg_v32_confirm_recommendation", {
        p_schedule_id: scheduleId,
        p_slot_id: firstSlot.id,
        p_start_minute: Number(firstSlot.start_minute),
        p_end_minute: Number(firstSlot.end_minute),
        p_snapshot_at: "1970-01-01T00:00:00.000Z"
    }, "Stale V3.2 recommendation must be rejected.");

    await expectRpcFailure(pl.accessToken, "schedule_owner_confirm_slots", {
        p_schedule_id: scheduleId,
        p_items: [{ slotId: firstSlot.id, status: "confirmed" }]
    }, "PL confirmation must be denied.");
    await rpc(kp.accessToken, "trpg_v32_confirm_recommendation", {
        p_schedule_id: scheduleId,
        p_slot_id: firstSlot.id,
        p_start_minute: Number(firstSlot.start_minute),
        p_end_minute: Number(firstSlot.end_minute),
        p_snapshot_at: "2099-01-01T00:00:00.000Z"
    });

    const confirmed = await select(kp.accessToken, "schedule_confirmed_slots", {
        select: "id,slot_id,status",
        schedule_id: `eq.${scheduleId}`
    });
    assert(confirmed.some(item => item.slot_id === firstSlot.id && item.status === "confirmed"), "KP confirmation did not persist.");

    process.stdout.write("TRPG V3.1/V3.2 authenticated E2E: PASS\n");
}finally{
    await cleanup();
}

function readConfig(){
    const url = String(process.env.RELMUA_E2E_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
    const publishableKey = String(process.env.RELMUA_E2E_PUBLISHABLE_KEY ?? "").trim();
    const serviceRoleKey = String(process.env.RELMUA_E2E_SERVICE_ROLE_KEY ?? "").trim();
    const isProduction = /wvtsddeegsiiqmgsbfgi|relmua\.com/i.test(url);
    const missing = [
        ["RELMUA_E2E_SUPABASE_URL", url],
        ["RELMUA_E2E_PUBLISHABLE_KEY", publishableKey],
        ["RELMUA_E2E_SERVICE_ROLE_KEY", serviceRoleKey]
    ].filter(([, value]) => !value).map(([name]) => name);

    if(missing.length){
        throw new Error(`Missing server-only E2E configuration: ${missing.join(", ")}.`);
    }
    if(isProduction && process.env.RELMUA_E2E_ALLOW_PRODUCTION !== "1"){
        throw new Error("Production E2E is blocked. Set RELMUA_E2E_ALLOW_PRODUCTION=1 only for an approved isolated test run.");
    }

    return {
        url,
        publishableKey,
        serviceRoleKey
    };
}

async function createTemporaryUser(label){
    const email = `${label.toLowerCase().replace(/\s+/g, "-")}-${runId}@example.test`;
    const password = randomBytes(24).toString("base64url");
    const createdUser = await request("/auth/v1/admin/users", {
        method: "POST",
        service: true,
        body: {
            email,
            password,
            email_confirm: true,
            user_metadata: {
                global_name: label,
                full_name: label,
                username: `${label.replace(/\s+/g, "_").toLowerCase()}_${runId}`,
                provider_id: `discord-test-${runId}-${label.replace(/\s+/g, "-").toLowerCase()}`
            }
        }
    });
    const userId = String(createdUser?.id ?? "");
    assert(userId, "Temporary Auth user creation did not return an id.");
    created.userIds.push(userId);

    const session = await request("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: { email, password }
    });
    const accessToken = String(session?.access_token ?? "");
    assert(accessToken, "Temporary Auth sign-in did not return an access token.");
    return { userId, accessToken };
}

async function rpc(accessToken, name, body = {}){
    return request(`/rest/v1/rpc/${name}`, {
        method: "POST",
        accessToken,
        body
    });
}

async function expectRpcFailure(accessToken, name, body, message){
    try{
        await rpc(accessToken, name, body);
    }catch{
        return;
    }
    throw new Error(message);
}

async function select(accessToken, table, query){
    const params = new URLSearchParams(query);
    return request(`/rest/v1/${table}?${params.toString()}`, {
        accessToken
    });
}

async function selectOne(accessToken, table, query){
    const rows = await select(accessToken, table, query);
    assert(Array.isArray(rows) && rows.length === 1, `Expected one ${table} row.`);
    return rows[0];
}

async function request(path, { method = "GET", accessToken = "", service = false, body } = {}){
    const response = await fetch(`${config.url}${path}`, {
        method,
        headers: {
            apikey: service ? config.serviceRoleKey : config.publishableKey,
            Authorization: `Bearer ${service ? config.serviceRoleKey : accessToken || config.publishableKey}`,
            ...(body === undefined ? {} : { "Content-Type": "application/json" })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const payload = await response.json().catch(() => null);
    if(!response.ok){
        throw new Error(`Supabase request failed with HTTP ${response.status}.`);
    }
    return payload;
}

async function cleanup(){
    if(created.scheduleId){
        await request(`/rest/v1/schedules?id=eq.${encodeURIComponent(created.scheduleId)}`, {
            method: "DELETE",
            service: true
        }).catch(() => {});
    }

    for(const userId of created.userIds){
        await request(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
            method: "DELETE",
            service: true
        }).catch(() => {});
    }
}

function assert(condition, message){
    if(!condition){
        throw new Error(message);
    }
}
