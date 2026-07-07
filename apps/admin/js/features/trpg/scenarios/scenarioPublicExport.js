import {
    showMessage
} from "../../../utils.js";

const PUBLIC_EXPORT_VERSION = "1.0.0";

export function exportPublicScenarios(scenarios, options = {}){
    const source = Array.isArray(scenarios)
        ? scenarios
        : [];

    const publicScenarios = source
    .filter(scenario=>scenario.status === "public")
    .map(toPublicScenario);

    const warnings = createWarnings(publicScenarios);

    const payload = {
        app: options.appName || "MIRA Terminal",
        module: options.moduleName || "trpg",
        exportType: "public-scenarios",
        exportVersion: PUBLIC_EXPORT_VERSION,
        schemaVersion: options.schemaVersion || 1,
        exportedAt: new Date().toISOString(),
        counts: {
            sourceScenarios: source.length,
            publicScenarios: publicScenarios.length,
            warnings: warnings.length
        },
        warnings,
        scenarios: publicScenarios
    };

    downloadJson(
        payload,
        options.filename || "mira-terminal-trpg-public-scenarios.json"
    );

    showMessage(`公開データを出力しました：${publicScenarios.length}件`);
}

function toPublicScenario(scenario){
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

function normalizeTags(value){
    if(Array.isArray(value)){
        return normalizeTextArray(value);
    }

    if(typeof value === "string"){
        return normalizeTextArray(
            value.split(",")
        );
    }

    return [];
}

function normalizeTextArray(values){
    return [
        ...new Set(
            values
            .map(toText)
            .map(text=>text.replace(/^#/, ""))
            .map(text=>text.trim())
            .filter(Boolean)
        )
    ];
}

function toText(value){
    return String(value ?? "").trim();
}

function createWarnings(publicScenarios){
    const warnings = [];

    publicScenarios.forEach(scenario=>{
        if(!scenario.title){
            warnings.push({
                id: scenario.id,
                type: "missing-title",
                message: "タイトルが未入力の公開シナリオがあります"
            });
        }

        if(!scenario.url){
            warnings.push({
                id: scenario.id,
                title: scenario.title,
                type: "missing-url",
                message: "URLが未入力の公開シナリオがあります"
            });
        }

        if(scenario.tags.length === 0){
            warnings.push({
                id: scenario.id,
                title: scenario.title,
                type: "missing-tags",
                message: "タグが未設定の公開シナリオがあります"
            });
        }
    });

    return warnings;
}

function downloadJson(data, filename){
    const blob = new Blob(
        [
            JSON.stringify(
                data,
                null,
                2
            )
        ],
        {
            type: "application/json"
        }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(()=>{
        URL.revokeObjectURL(url);
    }, 0);
}