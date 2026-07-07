const DATA_URL = "./data/public-scenarios.json";

export async function fetchPublicScenarios(){
    const response = await fetch(DATA_URL, {
        cache: "no-store"
    });

    if(!response.ok){
        throw new Error(`公開データの読み込みに失敗しました: ${response.status}`);
    }

    const data = await response.json();

    return normalizePayload(data);
}

function normalizePayload(data){
    const scenarios = Array.isArray(data?.scenarios)
        ? data.scenarios
        : [];

    return scenarios.map(normalizeScenario);
}

function normalizeScenario(scenario){
    return {
        id: toText(scenario.id),
        title: toText(scenario.title),
        kana: toText(scenario.kana),
        author: toText(scenario.author),
        system: toText(scenario.system),
        playersRaw: toText(scenario.playersRaw),
        playersMin: toNullableNumber(scenario.playersMin),
        playersMax: toNullableNumber(scenario.playersMax),
        timeRaw: toText(scenario.timeRaw),
        timeMin: toNullableNumber(scenario.timeMin),
        timeMax: toNullableNumber(scenario.timeMax),
        loss: toText(scenario.loss || "不明"),
        rating: toText(scenario.rating || "all"),
        tags: normalizeTags(scenario.tags),
        url: toText(scenario.url)
    };
}

function normalizeTags(value){
    if(!Array.isArray(value)){
        return [];
    }

    return [
        ...new Set(
            value
            .map(toText)
            .filter(Boolean)
        )
    ];
}

function toText(value){
    return String(value ?? "").trim();
}

function toNullableNumber(value){
    const text = toText(value);

    if(!text){
        return null;
    }

    const number = Number(text);

    return Number.isFinite(number)
        ? number
        : null;
}