import {
    fetchPublicScenarios
} from "../../js/scenarioApi.js";

import {
    createMatchReasons,
    createPickerSearch,
    filterPickerCandidates,
    getScenarioSystems,
    normalizePickerCriteria,
    readPickerState,
    selectPickerCandidates
} from "./scenarioPicker.js";

const RESULT_LIMIT = 3;
const HOURS = [
    2,
    3,
    4,
    5,
    6,
    8,
    10,
    12,
    16,
    24
];

let scenarios = [];
let systems = [];
let currentState = null;

async function init(){
    const form = document.getElementById("pickerForm");

    if(!form){
        return;
    }

    bindActions(form);

    try{
        scenarios = await fetchPublicScenarios();
        systems = getScenarioSystems(scenarios);
        populateOptions();

        const state = readPickerState(window.location.search, systems);
        applyStateToForm(state);

        if(state.seed){
            renderSelection(state);
        }else{
            renderReadyState(scenarios.length);
        }
    }catch(error){
        console.warn("Failed to initialize Scenario Picker.", error);
        renderLoadError();
    }
}

function bindActions(form){
    form.addEventListener("submit", event => {
        event.preventDefault();
        chooseCandidates();
    });

    document.getElementById("pickerAgainButton")?.addEventListener("click", ()=>{
        chooseCandidates();
    });

    document.getElementById("pickerResetButton")?.addEventListener("click", ()=>{
        form.reset();
        applyDefaultFormState();
        currentState = null;
        window.history.replaceState({}, "", window.location.pathname);
        renderReadyState(scenarios.length);
    });

    document.getElementById("pickerShareButton")?.addEventListener("click", async ()=>{
        if(!currentState?.seed){
            return;
        }

        const shareUrl = new URL(window.location.href);
        shareUrl.search = createPickerSearch(currentState, systems);
        await copyShareUrl(shareUrl.toString());
    });
}

function populateOptions(){
    const playerSelect = document.getElementById("pickerPlayers");
    const hoursSelect = document.getElementById("pickerHours");
    const systemSelect = document.getElementById("pickerSystem");

    if(playerSelect){
        const playerOptions = Array.from({ length: 6 }, (_, index) => {
            const players = index + 1;
            return createOption(String(players), `${players}人`);
        });
        playerSelect.append(...playerOptions);
    }

    if(hoursSelect){
        hoursSelect.append(...HOURS.map(hours => (
            createOption(String(hours), `${hours}時間以内`)
        )));
    }

    if(systemSelect){
        systemSelect.append(...systems.map(system => (
            createOption(system, system)
        )));
    }
}

function createOption(value, label){
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
}

