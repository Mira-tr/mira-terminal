export function filterScenarios(scenarios, filters){
    let result = Array.isArray(scenarios)
        ? [...scenarios]
        : [];

    const keyword = normalizeKeyword(filters.keyword);
    const author = normalizeKeyword(filters.author);
    const system = normalizeText(filters.system);
    const players = toNullableNumber(filters.players);
    const time = toNullableNumber(filters.time);
    const rating = normalizeText(filters.rating);
    const selectedTags = Array.isArray(filters.tags)
        ? filters.tags
        : [];
    const favoriteOnly = Boolean(filters.favoriteOnly);
    const favoriteIds = Array.isArray(filters.favoriteIds)
        ? filters.favoriteIds.map(String)
        : [];

    if(keyword){
        result = result.filter(scenario=>matchesKeyword(scenario, keyword));
    }

    if(author){
        result = result.filter(scenario=>normalizeKeyword(
            scenario.author
        ).includes(author));
    }

    if(system){
        result = result.filter(scenario=>scenario.system === system);
    }

    if(players !== null){
        result = result.filter(scenario=>matchesRange(
            players,
            scenario.playersMin,
            scenario.playersMax
        ));
    }

    if(time !== null){
        result = result.filter(scenario=>matchesRange(
            time,
            scenario.timeMin,
            scenario.timeMax
        ));
    }

    if(rating){
        result = result.filter(scenario=>scenario.rating === rating);
    }

    if(selectedTags.length > 0){
        result = result.filter(scenario=>matchesTags(scenario, selectedTags));
    }

    if(favoriteOnly){
        result = result.filter(scenario=>favoriteIds.includes(
            String(scenario.id)
        ));
    }

    return result;
}

function matchesKeyword(scenario, keyword){
    const searchText = [
        scenario.title,
        scenario.kana,
        scenario.author,
        scenario.system,
        scenario.playersRaw,
        scenario.timeRaw,
        scenario.loss,
        ratingText(scenario.rating),
        ...(scenario.tags || [])
    ]
    .map(normalizeKeyword)
    .join(" ");

    return searchText.includes(keyword);
}

function matchesRange(value, min, max){
    if(min === null && max === null){
        return true;
    }

    if(min !== null && value < min){
        return false;
    }

    if(max !== null && value > max){
        return false;
    }

    return true;
}

function matchesTags(scenario, selectedTags){
    const scenarioTags = Array.isArray(scenario.tags)
        ? scenario.tags
        : [];

    return selectedTags.every(tag=>scenarioTags.includes(tag));
}

function ratingText(rating){
    return {
        all: "全年齢",
        r18: "R18",
        r18g: "R18G"
    }[rating] || rating || "";
}

function normalizeKeyword(value){
    return normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, "");
}

function normalizeText(value){
    return String(value ?? "").trim();
}

function toNullableNumber(value){
    const text = normalizeText(value);

    if(!text){
        return null;
    }

    const number = Number(text);

    return Number.isFinite(number)
        ? number
        : null;
}
