export const SCENARIO_DRAFT_STORAGE_KEY = "relmua_trpg_scenario_draft_v1";
const PARAMS = ["fromScenario", "scenarioTitle", "scenarioSystem", "scenarioMinutes", "scenarioCapped"];

export function createScenarioDraft(scenario){
    const id = safeId(scenario?.id);
    const title = safeText(scenario?.title, 120);
    if(!id || !title) return null;

    const system = safeText(scenario?.system, 40);
    const preferredHours = finitePositive(scenario?.timeMax) ?? finitePositive(scenario?.timeMin);
    const rawMinutes = preferredHours === null ? null : Math.max(5, Math.round(preferredHours * 60 / 5) * 5);
    const durationMinutes = rawMinutes === null ? null : Math.min(30 * 60, rawMinutes);

    return {
        scenarioId: id,
        title,
        system,
        durationMinutes,
        durationCapped: rawMinutes !== null && rawMinutes > 30 * 60
    };
}

export function buildScenarioSchedulerHref(scenario, baseHref){
    const draft = createScenarioDraft(scenario);
    if(!draft) return "";
    const url = new URL("../scheduler/", baseHref);
    url.searchParams.set("fromScenario", draft.scenarioId);
    url.searchParams.set("scenarioTitle", draft.title);
    if(draft.system) url.searchParams.set("scenarioSystem", draft.system);
    if(draft.durationMinutes !== null) url.searchParams.set("scenarioMinutes", String(draft.durationMinutes));
    if(draft.durationCapped) url.searchParams.set("scenarioCapped", "1");
    return url.href;
}

export function readScenarioDraftFromHref(href){
    const url = new URL(href, "https://relmua.invalid/");
    const scenarioId = safeId(url.searchParams.get("fromScenario"));
    const title = safeText(url.searchParams.get("scenarioTitle"), 120);
    if(!scenarioId || !title) return null;
    const rawMinutes = Number(url.searchParams.get("scenarioMinutes"));
    const durationMinutes = Number.isFinite(rawMinutes) && rawMinutes >= 5 && rawMinutes <= 30 * 60 ? Math.round(rawMinutes / 5) * 5 : null;
    return {
        scenarioId,
        title,
        system: safeText(url.searchParams.get("scenarioSystem"), 40),
        durationMinutes,
        durationCapped: url.searchParams.get("scenarioCapped") === "1"
    };
}

export function stripScenarioDraftParams(href){
    const url = new URL(href, "https://relmua.invalid/");
    PARAMS.forEach(param => url.searchParams.delete(param));
    return `${url.pathname}${url.search}${url.hash}`;
}

export function durationFieldsFromDraft(draft){
    const total = Number(draft?.durationMinutes);
    if(!Number.isFinite(total) || total < 5) return null;
    return {
        hours: Math.floor(total / 60),
        minutes: total % 60
    };
}

function safeId(value){
    const text = String(value ?? "").trim();
    return /^[A-Za-z0-9_-]{1,100}$/.test(text) ? text : "";
}

function safeText(value, maxLength){
    return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, maxLength);
}

function finitePositive(value){
    if(value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}
