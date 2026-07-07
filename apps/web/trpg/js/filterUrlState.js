const RATING_VALUES = new Set([
    "all",
    "r18",
    "r18g"
]);

const SORT_VALUES = new Set([
    "recommended",
    "title",
    "author",
    "timeAsc",
    "timeDesc",
    "playersAsc"
]);

const MAX_KEYWORD_LENGTH = 200;

export function readFilterStateFromSearch(search, allowed = {}){
    const params = new URLSearchParams(search);
    const allowedSystems = toAllowedSet(allowed.systems);
    const allowedTags = toAllowedSet(allowed.tags);

    return {
        keyword: normalizeKeyword(params.get("q")),
        system: normalizeAllowedValue(
            params.get("system"),
            allowedSystems
        ),
        players: normalizeNumberInRange(
            params.get("players"),
            1,
            10
        ),
        time: normalizeNumberInRange(
            params.get("time"),
            1,
            30
        ),
        rating: normalizeSetValue(
            params.get("rating"),
            RATING_VALUES
        ),
        tags: normalizeTags(
            params.getAll("tag"),
            allowedTags
        ),
        sort: normalizeSetValue(
            params.get("sort"),
            SORT_VALUES
        ) || "recommended"
    };
}

export function createFilterSearch(filters = {}){
    const params = new URLSearchParams();
    const keyword = normalizeKeyword(filters.keyword);
    const system = normalizeText(filters.system);
    const players = normalizeNumberInRange(filters.players, 1, 10);
    const time = normalizeNumberInRange(filters.time, 1, 30);
    const rating = normalizeSetValue(filters.rating, RATING_VALUES);
    const sort = normalizeSetValue(filters.sort, SORT_VALUES);

    if(keyword){
        params.set("q", keyword);
    }

    if(system){
        params.set("system", system);
    }

    if(players){
        params.set("players", players);
    }

    if(time){
        params.set("time", time);
    }

    if(rating){
        params.set("rating", rating);
    }

    normalizeTags(filters.tags).forEach(tag=>{
        params.append("tag", tag);
    });

    if(sort && sort !== "recommended"){
        params.set("sort", sort);
    }

    const query = params.toString();
    return query ? `?${query}` : "";
}

export function createFilterUrl(currentUrl, filters = {}){
    const url = new URL(currentUrl);
    url.search = createFilterSearch(filters);
    return url.toString();
}

export function hasShareableFilterState(filters = {}){
    return createFilterSearch(filters) !== "";
}

function normalizeKeyword(value){
    return normalizeText(value)
    .slice(0, MAX_KEYWORD_LENGTH);
}

function normalizeAllowedValue(value, allowedValues){
    const normalized = normalizeText(value);
    return allowedValues.has(normalized)
        ? normalized
        : "";
}

function normalizeSetValue(value, allowedValues){
    const normalized = normalizeText(value);
    return allowedValues.has(normalized)
        ? normalized
        : "";
}

function normalizeNumberInRange(value, min, max){
    const normalized = normalizeText(value);

    if(!/^\d+$/.test(normalized)){
        return "";
    }

    const number = Number(normalized);
    return number >= min && number <= max
        ? String(number)
        : "";
}

function normalizeTags(values, allowedValues = null){
    if(!Array.isArray(values)){
        return [];
    }

    return [
        ...new Set(
            values
            .map(normalizeText)
            .filter(Boolean)
            .filter(tag=>!allowedValues || allowedValues.has(tag))
        )
    ];
}

function toAllowedSet(values){
    return new Set(
        Array.isArray(values)
            ? values.map(normalizeText).filter(Boolean)
            : []
    );
}

function normalizeText(value){
    return String(value ?? "").trim();
}

