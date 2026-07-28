import {
    normalizeRating
} from "../../js/scenarioRating.js";

const MAX_RESULTS = 3;
const MAX_PLAYERS = 10;
const MAX_HOURS = 30;
const R18_QUERY_VALUE = "include";

export function normalizePickerCriteria(value = {}, allowedSystems = []){
    const allowedSystemSet = new Set(
        allowedSystems
            .map(toText)
            .filter(Boolean)
    );
    const system = toText(value.system);

    return {
        players: normalizeInteger(value.players, 1, MAX_PLAYERS),
        hours: normalizeInteger(value.hours, 1, MAX_HOURS),
        system: allowedSystemSet.has(system)
            ? system
            : "",
        includeR18: value.includeR18 === true ||
            toText(value.includeR18) === R18_QUERY_VALUE
    };
}

export function filterPickerCandidates(scenarios, criteria = {}){
    const normalized = normalizePickerCriteria(
        criteria,
        getScenarioSystems(scenarios)
    );

    return (Array.isArray(scenarios) ? scenarios : [])
        .filter(scenario => scenario && typeof scenario === "object")
        .filter(scenario => matchesRating(scenario, normalized))
        .filter(scenario => matchesPlayers(scenario, normalized.players))
        .filter(scenario => matchesHours(scenario, normalized.hours))
        .filter(scenario => !normalized.system || scenario.system === normalized.system);
}

export function selectPickerCandidates(
    scenarios,
    criteria = {},
    seed = "",
    limit = MAX_RESULTS
){
    const normalizedSeed = normalizeSeed(seed);
    const safeLimit = Math.max(1, Math.min(MAX_RESULTS, Number(limit) || MAX_RESULTS));

    return filterPickerCandidates(scenarios, criteria)
        .map(scenario => ({
            scenario,
            score: createDeterministicScore(normalizedSeed, scenario.id)
        }))
        .sort((a, b) => a.score - b.score ||
            toText(a.scenario.id).localeCompare(toText(b.scenario.id), "ja"))
        .slice(0, safeLimit)
        .map(entry => entry.scenario);
}

export function createPickerSearch(value = {}, allowedSystems = []){
    const criteria = normalizePickerCriteria(value, allowedSystems);
    const seed = normalizeSeed(value.seed);
    const params = new URLSearchParams();

    if(criteria.players){
        params.set("players", criteria.players);
    }

    if(criteria.hours){
        params.set("hours", criteria.hours);
    }

    if(criteria.system){
        params.set("system", criteria.system);
    }

    if(criteria.includeR18){
        params.set("r18", R18_QUERY_VALUE);
    }

    if(seed){
        params.set("seed", seed);
    }

    const query = params.toString();
    return query ? `?${query}` : "";
}

export function readPickerState(search, allowedSystems = []){
    const params = new URLSearchParams(search);
    const criteria = normalizePickerCriteria({
        players: params.get("players"),
        hours: params.get("hours"),
        system: params.get("system"),
        includeR18: params.get("r18")
    }, allowedSystems);

    return {
        ...criteria,
        seed: normalizeSeed(params.get("seed"))
    };
}

export function createMatchReasons(scenario, criteria = {}){
    const normalized = normalizePickerCriteria(
        criteria,
        getScenarioSystems([scenario])
    );
    const reasons = [];

    if(normalized.players){
        reasons.push(`${normalized.players}人で遊べる`);
    }

    if(normalized.hours && scenario.timeMax !== null){
        reasons.push(`${normalized.hours}時間以内の目安`);
    }

    if(normalized.system){
        reasons.push(normalized.system);
    }

    reasons.push(
        normalizeRating(scenario.rating) === "r18"
            ? "R18を含む条件"
            : "全年齢"
    );

    return reasons;
}

export function getScenarioSystems(scenarios){
    return [
        ...new Set(
            (Array.isArray(scenarios) ? scenarios : [])
                .map(scenario => toText(scenario?.system))
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b, "ja"));
}

function matchesRating(scenario, criteria){
    return criteria.includeR18 ||
        normalizeRating(scenario.rating) === "all";
}

function matchesPlayers(scenario, players){
    if(!players){
        return true;
    }

    const min = toNullableNumber(scenario.playersMin);
    const max = toNullableNumber(scenario.playersMax);

    if(min === null && max === null){
        return false;
    }

    return (min === null || players >= min) &&
        (max === null || players <= max);
}

function matchesHours(scenario, hours){
    if(!hours){
        return true;
    }

    const max = toNullableNumber(scenario.timeMax);
    return max !== null && max <= hours;
}

function createDeterministicScore(seed, id){
    const source = `${seed}:${toText(id)}`;
    let hash = 2166136261;

    for(let index = 0; index < source.length; index += 1){
        hash ^= source.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

function normalizeInteger(value, min, max){
    const normalized = toText(value);

    if(!/^\d+$/.test(normalized)){
        return "";
    }

    const number = Number(normalized);
    return number >= min && number <= max
        ? String(number)
        : "";
}

function normalizeSeed(value){
    return toText(value)
        .replace(/[^a-z0-9_-]/gi, "")
        .slice(0, 64);
}

function toNullableNumber(value){
    if(value === null || value === undefined || value === ""){
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number)
        ? number
        : null;
}

function toText(value){
    return String(value ?? "").trim();
}
