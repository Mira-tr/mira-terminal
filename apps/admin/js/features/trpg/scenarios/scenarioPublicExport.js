import {
    showToast
} from "../../common/toastService.js";

import {
    getPublicIssues
} from "./scenarioUtils.js";

import {
    normalizeScenarioRating
} from "./scenarioRating.js";

import {
    getCreatorCollection,
    resolveCreatorId,
    validateCreatorId
} from "../../creators/creatorCore.js";

const PUBLIC_EXPORT_VERSION = "1.2.0";
const PUBLIC_EXPORT_FILENAME = "public-scenarios.json";
const PUBLIC_EXPORT_DESTINATION = "apps/web/data/creators/chikage/trpg/public-scenarios.json";

export function exportPublicScenarios(scenarios, options = {}){
    const payload = createPublicScenariosPayload(scenarios, options);

    downloadJson(
        payload,
        PUBLIC_EXPORT_FILENAME
    );

    showToast("Public JSONを出力しました", "success");
}

export function createPublicScenariosPayload(scenarios, options = {}){
    const source = Array.isArray(scenarios)
        ? scenarios
        : [];
    const creatorCollection = options.creatorCollection || getCreatorCollection();

    const publicSourceScenarios = source
    .filter(scenario=>scenario.status === "public");

    const publicScenarios = publicSourceScenarios
    .map(scenario => toPublicScenario(scenario, creatorCollection));

    const warnings = createWarnings(publicSourceScenarios);

    return {
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
}

function toPublicScenario(scenario, creatorCollection){
    const ownerCreatorId = resolveCreatorId(
        scenario.ownerCreatorId,
        creatorCollection
    );

    validateCreatorId(
        ownerCreatorId,
        creatorCollection,
        `TRPG ${toText(scenario.id)} owner`
    );

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
        ownerCreatorId,
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
