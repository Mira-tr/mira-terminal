export function sortScenarios(scenarios, sortType){
    const result = Array.isArray(scenarios)
        ? [...scenarios]
        : [];

    return result.sort((a, b)=>{
        switch(sortType){
            case "recommended":
                return compareRecommended(a, b);

            case "title":
                return compareText(a.title, b.title);

            case "author":
                return compareText(a.author, b.author);

            case "timeAsc":
                return compareNullableNumber(a.timeMin, b.timeMin);

            case "timeDesc":
                return compareNullableNumber(b.timeMax, a.timeMax);

            case "playersAsc":
                return compareNullableNumber(a.playersMin, b.playersMin);

            default:
                return compareRecommended(a, b);
        }
    });
}

function compareRecommended(a, b){
    const leftRecommended = hasTag(a, "おすすめ") ? 1 : 0;
    const rightRecommended = hasTag(b, "おすすめ") ? 1 : 0;

    const recommendedDiff = rightRecommended - leftRecommended;

    if(recommendedDiff !== 0){
        return recommendedDiff;
    }

    return compareText(a.title, b.title);
}

function hasTag(scenario, tagName){
    const tags = Array.isArray(scenario.tags)
        ? scenario.tags
        : [];

    return tags.includes(tagName);
}

function compareText(a, b){
    return String(a ?? "").localeCompare(
        String(b ?? ""),
        "ja"
    );
}

function compareNullableNumber(a, b){
    const left = Number.isFinite(a)
        ? a
        : Number.MAX_SAFE_INTEGER;

    const right = Number.isFinite(b)
        ? b
        : Number.MAX_SAFE_INTEGER;

    return left - right;
}