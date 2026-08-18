import {
    answerLabel,
    buildCompletionPlans,
    createSlots,
    deriveScheduleSummary,
    findUnansweredParticipants,
    formatMinute,
    formatSlot,
    getResponseCompleteness,
    summarizeResponses
} from "./schedulerMath.js";
import {
    createId,
    createInitialState,
    createScheduleRecord,
    createScheduleFromSharePayload,
    ensureLocalGuestParticipant,
    markClean,
    markDirty,
    setSaveStatus
} from "./state.js";
import {
    createLocalStorageAdapter
} from "./storage.js";
import {
    createInviteText,
    createPublicUrl,
    readSharePayload
} from "./share.js";

const storage = createLocalStorageAdapter();
const metrics = {
    render: 0,
    dashboardRender: 0,
    detailRender: 0,
    answerRender: 0,
    resultsRender: 0,
    dashboardSummaryGeneration: 0,
    summaryGeneration: 0,
    candidateGeneration: 0,
    planGeneration: 0
};

const app = {
    state: storage.load(),
    mode: "dashboard",
    dashboardFilter: "all",
    showOnlyUnanswered: false,
    shareOpen: false,
    activeDetailSlotId: "",
    guestLanding: false,
    caches: new Map(),
    saveTimer: 0
};

const elements = {
    dashboardView: document.querySelector("#dashboardView"),
    createView: document.querySelector("#createView"),
    detailView: document.querySelector("#detailView"),
    scheduleTitle: document.querySelector("#scheduleTitle"),
    saveState: document.querySelector("#saveState"),
    dashboardLead: document.querySelector("#dashboardLead"),
    dashboardFilters: Array.from(document.querySelectorAll("[data-dashboard-filter]")),
    scheduleList: document.querySelector("#scheduleList"),
    newScheduleButton: document.querySelector("#newScheduleButton"),
    createTitleInput: document.querySelector("#scheduleTitleInput"),
    createStartDateInput: document.querySelector("#startDateInput"),
    createEndDateInput: document.querySelector("#endDateInput"),
    createTimePresetInput: document.querySelector("#timePresetInput"),
    createScheduleButton: document.querySelector("#createScheduleButton"),
    detailTitle: document.querySelector("#detailTitle"),
    detailAction: document.querySelector("#detailAction"),
    ownerOverview: document.querySelector("#ownerOverview"),
    answerPanel: document.querySelector("#answerPanel"),
    guestIntro: document.querySelector("#guestIntro"),
    answerCompleteState: document.querySelector("#answerCompleteState"),
    guestNameInput: document.querySelector("#guestNameInput"),
    answerList: document.querySelector("#answerList"),
    quickBulk: document.querySelector("#quickBulk"),
    unansweredOnly: document.querySelector("#unansweredOnly"),
    responseStatus: document.querySelector("#responseStatus"),
    resultsLead: document.querySelector("#resultsLead"),
    recommendedList: document.querySelector("#recommendedList"),
    unansweredList: document.querySelector("#unansweredList"),
    detailsTable: document.querySelector("#detailsTable"),
    generatePlansButton: document.querySelector("#generatePlansButton"),
    planList: document.querySelector("#planList"),
    participantList: document.querySelector("#participantList"),
    participantNameInput: document.querySelector("#participantNameInput"),
    addParticipantButton: document.querySelector("#addParticipantButton"),
    editTitleInput: document.querySelector("#editTitleInput"),
    editStartDateInput: document.querySelector("#editStartDateInput"),
    editEndDateInput: document.querySelector("#editEndDateInput"),
    editTimePresetInput: document.querySelector("#editTimePresetInput"),
    sharePanel: document.querySelector("#sharePanel"),
    toggleShareButton: document.querySelector("#toggleShareButton"),
    shareUrl: document.querySelector("#shareUrl"),
    shareText: document.querySelector("#shareText"),
    copyShareButton: document.querySelector("#copyShareButton"),
    resetButton: document.querySelector("#resetButton")
};

globalThis.__relmuaScheduleMetrics = metrics;
globalThis.__relmuaScheduleApp = {
    metrics,
    getState: () => app.state
};

init();

function init(){
    ensureActiveSchedule();
    syncCreateDefaults();
    applyHashRoute();
    bindEvents();
    renderShell();
    renderMode();
}

