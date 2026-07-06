import {
    getCreatedAtTime
} from "./scenarioUtils.js";

export function filterScenarios(scenarios, options = {}){
    let result = Array.isArray(scenarios)
        ? [...scenarios]
        : [];

    const keyword = toSearchText(options.keyword);

    if(keyword){
        result = result.filter(
            scenario=>buildSearchText(scenario).includes(keyword)
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

function buildSearchText(scenario){
    return toSearchText([
        scenario.title,
        scenario.kana,
        scenario.author,
        scenario.system,
        scenario.playersRaw,
        scenario.timeRaw,
        scenario.loss,
        scenario.status,
        scenario.rating,
        scenario.memo,
        ...(scenario.tags || [])
    ].join(" "));
}

function toSearchText(value){
    return String(value ?? "")
    .trim()
    .toLowerCase();
}