export function getProfileCompatibilityIssues(creatorsPayload, profilePayload){
    const creators = Array.isArray(creatorsPayload?.creators)
        ? creatorsPayload.creators
        : [];
    const primary = creators.find(
        creator => creator?.id === creatorsPayload?.primaryCreatorId
    );
    const profile = profilePayload?.profile;

    if(!primary){
        return ["public-creators.json does not contain its Primary Creator"];
    }

    if(!profile || typeof profile !== "object"){
        return ["public-profile.json does not contain a profile object"];
    }

    const issues = [];

    if(profile.displayName !== primary.displayName){
        issues.push("public-profile.json displayName is stale");
    }

    if(profile.bio !== String(primary.bio || "").slice(0, 160)){
        issues.push("public-profile.json bio is stale");
    }

    const expectedActivities = normalizeActivities(primary.activities);
    if(JSON.stringify(profile.activities || []) !== JSON.stringify(expectedActivities)){
        issues.push("public-profile.json activities are stale");
    }

    const expectedLinks = normalizeLinks(primary.links);
    if(JSON.stringify(normalizeLinks(profile.links)) !== JSON.stringify(expectedLinks)){
        issues.push("public-profile.json links are stale");
    }

    return issues;
}

function normalizeActivities(activities){
    return (Array.isArray(activities) ? activities : [])
        .slice(0, 6)
        .map(activity => String(activity || "").slice(0, 24));
}

function normalizeLinks(links){
    return (Array.isArray(links) ? links : [])
        .map(link => ({
            id: String(link?.id || ""),
            label: String(link?.label || ""),
            url: String(link?.url || ""),
            order: Number(link?.order) || 0
        }))
        .sort((a, b) => a.order - b.order);
}