function bindEvents(){
    document.addEventListener("click", handleDocumentClick);
    window.addEventListener("hashchange", () => {
        applyHashRoute();
        renderShell();
        renderMode();
    });
    elements.dashboardFilters.forEach(button => {
        button.addEventListener("click", () => setDashboardFilter(button.dataset.dashboardFilter));
    });
    elements.guestNameInput.addEventListener("input", updateActiveParticipantName);
    elements.answerList.addEventListener("click", handleAnswerClick);
    elements.answerList.addEventListener("toggle", handleDetailToggle, true);
    elements.quickBulk.addEventListener("change", handleBulkAnswer);
    elements.unansweredOnly.addEventListener("change", () => {
        app.showOnlyUnanswered = elements.unansweredOnly.checked;
        renderAnswerView();
    });
    elements.recommendedList.addEventListener("click", handleResultsClick);
    elements.generatePlansButton.addEventListener("click", renderPlans);
    elements.participantList.addEventListener("click", handleParticipantClick);
    elements.addParticipantButton.addEventListener("click", addParticipant);
    elements.copyShareButton.addEventListener("click", copyShareText);
    elements.resetButton.addEventListener("click", resetSchedules);
    elements.editTitleInput.addEventListener("input", updateScheduleTitleInline);
    [
        elements.editTitleInput,
        elements.editStartDateInput,
        elements.editEndDateInput,
        elements.editTimePresetInput
    ].forEach(input => {
        input.addEventListener("change", updateScheduleSettings);
    });
}

function handleDocumentClick(event){
    const button = event.target.closest("button[data-action]");

    if(!button){
        return;
    }

    const action = button.dataset.action;

    if(action === "new-schedule"){
        setMode("create");
    }else if(action === "show-dashboard"){
        history.replaceState(null, "", location.pathname);
        setMode("dashboard");
    }else if(action === "open-schedule"){
        openSchedule(button.dataset.scheduleId);
    }else if(action === "answer-schedule"){
        openSchedule(button.dataset.scheduleId, { focusAnswer: true });
    }else if(action === "create-schedule"){
        createScheduleFromForm();
    }else if(action === "toggle-share"){
        app.shareOpen = !app.shareOpen;
        renderShareAction();
    }
}

function applyHashRoute(){
    app.guestLanding = false;
    const route = readSharePayload(location.hash);

    if(!route){
        app.mode = "dashboard";
        return;
    }

    const existing = app.state.schedules.find(schedule => schedule.id === route.scheduleId);

    if(existing){
        app.state.activeScheduleId = existing.id;
        if(route.type === "payload" && existing.ownerUserId !== app.state.currentUserId){
            app.state.activeParticipantId = ensureLocalGuestParticipant(existing, app.state.currentUserId);
            app.guestLanding = true;
            queueSave();
        }else{
            ensureActiveParticipant();
        }
        app.mode = "detail";
        app.shareOpen = false;
        return;
    }

    if(route.type === "payload"){
        importGuestSchedule(route.data);
        app.mode = "detail";
        app.shareOpen = false;
        app.guestLanding = true;
        return;
    }

    app.mode = "dashboard";
}

function importGuestSchedule(payload){
    const imported = createScheduleFromSharePayload(payload, app.state.currentUserId);

    app.state.schedules.unshift(imported.schedule);
    app.state.activeScheduleId = imported.schedule.id;
    app.state.activeParticipantId = imported.activeParticipantId;
    queueSave();
}

function setMode(mode){
    app.mode = mode;
    app.shareOpen = false;
    renderShell();
    renderMode();
}

function openSchedule(scheduleId, options = {}){
    if(!app.state.schedules.some(schedule => schedule.id === scheduleId)){
        return;
    }

    app.state.activeScheduleId = scheduleId;
    ensureActiveParticipant();
    app.mode = "detail";
    app.shareOpen = false;
    history.replaceState(null, "", `${location.pathname}#${encodeURIComponent(scheduleId)}`);
    renderShell();
    renderMode();

    if(options.focusAnswer){
        elements.answerPanel.scrollIntoView({ block: "start" });
    }
}

