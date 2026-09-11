import { getCmsAccessState } from "./cmsClient.js";
import {
    getContentRecord,
    upsertContentRecord
} from "./cmsRepository.js";
import {
    resolveCmsCreatorId
} from "../creators/creatorCmsStore.js";

const DEFAULT_SERVICES = Object.freeze({
    getAccessState: getCmsAccessState,
    resolveOwnerId: resolveCmsCreatorId,
    getRecord: getContentRecord,
    upsertRecord: upsertContentRecord
});

export async function hydrateOwnerCmsSnapshot(options, serviceOverrides = {}){
    const contract = normalizeContract(options);
    const services = normalizeServices(serviceOverrides);
    const localValue = normalizeAndValidate(contract, contract.readLocal());

    let access;
    try{
        access = await services.getAccessState();
    }catch(error){
        console.warn(`[cms] ${contract.collection} hydrate fell back to local cache`, error);
        return createResult(localValue, "local-offline", false, null);
    }

    if(!access.configured || !access.authenticated){
        return createResult(localValue, "local-compatibility", false, null);
    }

    const ownerCmsId = await services.resolveOwnerId(contract.ownerCreatorId);
    if(!ownerCmsId){
        return createResult(localValue, "local-owner-unresolved", false, null);
    }

    if(!canManageOwner(access, ownerCmsId)){
        return createResult(localValue, "local-no-access", false, ownerCmsId);
    }

    const record = await services.getRecord(
        contract.collection,
        contract.recordKey,
        ownerCmsId
    );

    if(record){
        const value = normalizeAndValidate(contract, record.data);
        contract.writeCache(value);
        return {
            ...createResult(value, "cms", true, ownerCmsId),
            updatedAt: record.updated_at || null
        };
    }

    const created = await services.upsertRecord({
        collection: contract.collection,
        recordKey: contract.recordKey,
        ownerCreatorId: ownerCmsId,
        status: contract.status,
        sortOrder: 0,
        data: localValue
    });

    contract.writeCache(localValue);
    return {
        ...createResult(localValue, "cms-seeded", true, ownerCmsId),
        updatedAt: created?.updated_at || null
    };
}

export async function persistOwnerCmsSnapshot(options, value, serviceOverrides = {}){
    const contract = normalizeContract(options);
    const services = normalizeServices(serviceOverrides);
    const normalized = normalizeAndValidate(contract, value);
    const access = await services.getAccessState();

    if(!access.configured || !access.authenticated){
        contract.writeCache(normalized);
        return createResult(normalized, "local-compatibility", false, null);
    }

    const ownerCmsId = await services.resolveOwnerId(contract.ownerCreatorId);
    if(!ownerCmsId){
        throw new Error(`Creator「${contract.ownerCreatorId}」をCMS上で解決できません。Creatorsを先に同期してください。`);
    }

    if(!canManageOwner(access, ownerCmsId)){
        throw new Error("このCreator領域を編集する権限がありません。System > Databaseで権限を確認してください。");
    }

    const saved = await services.upsertRecord({
        collection: contract.collection,
        recordKey: contract.recordKey,
        ownerCreatorId: ownerCmsId,
        status: contract.status,
        sortOrder: 0,
        data: normalized
    });

    contract.writeCache(normalized);
    return {
        ...createResult(normalized, "cms", true, ownerCmsId),
        updatedAt: saved?.updated_at || null
    };
}

function canManageOwner(access, ownerCmsId){
    return Boolean(
        access?.isAdmin ||
        (Array.isArray(access?.creatorIds) && access.creatorIds.includes(ownerCmsId))
    );
}

function normalizeContract(options){
    const contract = options && typeof options === "object" ? options : {};
    const collection = String(contract.collection || "").trim();
    const recordKey = String(contract.recordKey || "").trim();
    const ownerCreatorId = String(contract.ownerCreatorId || "").trim();

    if(!/^[a-z0-9-]+$/.test(collection) || !recordKey || !ownerCreatorId){
        throw new Error("Owner CMS snapshot contract is invalid");
    }

    for(const key of ["readLocal", "normalize", "validate", "writeCache"]){
        if(typeof contract[key] !== "function"){
            throw new Error(`Owner CMS snapshot contract is missing ${key}`);
        }
    }

    return {
        ...contract,
        collection,
        recordKey,
        ownerCreatorId,
        status: normalizeStatus(contract.status)
    };
}

function normalizeServices(overrides){
    const services = {
        ...DEFAULT_SERVICES,
        ...(overrides && typeof overrides === "object" ? overrides : {})
    };

    for(const key of ["getAccessState", "resolveOwnerId", "getRecord", "upsertRecord"]){
        if(typeof services[key] !== "function"){
            throw new Error(`Owner CMS service is missing ${key}`);
        }
    }
    return services;
}

function normalizeAndValidate(contract, value){
    const normalized = contract.normalize(value);
    contract.validate(normalized);
    return normalized;
}

function normalizeStatus(value){
    const status = String(value || "private").trim().toLowerCase();
    return ["draft", "public", "private", "archived"].includes(status)
        ? status
        : "private";
}

function createResult(value, source, authoritative, ownerCmsId){
    return {
        value,
        source,
        authoritative,
        ownerCmsId
    };
}