function chooseCandidates(){
    if(!scenarios.length){
        return;
    }

    const criteria = readFormCriteria();
    const state = {
        ...criteria,
        seed: createSeed()
    };

    currentState = state;
    window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${createPickerSearch(state, systems)}`
    );
    renderSelection(state);
}

function readFormCriteria(){
    return normalizePickerCriteria({
        players: document.getElementById("pickerPlayers")?.value,
        hours: document.getElementById("pickerHours")?.value,
        system: document.getElementById("pickerSystem")?.value,
        includeR18: document.getElementById("pickerIncludeR18")?.checked === true
    }, systems);
}

function applyStateToForm(state){
    setValue("pickerPlayers", state.players);
    setValue("pickerHours", state.hours);
    setValue("pickerSystem", state.system);

    const includeR18 = document.getElementById("pickerIncludeR18");

    if(includeR18){
        includeR18.checked = state.includeR18;
    }
}

function applyDefaultFormState(){
    const includeR18 = document.getElementById("pickerIncludeR18");

    if(includeR18){
        includeR18.checked = false;
    }
}

function setValue(id, value){
    const element = document.getElementById(id);

    if(element){
        element.value = value || "";
    }
}

function renderSelection(state){
    const matching = filterPickerCandidates(scenarios, state);
    const selected = selectPickerCandidates(
        scenarios,
        state,
        state.seed,
        RESULT_LIMIT
    );
    currentState = state;

    updateResultActions(true);
    updateResultSummary(matching.length, selected.length);

    const list = document.getElementById("pickerResults");

    if(!list){
        return;
    }

    if(!selected.length){
        list.replaceChildren(createEmptyState());
        return;
    }

    list.replaceChildren(...selected.map((scenario, index) => (
        createCandidateCard(scenario, state, index)
    )));
}

function renderReadyState(count){
    currentState = null;
    updateResultActions(false);

    const summary = document.getElementById("pickerResultSummary");
    const list = document.getElementById("pickerResults");

    if(summary){
        summary.textContent = `${count}件の書架から、条件に合う候補を3件選びます。`;
    }

    if(list){
        list.replaceChildren(
            createStatusPanel(
                "条件を選んでください",
                "指定なしでも抽選できます。R18作品は初期状態では候補に含みません。"
            )
        );
    }
}

function renderLoadError(){
    updateResultActions(false);

    const summary = document.getElementById("pickerResultSummary");
    const list = document.getElementById("pickerResults");

    if(summary){
        summary.textContent = "書架を読み込めませんでした。";
    }

    if(list){
        list.replaceChildren(
            createStatusPanel(
                "候補を選べませんでした",
                "時間を置いて再度お試しください。"
            )
        );
    }

    const submit = document.getElementById("pickerSubmitButton");

    if(submit){
        submit.disabled = true;
    }
}

function updateResultSummary(matchingCount, selectedCount){
    const summary = document.getElementById("pickerResultSummary");

    if(!summary){
        return;
    }

    summary.textContent = selectedCount
        ? `${matchingCount}件の条件一致から、${selectedCount}件を選びました。`
        : "この条件に一致するシナリオはありませんでした。";
}

function updateResultActions(enabled){
    ["pickerAgainButton", "pickerShareButton"].forEach(id => {
        const button = document.getElementById(id);

        if(button){
            button.disabled = !enabled;
        }
    });

    const status = document.getElementById("pickerShareStatus");

    if(status){
        status.textContent = "";
    }
}

function createCandidateCard(scenario, criteria, index){
    const article = document.createElement("article");
    article.className = index === 0
        ? "picker-result-card is-primary"
        : "picker-result-card";

    const header = document.createElement("div");
    header.className = "picker-result-card__header";

    const rank = document.createElement("p");
    rank.className = "section-label";
    rank.textContent = index === 0
        ? "本命"
        : `候補 ${index + 1}`;

    const rating = document.createElement("span");
    rating.className = scenario.rating === "r18"
        ? "picker-rating is-r18"
        : "picker-rating";
    rating.textContent = scenario.rating === "r18"
        ? "R18"
        : "全年齢";

    header.append(rank, rating);

    const title = document.createElement("h3");
    title.textContent = scenario.title || "無題";

    const author = document.createElement("p");
    author.className = "picker-result-card__author";
    author.textContent = scenario.author
        ? `作者：${scenario.author}`
        : "作者：不明";

    const summary = document.createElement("p");
    summary.className = "picker-result-card__summary";
    summary.textContent = scenario.summary || "概要は書架で確認できます。";

    article.append(
        header,
        title,
        author,
        createMetaList(scenario),
        createReasonList(createMatchReasons(scenario, criteria)),
        summary,
        createCardActions(scenario)
    );

    return article;
}

function createMetaList(scenario){
    const list = document.createElement("dl");
    list.className = "picker-meta";

    [
        ["人数", scenario.playersRaw || "不明"],
        ["時間", scenario.timeRaw || "不明"],
        ["システム", scenario.system || "不明"],
        ["ロスト率", scenario.loss || "不明"]
    ].forEach(([label, value]) => {
        const item = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        item.append(term, description);
        list.appendChild(item);
    });

    return list;
}

function createReasonList(reasons){
    const wrapper = document.createElement("div");
    wrapper.className = "picker-reasons";

    const label = document.createElement("p");
    label.textContent = "選定理由";

    const list = document.createElement("ul");

    reasons.forEach(reason => {
        const item = document.createElement("li");
        item.textContent = reason;
        list.appendChild(item);
    });

    wrapper.append(label, list);
    return wrapper;
}

function createCardActions(scenario){
    const actions = document.createElement("div");
    actions.className = "picker-card-actions";

    const libraryLink = document.createElement("a");
    const params = new URLSearchParams({
        q: scenario.title || ""
    });
    libraryLink.className = "button button-ghost";
    libraryLink.href = `../scenarios/?${params.toString()}`;
    libraryLink.textContent = "書架で詳しく見る";
    actions.appendChild(libraryLink);

    if(isSafeHttpUrl(scenario.url)){
        const externalLink = document.createElement("a");
        externalLink.className = "button picker-primary-link";
        externalLink.href = scenario.url;
        externalLink.target = "_blank";
        externalLink.rel = "noopener noreferrer";
        externalLink.textContent = "配布ページ";
        actions.appendChild(externalLink);
    }

    return actions;
}

function createEmptyState(){
    const panel = createStatusPanel(
        "この条件では見つかりませんでした",
        "人数や時間をひとつずつ外して、もう一度選んでください。条件は自動では緩めません。"
    );
    const link = document.createElement("a");
    link.className = "button button-ghost";
    link.href = "../scenarios/";
    link.textContent = "書架を直接探す";
    panel.appendChild(link);
    return panel;
}

function createStatusPanel(titleText, bodyText){
    const panel = document.createElement("div");
    panel.className = "picker-status-panel";
    panel.setAttribute("role", "status");

    const title = document.createElement("h3");
    title.textContent = titleText;

    const body = document.createElement("p");
    body.textContent = bodyText;

    panel.append(title, body);
    return panel;
}

async function copyShareUrl(url){
    const status = document.getElementById("pickerShareStatus");

    try{
        await navigator.clipboard.writeText(url);

        if(status){
            status.textContent = "同じ結果を開けるURLをコピーしました。";
        }
    }catch{
        if(status){
            status.textContent = "コピーできませんでした。ブラウザのアドレスを共有してください。";
        }
    }
}

function createSeed(){
    if(globalThis.crypto?.getRandomValues){
        const values = new Uint32Array(2);
        globalThis.crypto.getRandomValues(values);
        return `${values[0].toString(36)}${values[1].toString(36)}`;
    }

    return Date.now().toString(36);
}

function isSafeHttpUrl(value){
    try{
        return ["http:", "https:"].includes(new URL(value).protocol);
    }catch{
        return false;
    }
}

if(typeof document !== "undefined"){
    init();
}