function setDashboardFilter(filter){
    app.dashboardFilter = filter;
    elements.dashboardFilters.forEach(button => {
        const active = button.dataset.dashboardFilter === filter;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    renderDashboard();
}

function renderShell(){
    metrics.render += 1;
    elements.saveState.dataset.status = app.state.save.status;
    elements.saveState.textContent = saveLabel(app.state.save.status);
    elements.scheduleTitle.textContent = app.mode === "dashboard" ? "卓調整" : "RELMUA Schedule";
}

function renderMode(){
    elements.dashboardView.hidden = app.mode !== "dashboard";
    elements.createView.hidden = app.mode !== "create";
    elements.detailView.hidden = app.mode !== "detail";

    if(app.mode === "create"){
        renderCreateView();
    }else if(app.mode === "detail"){
        renderDetailView();
    }else{
        renderDashboard();
    }
}

function renderDashboard(){
    metrics.dashboardRender += 1;
    const summaries = getDashboardSummaries();
    const visible = summaries
        .filter(summary => dashboardFilterMatches(summary))
        .sort((a, b) => a.action.priority - b.action.priority || compareTime(b.updatedAt, a.updatedAt));
    const actionCount = summaries.filter(summary => summary.action.priority === 1).length;
    const fragment = document.createDocumentFragment();

    elements.dashboardLead.textContent = actionCount > 0
        ? `${actionCount}件、いま対応できます。`
        : `${summaries.length}件の日程調整があります。`;

    if(visible.length === 0){
        elements.scheduleList.replaceChildren(createEmpty("表示できる日程調整はありません"));
        return;
    }

    visible.forEach(summary => {
        fragment.append(createDashboardRow(summary));
    });
    elements.scheduleList.replaceChildren(fragment);
}

function renderCreateView(){
    syncCreateDefaults();
}

function renderDetailView(){
    metrics.detailRender += 1;
    const schedule = getActiveSchedule();
    const participant = getActiveParticipant();
    const slots = getSlots(schedule);
    const summary = deriveScheduleSummary(schedule, participant.id, slots);
    const isOwner = summary.isOwner;

    elements.detailTitle.textContent = schedule.title;
    elements.detailAction.textContent = summary.action.label;
    elements.detailView.classList.toggle("is-action-answer", summary.action.key === "needs_response");
    elements.detailView.classList.toggle("is-guest", !isOwner);
    elements.ownerOverview.hidden = !isOwner;
    elements.guestIntro.hidden = isOwner;
    syncEditForm(schedule);
    renderShareAction();
    renderAnswerView(schedule, participant, slots);
    renderParticipants();

    if(isOwner){
        renderResultsView();
    }else{
        clearOwnerOnlyResults();
    }

    if(app.guestLanding){
        app.guestLanding = false;
        window.requestAnimationFrame(() => {
            elements.answerPanel.scrollIntoView({ block: "start" });
            if(!elements.guestNameInput.value || elements.guestNameInput.value === "ゲスト"){
                elements.guestNameInput.focus();
                elements.guestNameInput.select();
            }
        });
    }
}

function renderAnswerView(schedule = getActiveSchedule(), participant = getActiveParticipant(), slots = getSlots(schedule)){
    metrics.answerRender += 1;
    const fragment = document.createDocumentFragment();
    const completeness = getResponseCompleteness(slots, participant.id, schedule.responses);
    const visibleSlots = app.showOnlyUnanswered
        ? slots.filter(slot => getAnswer(schedule, participant.id, slot.id) === "unknown")
        : slots;

    elements.guestNameInput.value = participant.displayName;
    elements.unansweredOnly.checked = app.showOnlyUnanswered;
    renderAnswerCompleteState(completeness);

    if(visibleSlots.length === 0){
        elements.answerList.replaceChildren(createEmpty("未回答はありません"));
        return;
    }

    visibleSlots.forEach(slot => {
        fragment.append(createAnswerRow(schedule, participant, slot));
    });
    elements.answerList.replaceChildren(fragment);
}

function renderAnswerCompleteState(completeness){
    if(completeness.complete && app.state.save.status === "saved"){
        elements.answerCompleteState.textContent = "回答完了・保存済み";
        elements.answerCompleteState.dataset.status = "complete";
    }else if(completeness.complete){
        elements.answerCompleteState.textContent = "回答完了";
        elements.answerCompleteState.dataset.status = "complete";
    }else if(completeness.answered > 0){
        elements.answerCompleteState.textContent = `回答中 あと${completeness.remaining}`;
        elements.answerCompleteState.dataset.status = "dirty";
    }else{
        elements.answerCompleteState.textContent = "未回答";
        elements.answerCompleteState.dataset.status = "empty";
    }
}

function renderResultsView(){
    metrics.resultsRender += 1;
    const schedule = getActiveSchedule();
    const slots = getSlots(schedule);
    const summaries = ensureSummaries(schedule);
    const unanswered = findUnansweredParticipants(slots, schedule.participants, schedule.responses);
    const answeredParticipants = schedule.participants.length - unanswered.length;

    elements.responseStatus.textContent = `${answeredParticipants} / ${schedule.participants.length}人`;
    elements.resultsLead.textContent = summaries.length > 0
        ? `おすすめ上位${Math.min(3, summaries.length)}件を表示しています。`
        : "候補日がありません。";
    renderRecommended(schedule, summaries);
    renderUnanswered(unanswered);
    renderDetailsTable(summaries);
}

function clearOwnerOnlyResults(){
    elements.recommendedList.replaceChildren();
    elements.detailsTable.replaceChildren();
    elements.planList.replaceChildren();
}

function renderShareAction(){
    const schedule = getActiveSchedule();

    elements.detailView.classList.toggle("is-share-open", app.shareOpen);
    elements.sharePanel.hidden = !app.shareOpen;
    elements.toggleShareButton.textContent = app.shareOpen ? "閉じる" : "共有";
    elements.shareUrl.textContent = createPublicUrl(location.pathname, schedule);
    elements.shareText.textContent = createInviteText({ schedule }, getSlots(schedule));
}

function renderParticipants(){
    const schedule = getActiveSchedule();
    const fragment = document.createDocumentFragment();

    schedule.participants.forEach(participant => {
        const row = document.createElement("div");
        row.className = "participant-row";
        row.dataset.participantId = participant.id;

        const name = document.createElement("strong");
        name.textContent = participant.displayName;
        const role = document.createElement("span");
        role.textContent = participant.role === "owner" ? "主催" : "参加";
        const switcher = document.createElement("button");
        switcher.type = "button";
        switcher.dataset.action = "switch-participant";
        switcher.textContent = app.state.activeParticipantId === participant.id ? "回答中" : "回答";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.action = "remove-participant";
        remove.textContent = "削除";
        remove.disabled = schedule.participants.length <= 1;

        row.append(name, role, switcher, remove);
        fragment.append(row);
    });

    elements.participantList.replaceChildren(fragment);
}

function renderRecommended(schedule, summaries){
    const fragment = document.createDocumentFragment();

    summaries.slice(0, 3).forEach((summary, index) => {
        const item = document.createElement("article");
        item.className = "recommend-row";
        item.dataset.slotId = summary.slot.id;
        item.classList.toggle("is-confirmed", schedule.confirmedSlotId === summary.slot.id);

        const rank = document.createElement("strong");
        rank.textContent = `${index + 1}位`;
        const body = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = formatSlot(summary.slot);
        const meta = document.createElement("p");
        meta.textContent = `○${summary.counts.yes} △${summary.counts.maybe} ×${summary.counts.no} 未${summary.counts.unknown}`;
        body.append(title, meta);
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.action = "confirm-slot";
        button.dataset.slotId = summary.slot.id;
        button.textContent = schedule.confirmedSlotId === summary.slot.id ? "確定済" : "確定";

        item.append(rank, body, button);
        fragment.append(item);
    });

    elements.recommendedList.replaceChildren(fragment);
}

function renderUnanswered(unanswered){
    elements.unansweredList.textContent = unanswered.length > 0
        ? unanswered.map(item => item.displayName).join("、")
        : "なし";
}

function renderDetailsTable(summaries){
    const table = document.createElement("table");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["候補日", "○", "△", "×", "未"].forEach(label => {
        const th = document.createElement("th");
        th.textContent = label;
        headRow.append(th);
    });
    head.append(headRow);

    const body = document.createElement("tbody");
    summaries.forEach(summary => {
        const row = document.createElement("tr");
        [formatSlot(summary.slot), summary.counts.yes, summary.counts.maybe, summary.counts.no, summary.counts.unknown]
            .forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = String(value);
                row.append(cell);
            });
        body.append(row);
    });

    table.append(head, body);
    elements.detailsTable.replaceChildren(table);
}

