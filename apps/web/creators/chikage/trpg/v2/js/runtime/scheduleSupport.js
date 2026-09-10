import { formatDateLockup } from "../sessionViewModel.js";

export function roundStatusLabel(status){
    return ({ draft: "下書き", open: "調整中", confirmed: "確定済み", closed: "完了" })[status] ?? "Round";
}

export function sessionStatusLabel(status){
    return ({ scheduled: "予定", completed: "完了", cancelled: "中止", confirmed: "予定", held: "予定" })[status] ?? "予定";
}

export function candidateEditDraft(slot){
    const startMinute = Number(slot.start_minute ?? slot.startMinute ?? 0);
    const endMinute = Number(slot.end_minute ?? slot.endMinute ?? 0);
    return {
        slotId: slot.id,
        dateKey: String(slot.local_date ?? slot.localDate ?? ""),
        selection: {
            startTime: minuteTime(startMinute),
            endTime: minuteTime(endMinute % (24 * 60)),
            endsNextDay: endMinute >= 24 * 60,
            isOverridden: true
        }
    };
}

export function candidateResponseCount(detail, slotId){
    return detail.responses.filter(response => String(response.slot_id ?? response.slotId) === String(slotId)).length;
}

export function candidateStaleResponseCount(detail, slotId){
    return detail.responses.filter(response => String(response.slot_id ?? response.slotId) === String(slotId) && response.stale).length;
}

export function isActiveCandidate(slot){
    return String(slot?.status ?? "active") !== "retired";
}

export function minuteTime(value){
    const minute = Math.max(0, Number(value) || 0) % (24 * 60);
    return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export function compactParticipantName(participant){
    const name = String(participant?.display_name ?? participant?.displayName ?? "参加者");
    return name.length > 8 ? `${name.slice(0, 8)}…` : name;
}

export function formatCompactDate(slot){
    const lockup = formatDateLockup(slot);
    return `${lockup.month} ${lockup.day} ${lockup.weekday}`;
}
