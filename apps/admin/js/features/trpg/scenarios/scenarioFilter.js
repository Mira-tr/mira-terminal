import {
    getCreatedAtTime
} from "./scenarioUtils.js";

export function filterScenarios(scenarios, options = {}){
    let result = Array.isArray(scenarios)
        ? [...scenarios]
        : [];

    const keyword = normalizeSearchText(options.keyword);

    if(keyword){
        result = result.filter(
            scenario=>matchesKeyword(scenario, keyword)
        );
    }

    if(options.status){
        result = result.filter(
            scenario=>scenario.status === options.status
        );
    }

    if(options.system){
        result = result.filter(
            scenario=>scenario.system === options.system
        );
    }

    if(Array.isArray(options.tags) && options.tags.length > 0){
        result = result.filter(
            scenario=>matchesSelectedTags(scenario, options.tags)
        );
    }

    if(options.sort === "name"){
        result.sort(
            (a,b)=>
                (a.kana || a.title || "")
                .localeCompare(
                    b.kana || b.title || "",
                    "ja"
                )
        );
    }

    if(options.sort === "date"){
        result.sort(
            (a,b)=>getCreatedAtTime(b) - getCreatedAtTime(a)
        );
    }

    return result;
}

function matchesKeyword(scenario, keyword){
    return buildAdminSearchText(scenario)
    .includes(keyword);
}

function matchesSelectedTags(scenario, selectedTags){
    const scenarioTags = Array.isArray(scenario.tags)
        ? scenario.tags
        : [];

    return selectedTags.every(
        tag=>scenarioTags.includes(tag)
    );
}

function buildAdminSearchText(scenario){
    return normalizeSearchText([
        scenario.title,
        scenario.kana,
        scenario.author,
        scenario.system,
        scenario.playersRaw,
        scenario.timeRaw,
        scenario.loss,
        scenario.rating,
        scenario.summary,
        scenario.memo,
        ...(scenario.tags || [])
    ].join(" "));
}

function normalizeSearchText(value){
    return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKC");
}