function renderPlans(){
    const schedule = getActiveSchedule();
    const cache = getCache(schedule);
    const summaries = ensureSummaries(schedule);
    metrics.planGeneration += 1;
    cache.plans = buildCompletionPlans(summaries, {
        totalMinutes: schedule.totalMinutes,
        sessionMinutes: schedule.sessionMinutes
    });
    const fragment = document.createDocumentFragment();

    if(cache.plans.length === 0){
        elements.planList.replaceChildren(createEmpty("日程案はまだ作れません"));
        return;
    }

    cache.plans.forEach(plan => {
        const item = document.createElement("article");
        item.className = "plan-row";
        const title = document.createElement("h3");
        title.textContent = `${plan.label} ${plan.score}点`;
        const list = document.createElement("p");
        list.textContent = plan.items.map(formatSlot).join(" / ");
        item.append(title, list);
        fragment.append(item);
    });

    elements.planList.replaceChildren(fragment);
}

function createDashboardRow(summary){
    const row = document.createElement("article");
    row.className = "schedule-row";
    row.dataset.status = summary.action.key;

    const body = document.createElement("button");
    body.type = "button";
    body.className = "schedule-row-main";
    body.dataset.action = summary.action.key === "needs_response" ? "answer-schedule" : "open-schedule";
    body.dataset.scheduleId = summary.scheduleId;

    const title = document.createElement("strong");
    title.textContent = summary.title;
    const meta = document.createElement("span");
    meta.textContent = summary.action.label;
    body.append(title, meta);

    const count = document.createElement("span");
    count.className = "schedule-row-count";
    count.textContent = `${summary.answeredParticipants}/${summary.participantCount}`;
    const role = document.createElement("span");
    role.className = "schedule-row-role";
    role.textContent = summary.isOwner ? "主催" : "参加";

    row.append(body, count, role);
    return row;
}

