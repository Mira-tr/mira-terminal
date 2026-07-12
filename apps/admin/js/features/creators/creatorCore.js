import {
    getCreators
} from "./creatorStore.js";

import {
    DEFAULT_CREATOR_ROLE_ID,
    getCreatorRoleLabel,
    normalizeCreatorRoleId
} from "../../../../web/js/creatorRoles.js";

export {
    DEFAULT_CREATOR_ROLE_ID,
    getCreatorRoleLabel,
    normalizeCreatorRoleId
};

export function getCreatorCollection(){
    return getCreators();
}

export function getPrimaryCreatorId(collection = getCreatorCollection()){
    return String(collection.primaryCreatorId || "").trim();
}

export function normalizeCreatorId(value){
    return String(value || "").trim();
}

export function normalizeCreatorIds(value){
    return [
        ...new Set(
            toCreatorIdList(value)
        )
    ];
}

export function normalizeProjectTeam(value){
    const source = Array.isArray(value)
        ? value
        : parseProjectTeamText(value);
    const team = [];

    source
        .filter(member => member && typeof member === "object")
        .forEach((member, index) => {
            const creatorId = normalizeCreatorId(member.creatorId);

            if(!creatorId){
                return;
            }

            team.push({
                creatorId,
                roleId: normalizeCreatorRoleId(member.roleId),
                primary: Boolean(member.primary) || index === 0 && !team.some(item => item.primary)
            });
        });

    if(team.length > 0 && !team.some(member => member.primary)){
        team[0].primary = true;
    }

    return team;
}

export function parseProjectTeamText(value){
    return String(value || "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map((line, index) => {
            const parts = line.split("|").map(part => part.trim());

            return {
                creatorId: parts[0] || "",
                roleId: parts[1] || DEFAULT_CREATOR_ROLE_ID,
                primary: parts[2] === "primary" || index === 0
            };
        });
}

export function stringifyProjectTeam(team){
    return normalizeProjectTeam(team)
        .map(member => [
            member.creatorId,
            member.roleId,
            member.primary ? "primary" : ""
        ].filter((value, index) => index < 2 || value).join(" | "))
        .join("\n");
}

export function resolveCreatorId(value, collection = getCreatorCollection()){
    return normalizeCreatorId(value) || getPrimaryCreatorId(collection);
}

export function resolveCreatorIds(value, collection = getCreatorCollection()){
    const ids = normalizeCreatorIds(value);

    return ids.length > 0
        ? ids
        : [getPrimaryCreatorId(collection)].filter(Boolean);
}

export function resolveProjectTeam(value, collection = getCreatorCollection()){
    const team = normalizeProjectTeam(value);
    const primaryCreatorId = getPrimaryCreatorId(collection);

    if(team.length > 0){
        return team;
    }

    return primaryCreatorId
        ? [
            {
                creatorId: primaryCreatorId,
                roleId: DEFAULT_CREATOR_ROLE_ID,
                primary: true
            }
        ]
        : [];
}

export function validateCreatorId(creatorId, collection, label){
    const id = normalizeCreatorId(creatorId);
    const creator = collection.creators.find(item => item.id === id);

    if(!id || !creator){
        throw new Error(`${label}のCreatorが存在しません: ${id || "未設定"}`);
    }

    if(creator.status !== "public"){
        throw new Error(`${label}のCreatorがpublicではありません: ${id}`);
    }
}

export function validateCreatorIds(creatorIds, collection, label){
    const ids = toCreatorIdList(creatorIds);

    if(ids.length !== new Set(ids).size){
        throw new Error(`${label}のCreatorが重複しています`);
    }

    ids.forEach(id => validateCreatorId(id, collection, label));
}

export function validateProjectTeam(team, collection, label = "Project team"){
    const members = normalizeProjectTeam(team);
    const ids = members.map(member => member.creatorId);

    if(ids.length !== new Set(ids).size){
        throw new Error(`${label}のcontributorが重複しています`);
    }

    members.forEach(member => {
        validateCreatorId(member.creatorId, collection, label);
    });
}

function toCreatorIdList(value){
    const source = Array.isArray(value)
        ? value
        : String(value || "").split(/[\n,]/);

    return source
        .map(normalizeCreatorId)
        .filter(Boolean);
}
