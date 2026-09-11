import {
    TAG_KEY,
    load,
    save
} from "../../../store.js";

import {
    DEFAULT_PRIMARY_CREATOR_ID
} from "../../creators/creatorStore.js";

import {
    hydrateOwnerCmsSnapshot,
    persistOwnerCmsSnapshot
} from "../../cms/cmsOwnerSnapshotStore.js";

import {
    getAuthors,
    setAuthors
} from "../authors.js";

import {
    getScenarios,
    normalizeScenarios,
    setScenarios
} from "./scenarioStore.js";

const SCENARIO_CMS_COLLECTION = "trpg-scenarios";
const SCENARIO_CMS_RECORD_KEY = "collection";
const SCENARIO_CMS_SCHEMA_VERSION = 1;

export async function hydrateScenariosFromCms(
    ownerCreatorId = DEFAULT_PRIMARY_CREATOR_ID
){
    const result = await hydrateOwnerCmsSnapshot(
        createScenarioCmsContract(ownerCreatorId)
    );
    return result.value.scenarios;
}

export async function setScenariosCanonical(
    scenarios,
    ownerCreatorId = DEFAULT_PRIMARY_CREATOR_ID
){
    const localMetadata = getLocalScenarioMetadata();
    return setScenarioBundleCanonical(
        {
            scenarios,
            tags: localMetadata.tags,
            authors: localMetadata.authors
        },
        ownerCreatorId
    ).then(value => value.scenarios);
}

export async function setScenarioBundleCanonical(
    value,
    ownerCreatorId = DEFAULT_PRIMARY_CREATOR_ID
){
    const result = await persistOwnerCmsSnapshot(
        createScenarioCmsContract(ownerCreatorId),
        value
    );
    return result.value;
}

export async function addScenarioCanonical(
    data,
    ownerCreatorId = DEFAULT_PRIMARY_CREATOR_ID
){
    const ownerId = normalizeOwnerId(ownerCreatorId);
    const current = getOwnerScenarios(ownerId);
    const created = normalizeScenarios([
        {
            ...data,
            ownerCreatorId: ownerId
        }
    ])[0];

    await setScenariosCanonical(
        [created, ...current],
        ownerId
    );
    return true;
}

export async function updateScenarioCanonical(
    data,
    ownerCreatorId = DEFAULT_PRIMARY_CREATOR_ID
){
    const ownerId = normalizeOwnerId(ownerCreatorId);
    const current = getOwnerScenarios(ownerId);
    const index = current.findIndex(scenario => scenario.id === data.id);
    if(index < 0){
        return false;
    }

    const next = current.slice();
    next[index] = normalizeScenarios([
        {
            ...current[index],
            ...data,
            id: current[index].id,
            ownerCreatorId: ownerId,
            createdAt: current[index].createdAt,
            updatedAt: Number(data.updatedAt) || Date.now()
        }
    ])[0];

    await setScenariosCanonical(next, ownerId);
    return true;
}

export async function deleteScenarioCanonical(
    id,
    ownerCreatorId = DEFAULT_PRIMARY_CREATOR_ID
){
    const ownerId = normalizeOwnerId(ownerCreatorId);
    const current = getOwnerScenarios(ownerId);
    const next = current.filter(scenario => scenario.id !== id);
    if(next.length === current.length){
        return false;
    }

    await setScenariosCanonical(next, ownerId);
    return true;
}

export function getOwnerScenarios(ownerCreatorId = DEFAULT_PRIMARY_CREATOR_ID){
    const ownerId = normalizeOwnerId(ownerCreatorId);
    return getScenarios().filter(scenario => belongsToOwner(scenario, ownerId));
}

export function normalizeScenarioSnapshot(
    value,
    ownerCreatorId = DEFAULT_PRIMARY_CREATOR_ID
){
    const ownerId = normalizeOwnerId(ownerCreatorId);
    const localMetadata = getLocalScenarioMetadata();
    const source = Array.isArray(value)
        ? value
        : Array.isArray(value?.scenarios)
            ? value.scenarios
            : [];

    return {
        schemaVersion: SCENARIO_CMS_SCHEMA_VERSION,
        scenarios: normalizeScenarios(
            source.map(scenario => ({
                ...scenario,
                ownerCreatorId: normalizeScenarioOwner(scenario, ownerId)
            }))
        ),
        tags: normalizeMetadataList(
            Array.isArray(value?.tags)
                ? value.tags
                : localMetadata.tags
        ),
        authors: normalizeMetadataList(
            Array.isArray(value?.authors)
                ? value.authors
                : localMetadata.authors
        )
    };
}