function createAnswerRow(schedule, participant, slot){
    const row = document.createElement("article");
    row.className = "answer-row";
    row.dataset.slotId = slot.id;
    const current = getAnswer(schedule, participant.id, slot.id);

    const label = document.createElement("div");
    label.className = "answer-date";
    const title = document.createElement("strong");
    title.textContent = formatSlot(slot);
    const status = document.createElement("span");
    status.textContent = `現在 ${answerLabel(current)}`;
    label.append(title, status);

    const buttons = document.createElement("div");
    buttons.className = "answer-buttons";
    [
        ["yes", "○"],
        ["maybe", "△"],
        ["no", "×"]
    ].forEach(([answer, text]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.action = "answer";
        button.dataset.answer = answer;
        button.dataset.slotId = slot.id;
        button.className = "answer-button";
        button.classList.toggle("is-active", current === answer);
        button.setAttribute("aria-label", `${formatSlot(slot)}を${text}にする`);
        button.textContent = text;
        buttons.append(button);
    });

    const detail = document.createElement("details");
    detail.className = "detail-time";
    detail.open = app.activeDetailSlotId === slot.id;
    const summary = document.createElement("summary");
    summary.textContent = current === "maybe" ? "条件" : "時間";
    detail.append(summary);
    if(detail.open){
        detail.append(createDetailRange(schedule, participant, slot));
    }

    row.append(label, buttons, detail);
    return row;
}

function createDetailRange(schedule, participant, slot){
    const range = document.createElement("div");
    range.className = "detail-range";
    const response = schedule.responses[participant.id]?.[slot.id];
    const selectedRange = response?.ranges?.[0] ?? {
        startMinute: slot.startMinute,
        endMinute: slot.endMinute
    };
    const startSelect = createMinuteSelect(slot, selectedRange.startMinute, "detail-start");
    const endSelect = createMinuteSelect(slot, selectedRange.endMinute, "detail-end");
    const saveRange = document.createElement("button");
    saveRange.type = "button";
    saveRange.dataset.action = "detail-save";
    saveRange.dataset.slotId = slot.id;
    saveRange.textContent = "指定";
    range.append(startSelect, endSelect, saveRange);
    return range;
}

function handleAnswerClick(event){
    const button = event.target.closest("button[data-action]");

    if(!button){
        return;
    }

    if(button.dataset.action === "answer"){
        setAnswer(getActiveSchedule(), getActiveParticipant().id, button.dataset.slotId, button.dataset.answer);
        updateAnswerRow(button.dataset.slotId);
        updateDashboardDirty();
        queueSave();
        return;
    }

    if(button.dataset.action === "detail-save"){
        saveDetailRange(button);
    }
}

function handleDetailToggle(event){
    const detail = event.target.closest("details.detail-time");
    const row = event.target.closest("[data-slot-id]");

    if(!detail || !row){
        return;
    }

    const previousSlotId = app.activeDetailSlotId;
    const nextSlotId = detail.open ? row.dataset.slotId : "";

    if(detail.open && previousSlotId && previousSlotId !== nextSlotId){
        app.activeDetailSlotId = "";
        updateAnswerRow(previousSlotId);
    }

    app.activeDetailSlotId = nextSlotId;

    if(detail.open){
        if(!detail.querySelector(".detail-range")){
            const schedule = getActiveSchedule();
            const slot = getSlots(schedule).find(item => item.id === row.dataset.slotId);
            if(slot){
                detail.append(createDetailRange(schedule, getActiveParticipant(), slot));
            }
        }
        return;
    }

    detail.querySelector(".detail-range")?.remove();
}

function handleBulkAnswer(){
    const [scope, answer] = elements.quickBulk.value.split(":");

    if(!scope || !answer){
        return;
    }

    const schedule = getActiveSchedule();
    const participant = getActiveParticipant();
    const slots = getSlots(schedule);
    const targets = slots.filter(slot => {
        return matchesBulkScope(schedule, scope, slot, participant.id) &&
            (!app.showOnlyUnanswered || getAnswer(schedule, participant.id, slot.id) === "unknown");
    });

    targets.forEach(slot => setAnswer(schedule, participant.id, slot.id, answer, {
        render: false
    }));
    elements.quickBulk.value = "";
    renderAnswerView();
    refreshDetailAction(schedule, participant, slots);
    updateDashboardDirty();
    queueSave();
}

