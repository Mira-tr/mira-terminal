import {
    getScenarios
} from "../trpg/scenarios/scenarioStore.js";

export function updateDashboard(){
    const scenarios = getScenarios();

    document.getElementById("totalCount").textContent =
        scenarios.length;

    document.getElementById("draftCount").textContent =
        scenarios.filter(s=>s.status==="draft").length;

    document.getElementById("publicCount").textContent =
        scenarios.filter(s=>s.status==="public").length;
}