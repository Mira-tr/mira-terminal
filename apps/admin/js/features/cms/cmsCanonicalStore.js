import { getCmsAccessState } from "./cmsClient.js";
import {
    getContentRecord,
    upsertContentRecord
} from "./cmsRepository.js";

/**
 * Hydrate one global Admin snapshot from the CMS.
 *
 * Existing synchronous stores remain as a local cache so Public Export and
 * compatibility code can keep reading without becoming async all at once.
 * When an authenticated Admin is available, the CMS is authoritative.
 */
export async function hydrateGlobalCmsSnapshot(options){
    const contract = normalizeContract(options);
    const localValue = normalizeAndValidate(
        contract,
        contract.readLocal()
    );

    let access;
    try{
        access = await getCmsAccessState();
    }catch(error){
        console.warn(`[cms] ${contract.collection} hydrate fell back to local cache`, error);
        return {
            value: localValue,
            source: "local-offline",
            authoritative: false
        };
    }

    if(!access.configured || !access.authenticated){
        return {
            value: localValue,
            source: "local-compatibility",
            authoritative: false
        };
    }

    if(!access.isAdmin){
        return {
            value: localValue,
            source: "local-no-access",
            authoritative: false
        };
    }

    const record = await getContentRecord(
        contract.collection,
        contract.recordKey,
        null
    );

    if(record){
        const value = normalizeAndValidate(contract, record.data);
        contract.writeCache(value);
        return {
            value,
            source: "cms",
            authoritative: true,
            updatedAt: record.updated_at || null
        };
    }

    const created = await upsertContentRecord({
        collection: contract.collection,
        recordKey: contract.recordKey,
        ownerCreatorId: null,
        status: contract.status,
        sortOrder: 0,
        data: localValue
    });

    contract.writeCache(localValue);
    return {
        value: localValue,
        source: "cms-seeded",
        authoritative: true,
        updatedAt: created?.updated_at || null
    };
}

/**
 * Save one global snapshot. CMS writes happen before the local compatibility
 * cache is updated, preventing a failed remote write from looking successful.
 */
export async function persistGlobalCmsSnapshot(options, value){
    const contract = normalizeContract(options);
    const normalized = normalizeAndValidate(contract, value);
    const access = await getCmsAccessState();

    if(!access.configured || !access.authenticated){
        contract.writeCache(normalized);
        return {
            value: normalized,
            source: "local-compatibility",
            authoritative: false
        };
    }

    if(!access.isAdmin){
        throw new Error("RELMUA CMSのAdmin権限がありません。System > Databaseで権限を確認してください。");
    }

    const saved = await upsertContentRecord({
        collection: contract.collection,
        recordKey: contract.recordKey,
        ownerCreatorId: null,
        status: contract.status,
        sortOrder: 0,
        data: normalized
    });

    contract.writeCache(normalized);
    return {
        value: normalized,
        source: "cms",
        authoritative: true,
        updatedAt: saved?.updated_at || null
    };
}

function normalizeContract(options){
    const contract = options && typeof options === "object" ? options : {};
    const collection = String(contract.collection || "").trim();
    const recordKey = String(contract.recordKey || "").trim();

    if(!/^[a-z0-9-]+$/.test(collection) || !recordKey){
        throw new Error("CMS snapshot contract is invalid");
    }

    for(const key of ["readLocal", "normalize", "validate", "writeCache"]){
        if(typeof contract[key] !== "function"){
            throw new Error(`CMS snapshot contract is missing ${key}`);
        }
    }

    return {
        ...contract,
        collection,
        recordKey,
        status: normalizeStatus(contract.status)
    };
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