function handleResultsClick(event){
    const button = event.target.closest("button[data-action='confirm-slot']");

    if(!button){
        return;
    }

    const schedule = getActiveSchedule();
    schedule.confirmedSlotId = button.dataset.slotId;
    schedule.status = "confirmed";
    schedule.updatedAt = new Date().toISOString();
    markDirty(schedule, ["dashboard"]);
    renderRecommended(schedule, ensureSummaries(schedule));
    refreshDetailAction(schedule, getActiveParticipant(), getSlots(schedule));
    updateDashboardDirty();
    queueSave();
}

function handleParticipantClick(event){
    const button = event.target.closest("button[data-action]");
    const row = event.target.closest("[data-participant-id]");

    if(!button || !row){
        return;
    }

    const schedule = getActiveSchedule();

    if(button.dataset.action === "switch-participant"){
        app.state.activeParticipantId = row.dataset.participantId;
        updateDashboardDirty();
        renderDetailView();
        queueSave();
        return;
    }

    if(button.dataset.action !== "remove-participant" || schedule.participants.length <= 1){
        return;
    }

    schedule.participants = schedule.participants.filter(item => item.id !== row.dataset.participantId);
    delete schedule.responses[row.dataset.participantId];
    if(app.state.activeParticipantId === row.dataset.participantId){
        app.state.activeParticipantId = schedule.participants[0]?.id ?? "";
    }
    schedule.updatedAt = new Date().toISOString();
    markDirty(schedule, ["summaries", "dashboard", "plans"]);
    renderDetailView();
    queueSave();
}

function addParticipant(){
    const name = elements.participantNameInput.value.trim().slice(0, 40);

    if(!name){
        return;
    }

    const schedule = getActiveSchedule();
    schedule.participants.push({
        id: createId("participant"),
        userId: "",
        displayName: name,
        role: "participant",
        required: false
    });
    elements.participantNameInput.value = "";
    schedule.updatedAt = new Date().toISOString();
    markDirty(schedule, ["summaries", "dashboard", "plans"]);
    renderDetailView();
    queueSave();
}

function createScheduleFromForm(){
    const [startMinute, endMinute] = elements.createTimePresetInput.value.split("-").map(Number);
    const schedule = createScheduleRecord({
        title: elements.createTitleInput.value.trim() || "日程調整",
        startDate: elements.createStartDateInput.value,
        endDate: elements.createEndDateInput.value,
        startMinute,
        endMinute
    });

    app.state.schedules.unshift(schedule);
    app.state.activeScheduleId = schedule.id;
    app.state.activeParticipantId = schedule.participants[0].id;
    updateDashboardDirty();
    queueSave();
    openSchedule(schedule.id);
    app.shareOpen = true;
    renderShareAction();
}

function updateScheduleSettings(){
    const schedule = getActiveSchedule();
    const nextTitle = elements.editTitleInput.value.trim().slice(0, 80) || "日程調整";
    const nextStartDate = elements.editStartDateInput.value || schedule.startDate;
    const nextEndDate = elements.editEndDateInput.value || schedule.endDate;
    const [startMinute, endMinute] = elements.editTimePresetInput.value.split("-").map(Number);
    const slotsChanged = schedule.startDate !== nextStartDate ||
        schedule.endDate !== nextEndDate ||
        schedule.startMinute !== startMinute ||
        schedule.endMinute !== endMinute;

    schedule.title = nextTitle;
    schedule.startDate = nextStartDate;
    schedule.endDate = nextEndDate;
    schedule.startMinute = startMinute;
    schedule.endMinute = endMinute;
    schedule.updatedAt = new Date().toISOString();
    markDirty(schedule, slotsChanged ? ["slots", "summaries", "dashboard", "plans"] : ["dashboard"]);
    renderDetailView();
    queueSave();
}

function updateScheduleTitleInline(){
    const schedule = getActiveSchedule();

    schedule.title = elements.editTitleInput.value.trim().slice(0, 80) || "日程調整";
    schedule.updatedAt = new Date().toISOString();
    markDirty(schedule, ["dashboard"]);
    elements.detailTitle.textContent = schedule.title;
    if(app.shareOpen){
        renderShareAction();
    }
    queueSave();
}

