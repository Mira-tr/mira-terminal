import {
    formatSlot
} from "./schedulerMath.js";

const PAYLOAD_PREFIX = "g=";

/*
 * This is a static, backend-less prototype: a share URL is the only channel
 * that can carry a schedule to another person. So the invite link encodes the
 * schedule *definition* (title, candidate dates, base time, participant names)
 * into the hash. It never includes anyone's answers — a guest imports the
 * structure locally and answers on their own device.
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
            v: 1,
            i: schedule.id,
            t: schedule.title,
            s: schedule.startDate,
            e: schedule.endDate,
            sm: schedule.startMinute,
            em: schedule.endMinute,
            p: (schedule.participants ?? [])
                .filter(participant => participant.role === "owner" || participant.required)
                .map(participant => participant.displayName)
                .slice(0, 12)
        };

        return toBase64Url(JSON.stringify(payload));
    }catch{
        return "";
    }
}

export function readSharePayload(hash){
    const raw = String(hash ?? "").replace(/^#/, "");

    if(!raw){
        return null;
    }

    if(raw.startsWith(PAYLOAD_PREFIX)){
        try{
            const json = fromBase64Url(raw.slice(PAYLOAD_PREFIX.length));
            const data = JSON.parse(json);

            if(data && typeof data === "object" && typeof data.i === "string"){
                return {
                    type: "payload",
                    scheduleId: data.i,
                    data
                };
            }
        }catch{
            return null;
        }

        return null;
    }

    return {
        type: "id",
        scheduleId: decodeURIComponent(raw),
        data: null
    };
}

function toBase64Url(text){
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function fromBase64Url(text){
    const normalized = text.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));

    return new TextDecoder().decode(bytes);
}
