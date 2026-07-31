export function getCreatorPublicationIssue(creator, registeredSites){
    if(creator?.status !== "public"){
        return "";
    }

    const sites = Array.isArray(registeredSites) ? registeredSites : [];
    const site = sites.find(item => item.creatorId === creator.id);

    if(!site){
        return `${creator.displayName || creator.id || "活動者"}: 個人サイト管理先が未登録のためPublicにできません`;
    }

    if(site.slug !== creator.slug){
        return `${creator.displayName || creator.id}: slugが個人サイト管理先と一致しません`;
    }

    return "";
}

export function validateCreatorPublications(collection, registeredSites){
    const creators = Array.isArray(collection?.creators)
        ? collection.creators
        : [];
    const issues = creators
        .map(creator => getCreatorPublicationIssue(creator, registeredSites))
        .filter(Boolean);

    if(issues.length){
        throw new Error(issues.join("\n"));
    }

    return true;
}
