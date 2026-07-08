export const VISIBLE_TAG_LIMIT = 16;

export function createTagFilterModel(tags, options = {}){
    const allTags = normalizeTags(tags);
    const availableTags = new Set(allTags);
    const selectedTags = normalizeTags(options.selectedTags)
    .filter(tag=>availableTags.has(tag));
    const selectedTagSet = new Set(selectedTags);
    const searchQuery = normalizeTagSearch(options.searchQuery);
    const expanded = Boolean(options.expanded);
    const limit = normalizeLimit(options.limit);

    const matchingTags = searchQuery
        ? allTags.filter(tag=>normalizeTagSearch(tag).includes(searchQuery))
        : allTags;

    const baseVisibleTags = searchQuery || expanded
        ? matchingTags
        : matchingTags.slice(0, limit);

    return {
        selectedTags,
        visibleTags: baseVisibleTags.filter(tag=>!selectedTagSet.has(tag)),
        totalTagCount: allTags.length,
        matchingTagCount: matchingTags.length,
        isSearchActive: Boolean(searchQuery),
        showToggle: !searchQuery && allTags.length > limit,
        expanded
    };
}

export function normalizeTagSearch(value){
    return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, character=>String.fromCharCode(
        character.charCodeAt(0) - 0x60
    ))
    .replace(/\s+/g, "");
}

function normalizeTags(tags){
    if(!Array.isArray(tags)){
        return [];
    }

    return [
        ...new Set(
            tags
            .map(tag=>String(tag ?? "").trim())
            .filter(Boolean)
        )
    ];
}

function normalizeLimit(value){
    const number = Number(value ?? VISIBLE_TAG_LIMIT);

    return Number.isInteger(number) && number > 0
        ? number
        : VISIBLE_TAG_LIMIT;
}