function createScenarioCmsContract(ownerCreatorId){
    const ownerId = normalizeOwnerId(ownerCreatorId);
    return {
        collection: SCENARIO_CMS_COLLECTION,
        recordKey: SCENARIO_CMS_RECORD_KEY,
        ownerCreatorId: ownerId,
        status: "private",
        readLocal(){
            const metadata = getLocalScenarioMetadata();
            return {
                schemaVersion: SCENARIO_CMS_SCHEMA_VERSION,
                scenarios: getOwnerScenarios(ownerId),
                tags: metadata.tags,
                authors: metadata.authors
            };
        },
        normalize(value){
            return normalizeScenarioSnapshot(value, ownerId);
        },
        validate(value){
            validateScenarioSnapshot(value, ownerId);
        },
        writeCache(value){
            writeOwnerScenarioCache(ownerId, value);
        }
    };
}

function validateScenarioSnapshot(value, ownerCreatorId){
    if(!value ||
        value.schemaVersion !== SCENARIO_CMS_SCHEMA_VERSION ||
        !Array.isArray(value.scenarios) ||
        !Array.isArray(value.tags) ||
        !Array.isArray(value.authors)){
        throw new Error("TRPGシナリオのCMSデータ形式が正しくありません");
    }

    const invalid = value.scenarios.find(
        scenario => scenario.ownerCreatorId !== ownerCreatorId
    );
    if(invalid){
        throw new Error("別Creatorのシナリオを同じCMS領域へ保存することはできません");
    }
    return true;
}

function writeOwnerScenarioCache(ownerCreatorId, value){
    const current = getScenarios();
    const otherOwners = current.filter(
        scenario => !belongsToOwner(scenario, ownerCreatorId)
    );
    const next = [
        ...normalizeScenarios(value.scenarios),
        ...otherOwners
    ];

    if(setScenarios(next) === false){
        throw new Error("TRPGシナリオのローカルcacheを更新できませんでした");
    }

    const storage = globalThis.localStorage;
    if(storage && save(
        TAG_KEY,
        normalizeMetadataList(value.tags),
        storage
    ) === false){
        throw new Error("TRPGタグのローカルcacheを更新できませんでした");
    }

    if(setAuthors(normalizeMetadataList(value.authors)) === false){
        throw new Error("TRPG作者候補のローカルcacheを更新できませんでした");
    }
}

function getLocalScenarioMetadata(){
    const storage = globalThis.localStorage;
    return {
        tags: storage
            ? normalizeMetadataList(load(TAG_KEY, [], storage))
            : [],
        authors: normalizeMetadataList(getAuthors())
    };
}

function normalizeMetadataList(value){
    if(!Array.isArray(value)){
        return [];
    }

    return [
        ...new Set(
            value
                .map(item => String(item || "").trim())
                .filter(Boolean)
        )
    ];
}

function belongsToOwner(scenario, ownerCreatorId){
    const currentOwner = String(scenario?.ownerCreatorId || "").trim();
    if(currentOwner){
        return currentOwner === ownerCreatorId;
    }
    return ownerCreatorId === DEFAULT_PRIMARY_CREATOR_ID;
}

function normalizeScenarioOwner(scenario, fallbackOwnerId){
    const owner = String(scenario?.ownerCreatorId || "").trim();
    if(owner){
        if(owner !== fallbackOwnerId){
            throw new Error("別Creatorのシナリオが混在しています");
        }
        return owner;
    }
    return fallbackOwnerId;
}

function normalizeOwnerId(value){
    return String(value || DEFAULT_PRIMARY_CREATOR_ID).trim() || DEFAULT_PRIMARY_CREATOR_ID;
}
