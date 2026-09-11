import {
    DEFAULT_PRIMARY_CREATOR_ID
} from "../../creators/creatorStore.js";

import {
    hydrateOwnerCmsSnapshot,
    persistOwnerCmsSnapshot
} from "../../cms/cmsOwnerSnapshotStore.js";

import {
    getRules,
    normalizeRules,
    setRules
} from "./rulesStore.js";

const RULES_CMS_COLLECTION = "trpg-house-rules";
const RULES_CMS_RECORD_KEY = "collection";
const RULES_CMS_SCHEMA_VERSION = 1;

export async function hydrateRulesFromCms(
    ownerCreatorId = DEFAULT_PRIMARY_CREATOR_ID
){
    const result = await hydrateOwnerCmsSnapshot(
        createRulesCmsContract(ownerCreatorId)
    );
    return result.value.rules;
}

export async function saveRulesCanonical(
    rules,
    ownerCreatorId = DEFAULT_PRIMARY_CREATOR_ID
){
    const result = await persistOwnerCmsSnapshot(
        createRulesCmsContract(ownerCreatorId),
        {
            schemaVersion: RULES_CMS_SCHEMA_VERSION,
            rules
        }
    );
    return result.value.rules;
}

export function normalizeRulesSnapshot(value){
    const source = value?.rules && typeof value.rules === "object"
        ? value.rules
        : value;

    return {
        schemaVersion: RULES_CMS_SCHEMA_VERSION,
        rules: normalizeRules(source)
    };
}

function createRulesCmsContract(ownerCreatorId){
    const ownerId = String(ownerCreatorId || DEFAULT_PRIMARY_CREATOR_ID).trim() || DEFAULT_PRIMARY_CREATOR_ID;

    return {
        collection: RULES_CMS_COLLECTION,
        recordKey: RULES_CMS_RECORD_KEY,
        ownerCreatorId: ownerId,
        status: "private",
        readLocal(){
            return {
                schemaVersion: RULES_CMS_SCHEMA_VERSION,
                rules: getRules()
            };
        },
        normalize: normalizeRulesSnapshot,
        validate: validateRulesSnapshot,
        writeCache(value){
            if(setRules(value.rules) === false){
                throw new Error("House Rulesのローカルcacheを更新できませんでした");
            }
        }
    };
}

function validateRulesSnapshot(value){
    if(!value ||
        value.schemaVersion !== RULES_CMS_SCHEMA_VERSION ||
        !value.rules ||
        !Array.isArray(value.rules.systems)){
        throw new Error("House RulesのCMSデータ形式が正しくありません");
    }
    return true;
}
