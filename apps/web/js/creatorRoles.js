export const CREATOR_ROLE_LABELS = Object.freeze({
    lead: "主担当",
    planning: "企画",
    writing: "執筆",
    design: "設計",
    development: "実装",
    art: "アート",
    sound: "音響",
    support: "協力",
    maintenance: "保守",
    author: "執筆",
    owner: "所有者"
});

export const DEFAULT_CREATOR_ROLE_ID = "lead";

export function normalizeCreatorRoleId(value){
    const roleId = String(value || DEFAULT_CREATOR_ROLE_ID).trim();

    return Object.hasOwn(CREATOR_ROLE_LABELS, roleId)
        ? roleId
        : DEFAULT_CREATOR_ROLE_ID;
}

export function getCreatorRoleLabel(roleId){
    return CREATOR_ROLE_LABELS[normalizeCreatorRoleId(roleId)];
}
