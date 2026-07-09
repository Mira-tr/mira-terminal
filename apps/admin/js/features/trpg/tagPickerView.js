export const ADMIN_TAG_CANDIDATE_LIMIT = 12;

export function createAdminTagPickerModel(tags, options = {}){
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

    const candidateTags = matchingTags.filter(
        tag=>!selectedTagSet.has(tag)
    );

    const visibleCandidateTags = searchQuery || expanded
        ? candidateTags
        : candidateTags.slice(0, limit);

    return {
        selectedTags,
        visibleCandidateTags,
        totalTagCount: allTags.length,
        candidateTagCount: candidateTags.length,
        matchingTagCount: matchingTags.length,
        isSearchActive: Boolean(searchQuery),
        showToggle: !searchQuery && candidateTags.length > limit,
        expanded,
        limit
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
    const number = Number(value ?? ADMIN_TAG_CANDIDATE_LIMIT);

    return Number.isInteger(number) && number > 0
        ? number
        : ADMIN_TAG_CANDIDATE_LIMIT;
}
