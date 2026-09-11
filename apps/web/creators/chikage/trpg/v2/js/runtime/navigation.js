export function readRoute(){
    const match = location.hash.match(/^#\/join\/([A-Za-z0-9_-]{16,})$/);

    if(match){
        return {
            type: "join",
            shareId: match[1]
        };
    }

    const url = new URL(location.href);
    const scheduleId = url.searchParams.get("schedule");
    if(scheduleId && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(scheduleId)){
        return {
            type: "schedule",
            scheduleId,
            shareId: ""
        };
    }
    const invite = url.searchParams.get("invite");
    if(invite && /^[A-Za-z0-9_-]{16,}$/.test(invite)){
        return {
            type: "join",
            shareId: invite
        };
    }

    return {
        type: "home",
        shareId: ""
    };
}

export function createInviteUrl(shareId){
    return `${location.origin}${schedulerPathname(location.pathname)}#/join/${shareId}`;
}

export function schedulerPathname(pathname){
    const normalized = String(pathname ?? "");
    const marker = "/creators/chikage/trpg/";
    const markerIndex = normalized.indexOf(marker);

    if(markerIndex < 0){
        return normalized;
    }

    const prefix = normalized.slice(0, markerIndex);
    return `${prefix}${marker}scheduler/`;
}

export async function copyText(value){
    try{
        await navigator.clipboard.writeText(value);
    }catch{
        window.prompt("招待URL", value);
    }
}

export function todayInJapan(){
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date()).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
}