function updateActiveParticipantName(){
    const schedule = getActiveSchedule();
    const participant = getActiveParticipant();
    participant.displayName = elements.guestNameInput.value.trim().slice(0, 40) || "Guest";
    schedule.updatedAt = new Date().toISOString();
    markDirty(schedule, ["summaries", "dashboard", "plans"]);
    renderShell();
    renderAnswerCompleteState(getResponseCompleteness(getSlots(schedule), participant.id, schedule.responses));
    queueSave();
}

function saveDetailRange(button){
    const row = button.closest("[data-slot-id]");
    const schedule = getActiveSchedule();
    const participant = getActiveParticipant();
    const slotId = button.dataset.slotId;
    const startMinute = Number(row?.querySelector("[data-detail-start]")?.value);
    const endMinute = Number(row?.querySelector("[data-detail-end]")?.value);

    if(!Number.isFinite(startMinute) || !Number.isFinite(endMinute) || endMinute <= startMinute){
        return;
    }

    schedule.responses[participant.id] ??= {};
    schedule.responses[participant.id][slotId] ??= {
        answer: "maybe",
        ranges: []
    };
    schedule.responses[participant.id][slotId].ranges = [{
        startMinute,
        endMinute
    }];
    app.activeDetailSlotId = slotId;
    schedule.updatedAt = new Date().toISOString();
    markDirty(schedule, ["summaries", "dashboard", "plans"]);
    updateDashboardDirty();
    queueSave();
    updateAnswerRow(slotId);
}

function copyShareText(){
    const write = navigator.clipboard?.writeText?.(elements.shareText.textContent);

    if(!write){
        setSavedMessage("コピーできませんでした");
        return;
    }

    write.then(
        () => setSavedMessage("コピーしました"),
        () => setSavedMessage("コピーできませんでした")
    );
}

function resetSchedules(){
    storage.clear();
    app.state = createInitialState();
    app.caches.clear();
    history.replaceState(null, "", location.pathname);
    syncCreateDefaults();
    setMode("dashboard");
    queueSave();
}

function setAnswer(schedule, participantId, slotId, answer, options = {}){
    schedule.responses[participantId] ??= {};
    schedule.responses[participantId][slotId] = {
        answer,
        note: schedule.responses[participantId][slotId]?.note ?? "",
        ranges: schedule.responses[participantId][slotId]?.ranges ?? []
    };
    schedule.updatedAt = new Date().toISOString();
    markDirty(schedule, ["summaries", "dashboard", "plans"]);
    setSaveStatus(app.state, "dirty");

    if(options.render !== false){
        renderShell();
    }
}

function updateAnswerRow(slotId){
    const schedule = getActiveSchedule();
    const participant = getActiveParticipant();
    const slot = getSlots(schedule).find(item => item.id === slotId);
    const existing = Array.from(elements.answerList.querySelectorAll("[data-slot-id]"))
        .find(row => row.dataset.slotId === slotId);

    if(!slot || !existing){
        return;
    }

    existing.replaceWith(createAnswerRow(schedule, participant, slot));
    renderAnswerCompleteState(getResponseCompleteness(getSlots(schedule), participant.id, schedule.responses));
    refreshDetailAction(schedule, participant, getSlots(schedule));
}

function refreshDetailAction(schedule = getActiveSchedule(), participant = getActiveParticipant(), slots = getSlots(schedule)){
    const summary = deriveScheduleSummary(schedule, participant.id, slots);

    elements.detailAction.textContent = summary.action.label;
    elements.detailView.classList.toggle("is-action-answer", summary.action.key === "needs_response");
}

function getDashboardSummaries(){
    return app.state.schedules.map(schedule => {
        const cache = getCache(schedule);
        const participant = resolveParticipantForSchedule(schedule);

        if(schedule.dirty.dashboard || !cache.dashboardSummary){
            metrics.dashboardSummaryGeneration += 1;
            cache.dashboardSummary = deriveScheduleSummary(schedule, participant?.id, getSlots(schedule));
            markClean(schedule, ["dashboard"]);
        }

        return cache.dashboardSummary;
    });
}

function dashboardFilterMatches(summary){
    if(app.dashboardFilter === "action"){
        return summary.action.priority === 1;
    }

    if(app.dashboardFilter === "active"){
        return summary.status !== "confirmed";
    }

    if(app.dashboardFilter === "confirmed"){
        return summary.status === "confirmed";
    }

    return true;
}

function getSlots(schedule){
    const cache = getCache(schedule);

    if(schedule.dirty.slots){
        metrics.candidateGeneration += 1;
        cache.slots = createSlots(schedule);
        markClean(schedule, ["slots"]);
        markDirty(schedule, ["summaries", "dashboard", "plans"]);
    }

    return cache.slots;
}

