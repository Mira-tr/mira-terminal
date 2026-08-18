import {
    formatSlot
} from "./schedulerMath.js";

const PAYLOAD_PREFIX = "g=";
const MAX_HASH_LENGTH = 4096;
const PAYLOAD_VERSION = 2;

/*
 * Static prototype note: the invite URL is the only way to hand a schedule
 * definition to another device before Supabase exists. Keep this payload small
 * and non-private: no answers, availability ranges, participant list, status,
 * confirmed slot, calendar data, memo, or other schedules.
 */
export function createPublicUrl(pathname, schedule){
    const scheduleId = typeof schedule === "string" ? schedule : schedule?.id ?? "";
    const payload = typeof schedule === "object" && schedule
        ? encodeSchedulePayload(schedule)
        : "";
    const hash = payload
        ? `${PAYLOAD_PREFIX}${payload}`
        : encodeURIComponent(scheduleId);

    return `${location.origin}${pathname}#${hash}`;
}

export function createInviteText(state, slots){
    return [
        `【日程調整】${state.schedule.title}`,
        `候補: ${slots.length}件`,
        "URLを開くと、名前と ○△× だけで回答できます。",
        `回答URL: ${createPublicUrl(location.pathname, state.schedule)}`
    ].join("\n");
}

export function createResultText(state, summaries){
    const lines = [
        `【集計】${state.schedule.title}`
    ];

    summaries.slice(0, 5).forEach((summary, index) => {
        lines.push(`${index + 1}. ${formatSlot(summary.slot)} ○${summary.counts.yes} △${summary.counts.maybe} ×${summary.counts.no}`);
    });

    return lines.join("\n");
}

export function encodeSchedulePayload(schedule){
    try{
        const payload = {
            v: PAYLOAD_VERSION,
            i: text(schedule.id, 80),
            t: text(schedule.title, 80) || "日程調整",
            s: text(schedule.startDate, 10),
            e: text(schedule.endDate, 10),
            sm: minute(schedule.startMinute, 19 * 60),
            em: minute(schedule.endMinute, 24 * 60)
        };

        return toBase64Url(JSON.stringify(payload));
    }catch{
        return "";
    }
}

export function readSharePayload(hash){
    const raw = String(hash ?? "").replace(/^#/, "");

    if(!raw || raw.length > MAX_HASH_LENGTH){
        return null;
    }

    if(raw.startsWith(PAYLOAD_PREFIX)){
        try{
            const json = fromBase64Url(raw.slice(PAYLOAD_PREFIX.length));
            const payload = normalizeSchedulePayload(JSON.parse(json));

            if(payload){
                return {
                    type: "payload",
                    scheduleId: payload.i,
                    data: payload
                };
            }
        }catch{
            return null;
        }

        return null;
    }

    try{
        return {
            type: "id",
            scheduleId: text(decodeURIComponent(raw), 80),
            data: null
        };
    }catch{
        return null;
    }
}

export function normalizeSchedulePayload(data){
    if(!data || typeof data !== "object" || ![1, 2].includes(Number(data.v))){
        return null;
    }

    const startDate = text(data.s, 10);
    const endDate = text(data.e, 10);
    const startMinute = minute(data.sm, -1);
    const endMinute = minute(data.em, -1);

    if(!text(data.i, 80) || !isDateKey(startDate) || !isDateKey(endDate)){
        return null;
    }

    if(compareDateKey(endDate, startDate) < 0 || startMinute < 0 || endMinute <= startMinute){
        return null;
    }

    return {
        v: PAYLOAD_VERSION,
        i: text(data.i, 80),
        t: text(data.t, 80) || "日程調整",
        s: startDate,
        e: endDate,
        sm: startMinute,
        em: endMinute
    };
}

function toBase64Url(value){
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function fromBase64Url(value){
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));

    return new TextDecoder().decode(bytes);
}

function text(value, maxLength){
    return String(value ?? "").trim().slice(0, maxLength);
}

function minute(value, fallback){
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= 0 && numberValue <= 30 * 60
        ? numberValue
        : fallback;
}

function isDateKey(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value)){
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function compareDateKey(left, right){
    return left.localeCompare(right);
}
