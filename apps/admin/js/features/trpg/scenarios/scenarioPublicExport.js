import {
    showMessage
} from "../../../utils.js";

import {
    getPublicIssues
} from "./scenarioUtils.js";

import {
    normalizeScenarioRating
} from "./scenarioRating.js";

const PUBLIC_EXPORT_VERSION = "1.2.0";
const PUBLIC_EXPORT_FILENAME = "public-scenarios.json";
const PUBLIC_EXPORT_DESTINATION = "apps/web/trpg/data/public-scenarios.json";

export function exportPublicScenarios(scenarios, options = {}){
    const source = Array.isArray(scenarios)
        ? scenarios
        : [];

    const publicSourceScenarios = source
    .filter(scenario=>scenario.status === "public");

    const publicScenarios = publicSourceScenarios
    .map(toPublicScenario);

    const warnings = createWarnings(publicSourceScenarios);

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
        PUBLIC_EXPORT_FILENAME
    );

    showMessage(
        `Public Export完了：${publicScenarios.length}件 / ` +
        `ファイル名: ${PUBLIC_EXPORT_FILENAME} / ` +
        `配置先: ${PUBLIC_EXPORT_DESTINATION}`
    );
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
        rating: normalizeScenarioRating(scenario.rating),
        scenarioType: toText(scenario.scenarioType),
        series: toText(scenario.series),
        summary: toText(scenario.summary),
        notes: toText(scenario.notes),
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

function createWarnings(publicSourceScenarios){
    const warnings = [];

    publicSourceScenarios.forEach(scenario=>{
        const id = toText(scenario.id);
        const title = toText(scenario.title);

        if(!title){
            warnings.push({
                id,
                type: "missing-title",
                message: "タイトルが未入力の公開シナリオがあります"
            });
        }

        getPublicIssues(scenario).forEach(issue=>{
            warnings.push({
                id,
                title,
                type: issue.type,
                message: issue.message
            });
        });
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