function ensureSummaries(schedule){
    const cache = getCache(schedule);

    if(schedule.dirty.summaries){
        metrics.summaryGeneration += 1;
        cache.summaries = summarizeResponses(getSlots(schedule), schedule.participants, schedule.responses);
        markClean(schedule, ["summaries"]);
    }

    return cache.summaries;
}

function getCache(schedule){
    if(!app.caches.has(schedule.id)){
        app.caches.set(schedule.id, {
            slots: [],
            summaries: [],
            dashboardSummary: null,
            plans: []
        });
    }

    return app.caches.get(schedule.id);
}

function queueSave(){
    setSaveStatus(app.state, "saving");
    renderShell();
    window.clearTimeout(app.saveTimer);
    app.saveTimer = window.setTimeout(() => {
        const result = storage.save(app.state);
        setSaveStatus(app.state, result.ok ? "saved" : "error", result.message);
        renderShell();
        if(app.mode === "detail"){
            renderAnswerCompleteState(getResponseCompleteness(
                getSlots(getActiveSchedule()),
                getActiveParticipant().id,
                getActiveSchedule().responses
            ));
        }
    }, 160);
}

function setSavedMessage(message){
    setSaveStatus(app.state, "saved", message);
    renderShell();
}

function updateDashboardDirty(schedule = getActiveSchedule()){
    markDirty(schedule, ["dashboard"]);
}

function ensureActiveSchedule(){
    if(!app.state.schedules.some(schedule => schedule.id === app.state.activeScheduleId)){
        app.state.activeScheduleId = app.state.schedules[0]?.id ?? "";
    }
    ensureActiveParticipant();
}

function ensureActiveParticipant(){
    const schedule = getActiveSchedule();

    if(!schedule){
        return;
    }

    if(!schedule.participants.some(item => item.id === app.state.activeParticipantId)){
        app.state.activeParticipantId = resolveParticipantForSchedule(schedule)?.id ?? schedule.participants[0]?.id ?? "";
    }
}

function getActiveSchedule(){
    return app.state.schedules.find(schedule => schedule.id === app.state.activeScheduleId) ?? app.state.schedules[0];
}

function getActiveParticipant(){
    ensureActiveParticipant();
    const schedule = getActiveSchedule();
    return schedule.participants.find(item => item.id === app.state.activeParticipantId) ?? schedule.participants[0];
}

function resolveParticipantForSchedule(schedule){
    return schedule.participants.find(participant => participant.id === app.state.activeParticipantId) ??
        schedule.participants.find(participant => participant.userId === app.state.currentUserId) ??
        schedule.participants[0] ??
        null;
}

function syncCreateDefaults(){
    const draft = createScheduleRecord({
        title: "千景卓 日程調整"
    });
    elements.createTitleInput.value = draft.title;
    elements.createStartDateInput.value = draft.startDate;
    elements.createEndDateInput.value = draft.endDate;
    elements.createTimePresetInput.value = `${draft.startMinute}-${draft.endMinute}`;
}

function syncEditForm(schedule){
    elements.editTitleInput.value = schedule.title;
    elements.editStartDateInput.value = schedule.startDate;
    elements.editEndDateInput.value = schedule.endDate;
    elements.editTimePresetInput.value = `${schedule.startMinute}-${schedule.endMinute}`;
}

function getAnswer(schedule, participantId, slotId){
    return schedule.responses[participantId]?.[slotId]?.answer ?? "unknown";
}

function saveLabel(status){
    return {
        dirty: "未保存",
        saving: "保存中",
        saved: app.state.save.message || "保存済み",
        error: app.state.save.message || "保存失敗"
    }[status] ?? "保存済み";
}

function createEmpty(message){
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = message;
    return empty;
}

function createMinuteSelect(slot, selected, dataName){
    const select = document.createElement("select");
    select.setAttribute(`data-${dataName}`, "true");

    for(let minute = slot.startMinute; minute <= slot.endMinute; minute += 30){
        const option = document.createElement("option");
        option.value = String(minute);
        option.textContent = formatMinute(minute);
        option.selected = minute === selected;
        select.append(option);
    }

    return select;
}

function matchesBulkScope(schedule, scope, slot, participantId){
    if(scope === "all"){
        return true;
    }

    if(scope === "unanswered"){
        return getAnswer(schedule, participantId, slot.id) === "unknown";
    }

    const day = new Date(`${slot.date}T00:00:00`).getDay();

    if(scope === "weekday"){
        return day >= 1 && day <= 5;
    }

    if(scope === "weekend"){
        return day === 0 || day === 6;
    }

    return false;
}

function compareTime(left, right){
    return Date.parse(left || "") - Date.parse(right || "");
}
