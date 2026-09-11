import { getCmsClient } from "./cmsClient.js";

export async function listSiteSections(){
    return selectMany("cms_site_sections", query => query.order("sort_order", { ascending: true }));
}

export async function upsertSiteSection(section){
    return upsertOne("cms_site_sections", normalizeRecord(section));
}

export async function upsertSiteSectionByKey(section){
    const payload = normalizeRecord(section);
    delete payload.id;
    return upsertOne("cms_site_sections", payload, "section_key");
}

export async function listCreators(){
    return selectMany("cms_creators", query => query.order("sort_order", { ascending: true }));
}

export async function upsertCreator(creator){
    const payload = normalizeRecord(creator);
    return upsertOne("cms_creators", payload);
}

export async function upsertCreatorByLegacyId(creator){
    const payload = normalizeRecord(creator);
    return upsertOne("cms_creators", payload, "legacy_id");
}

export async function archiveCreatorByLegacyId(legacyId){
    const client = requireClient(await getCmsClient());
    const { data, error } = await client
        .from("cms_creators")
        .update({
            status: "archived",
            is_primary: false,
            updated_at: new Date().toISOString()
        })
        .eq("legacy_id", String(legacyId || "").trim())
        .select("*")
        .single();
    throwIfError(error);
    return data;
}

export async function listContentRecords(collection, ownerCreatorId = null){
    const client = requireClient(await getCmsClient());
    let query = client
        .from("cms_content_records")
        .select("*")
        .eq("collection", String(collection || "").trim())
        .order("sort_order", { ascending: true })
        .order("updated_at", { ascending: false });

    query = applyOwnerFilter(query, ownerCreatorId);

    const { data, error } = await query;
    throwIfError(error);
    return data || [];
}

export async function getContentRecord(collection, recordKey, ownerCreatorId = null){
    const client = requireClient(await getCmsClient());
    let query = client
        .from("cms_content_records")
        .select("*")
        .eq("collection", String(collection || "").trim())
        .eq("record_key", String(recordKey || "").trim());

    query = applyOwnerFilter(query, ownerCreatorId);

    const { data, error } = await query.maybeSingle();
    throwIfError(error);
    return data || null;
}

export async function upsertContentRecord({
    collection,
    recordKey,
    ownerCreatorId = null,
    status = "draft",
    sortOrder = 0,
    data = {}
}){
    return upsertOne("cms_content_records", {
        collection: String(collection || "").trim(),
        record_key: String(recordKey || "").trim(),
        owner_creator_id: ownerCreatorId || null,
        status,
        sort_order: Number(sortOrder) || 0,
        data: cloneJson(data),
        updated_at: new Date().toISOString()
    }, "collection,owner_creator_id,record_key");
}

export async function deleteContentRecord(collection, recordKey, ownerCreatorId = null){
    const client = requireClient(await getCmsClient());
    let query = client
        .from("cms_content_records")
        .delete()
        .eq("collection", String(collection || "").trim())
        .eq("record_key", String(recordKey || "").trim());

    query = applyOwnerFilter(query, ownerCreatorId);
    const { error } = await query;
    throwIfError(error);
    return true;
}

export async function createPublicationRevision(manifest, status = "prepared"){
    const client = requireClient(await getCmsClient());
    const { data: userData, error: userError } = await client.auth.getUser();
    throwIfError(userError);
    if(!userData?.user){
        throw new Error("ログインが必要です");
    }

    const { data, error } = await client
        .from("cms_publication_revisions")
        .insert({
            created_by: userData.user.id,
            status,
            manifest: cloneJson(manifest || {})
        })
        .select("*")
        .single();
    throwIfError(error);
    return data;
}

export async function appendCmsActivity(action, entityType = "", entityId = "", details = {}){
    const client = requireClient(await getCmsClient());
    const { data: userData, error: userError } = await client.auth.getUser();
    throwIfError(userError);
    if(!userData?.user){
        throw new Error("ログインが必要です");
    }

    const { error } = await client.from("cms_activity_log").insert({
        actor_id: userData.user.id,
        action: String(action || "").trim(),
        entity_type: String(entityType || "").trim(),
        entity_id: String(entityId || "").trim(),
        details: cloneJson(details || {})
    });
    throwIfError(error);
    return true;
}

async function selectMany(table, decorate = query => query){
    const client = requireClient(await getCmsClient());
    const query = decorate(client.from(table).select("*"));
    const { data, error } = await query;
    throwIfError(error);
    return data || [];
}

async function upsertOne(table, payload, onConflict = "id"){
    const client = requireClient(await getCmsClient());
    const { data, error } = await client
        .from(table)
        .upsert(payload, { onConflict })
        .select("*")
        .single();
    throwIfError(error);
    return data;
}

function applyOwnerFilter(query, ownerCreatorId){
    return ownerCreatorId
        ? query.eq("owner_creator_id", ownerCreatorId)
        : query.is("owner_creator_id", null);
}

function normalizeRecord(value){
    return {
        ...value,
        updated_at: new Date().toISOString()
    };
}

function requireClient(client){
    if(!client){
        throw new Error("Supabaseが設定されていません");
    }
    return client;
}

function throwIfError(error){
    if(error){
        throw new Error(error.message || "DB操作に失敗しました");
    }
}

function cloneJson(value){
    return JSON.parse(JSON.stringify(value ?? {}));
}
