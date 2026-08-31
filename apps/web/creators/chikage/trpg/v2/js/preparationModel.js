export const PREPARATION_CATEGORIES = [
    ["character", "キャラクター"],
    ["character_sheet", "キャラシ"],
    ["handout", "ハンドアウト"],
    ["secret", "秘匿確認"],
    ["portrait", "立ち絵"],
    ["token", "コマ"],
    ["assets", "素材"],
    ["bgm", "BGM"],
    ["scenario", "シナリオ準備"],
    ["venue", "VC / 会場"],
    ["other", "その他"]
];

const categoryLabels = new Map(PREPARATION_CATEGORIES);

export function preparationCategoryLabel(value){
    return categoryLabels.get(String(value ?? "")) ?? "その他";
}

export function normalizePreparationItem(item = {}){
    return {
        ...item,
        id: text(item.id),
        schedule_id: text(item.schedule_id ?? item.scheduleId),
        title: text(item.title),
        category: categoryLabels.has(String(item.category)) ? String(item.category) : "other",
        status: item.status === "done" ? "done" : "pending",
        assignee_participant_id: text(item.assignee_participant_id ?? item.assigneeParticipantId),
        assignee_display_name: text(item.assignee_display_name ?? item.assigneeDisplayName),
        round_id: text(item.round_id ?? item.roundId),
        session_id: text(item.session_id ?? item.sessionId),
        session_sequence: Number(item.session_sequence ?? item.sessionSequence ?? 0),
        session_starts_at: item.session_starts_at ?? item.sessionStartsAt ?? "",
        note: text(item.note),
        sort_order: Math.max(0, Number(item.sort_order ?? item.sortOrder) || 0),
        can_complete: Boolean(item.can_complete ?? item.canComplete)
    };
}

export function sortPreparationItems(items){
    return array(items)
        .map(normalizePreparationItem)
        .filter(item => item.id && item.title)
        .sort((left, right) => {
            const status = Number(left.status === "done") - Number(right.status === "done");
            return status || left.sort_order - right.sort_order || left.title.localeCompare(right.title, "ja");
        });
}

export function summarizePreparation(items, participantId = ""){
    const normalized = sortPreparationItems(items);
    const pending = normalized.filter(item => item.status === "pending");
    const done = normalized.length - pending.length;
    const ownPending = pending.filter(item => item.assignee_participant_id && item.assignee_participant_id === String(participantId ?? ""));
    return {
        total: normalized.length,
        done,
        pending: pending.length,
        ownPendingCount: ownPending.length,
        pendingItems: pending,
        doneItems: normalized.filter(item => item.status === "done"),
        ownPending
    };
}

export function movePreparationItem(items, itemId, direction){
    const ordered = sortPreparationItems(items);
    const index = ordered.findIndex(item => item.id === String(itemId ?? ""));
    const target = index + Number(direction);
    if(index < 0 || target < 0 || target >= ordered.length){
        return ordered;
    }
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    return ordered.map((item, sortOrder) => ({ ...item, sort_order: sortOrder }));
}

function array(value){ return Array.isArray(value) ? value : []; }
function text(value){ return String(value ?? "").trim(); }
