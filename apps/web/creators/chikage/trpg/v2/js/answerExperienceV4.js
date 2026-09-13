const root = document.querySelector("[data-trpg-v2-app]");

let responseState = "idle";
let responseError = "";
let bulkConfirmation = "";
let unansweredOnly = false;
let renderQueued = false;
let observer = null;
let activeQueuedAnswer = null;
const pendingAnswers = [];
const optimisticAnswers = new Map();

if(root){
    document.body.classList.add("scheduler-answer-v4");
    document.body.classList.toggle("scheduler-vnext-answer-route", isJoinRoute());

    window.addEventListener("relmua:scheduler-response-state", event => {
        responseState = String(event?.detail?.state ?? "idle");
        responseError = String(event?.detail?.message ?? "");
        bulkConfirmation = "";

        if(responseState === "saved" || responseState === "error"){
            finishQueuedAnswer(responseState === "saved");
        }

        enhanceAnswerExperience();
        if(responseState !== "saving"){
            queueMicrotask(pumpAnswerQueue);
        }
    });

    root.addEventListener("click", interceptAnswer, true);
    observer = new MutationObserver(queueEnhance);
    observeRoot();
    enhanceAnswerExperience();
}

function observeRoot(){
    observer?.observe(root, { childList: true, subtree: true });
}

function queueEnhance(){
    if(renderQueued) return;
    renderQueued = true;
    queueMicrotask(() => {
        renderQueued = false;
        enhanceAnswerExperience();
    });
}

function enhanceAnswerExperience(){
    if(!root) return;
    observer?.disconnect();
    try{
        const joinRoute = isJoinRoute();
        document.body.classList.toggle("scheduler-vnext-answer-route", joinRoute);
        enhanceJoinLanding(joinRoute);
        enhanceDetailSections(joinRoute);
        enhanceScheduleToolbar(joinRoute);
        enhanceVoteEditor();
        enhanceScheduleTable();
    }finally{
        observeRoot();
    }
}

function isJoinRoute(){
    return /^#\/join\/[A-Za-z0-9_-]{16,}$/.test(location.hash)
        || new URL(location.href).searchParams.has("invite");
}

function enhanceJoinLanding(joinRoute){
    if(!joinRoute) return;
    const section = findSectionByLabel("JOIN SESSION");
    if(!section) return;
    section.classList.add("vnext-answer-join", "v4-answer-join");

    const label = section.querySelector(":scope > .v2-row-label");
    if(label) label.textContent = "ANSWER / 日程回答";
    const copy = section.querySelector(".v2-app-copy");
    if(copy) copy.textContent = "名前を入れたら、候補日時へ ○・△・× を付けるだけ。登録なしでも回答できます。";

    const guestForm = Array.from(section.querySelectorAll("form")).find(form => form.querySelector('[name="displayName"]'));
    const summary = section.querySelector(".v2-session-summary");
    if(guestForm){
        guestForm.classList.add("vnext-answer-guest-form");
        const guestLabel = guestForm.querySelector("label > span");
        const submit = guestForm.querySelector('button[type="submit"]');
        if(guestLabel) guestLabel.textContent = "表示名";
        if(submit){
            submit.textContent = "名前を入れて回答する";
            submit.classList.add("v2-command--primary");
        }
        if(summary && guestForm.previousElementSibling !== summary) summary.after(guestForm);
    }

    const accountButton = Array.from(section.querySelectorAll("button")).find(button => /Discord.*参加|Discordで回答/.test(button.textContent ?? ""));
    if(accountButton){
        accountButton.textContent = "Discordで回答する";
        accountButton.classList.remove("v2-command--primary");
        accountButton.classList.add("vnext-answer-account-button");
        if(!section.querySelector(".vnext-answer-join-or")){
            const separator = document.createElement("p");
            separator.className = "vnext-answer-join-or";
            separator.textContent = "アカウントを使う場合";
            accountButton.before(separator);
        }
    }
}

function enhanceDetailSections(joinRoute){
    if(!joinRoute){
        root.querySelectorAll(".vnext-answer-hidden").forEach(node => node.classList.remove("vnext-answer-hidden"));
        return;
    }
    const keepLabels = new Set(["SESSION DETAIL", "SCHEDULE"]);
    Array.from(root.children).filter(node => node instanceof HTMLElement).forEach(section => {
        const label = section.querySelector(":scope > .v2-row-label");
        const raw = String(label?.textContent ?? "").trim();
        const keep = keepLabels.has(raw) || raw.startsWith("ANSWER /") || raw.startsWith("CANDIDATES /");
        section.classList.toggle("vnext-answer-hidden", !keep);
        if(raw === "SESSION DETAIL"){
            label.textContent = "ANSWER / 日程回答";
            section.classList.add("vnext-answer-detail-head");
        }
        if(raw === "SCHEDULE"){
            label.textContent = "CANDIDATES / 候補日時";
            section.classList.add("vnext-answer-section");
        }
    });
    root.querySelectorAll(".vnext-answer-section .v2-round-summary").forEach(node => node.classList.add("vnext-answer-round-summary"));
}

function enhanceScheduleToolbar(joinRoute){
    const toolbar = root.querySelector(".v2-schedule-toolbar");
    if(!toolbar) return;
    const heading = toolbar.querySelector("strong");
    const copy = toolbar.querySelector("small");
    const button = toolbar.querySelector("button");

    if(button?.textContent?.includes("投票する")){
        button.textContent = "回答を編集";
        if(heading) heading.textContent = "みんなの回答";
        if(copy) copy.textContent = "参加者ごとの回答を一覧で確認できます";
    }else if(button?.textContent?.includes("投票を終える")){
        button.textContent = "回答表を見る";
        if(heading) heading.textContent = joinRoute ? "あなたの回答" : "○ △ × を入力";
        if(copy) copy.textContent = "押した回答は自動保存。続けて次の日も入力できます";
    }
}

function enhanceVoteEditor(){
    const editor = root.querySelector(".v2-vote-editor");
    if(!editor) return;
    editor.classList.add("vnext-answer-editor", "v4-answer-editor");
    const cards = Array.from(editor.querySelectorAll(":scope > .v2-slot-card"));
    cards.forEach((card, index) => enhanceSlotCard(card, index));

    let controls = editor.querySelector(":scope > .v4-answer-controls");
    if(!controls){
        controls = createAnswerControls();
        editor.prepend(controls);
    }
    updateAnswerControls(controls, cards);
    applyAnswerFilter(cards);
}

function createAnswerControls(){
    const controls = document.createElement("section");
    controls.className = "vnext-answer-controls v4-answer-controls";
    controls.setAttribute("aria-label", "回答の進み具合とクイック操作");

    const progress = document.createElement("div");
    progress.className = "vnext-answer-progress v4-answer-progress";

    const quick = document.createElement("div");
    quick.className = "v4-answer-quick";

    const next = document.createElement("button");
    next.type = "button";
    next.className = "v4-answer-next";
    next.textContent = "次の未回答へ";
    next.addEventListener("click", focusNextUnanswered);

    const filter = document.createElement("button");
    filter.type = "button";
    filter.className = "v4-answer-filter";
    filter.addEventListener("click", () => {
        unansweredOnly = !unansweredOnly;
        enhanceVoteEditor();
    });

    quick.append(next, filter);

    const bulk = document.createElement("div");
    bulk.className = "vnext-answer-bulk";
    bulk.setAttribute("aria-label", "すべての候補へ同じ回答を付ける");
    [["yes", "全部○"], ["maybe", "全部△"], ["no", "全部×"]].forEach(([answer, label]) => {
        const button = document.createElement("button");
        button.className = `vnext-answer-bulk__button is-${answer}`;
        button.type = "button";
        button.dataset.answer = answer;
        button.textContent = label;
        button.addEventListener("click", () => requestBulkAnswer(answer));
        bulk.appendChild(button);
    });

    const confirmation = document.createElement("div");
    confirmation.className = "vnext-answer-bulk-confirm";
    confirmation.hidden = true;
    controls.append(progress, quick, bulk, confirmation);
    return controls;
}

function updateAnswerControls(controls, cards){
    const answered = cards.filter(card => card.classList.contains("is-answered")).length;
    const total = cards.length;
    const remaining = Math.max(0, total - answered);
    const progress = controls.querySelector(".v4-answer-progress");
    if(progress){
        progress.replaceChildren();
        const text = document.createElement("div");
        const strong = document.createElement("strong");
        const small = document.createElement("small");
        strong.textContent = `回答 ${answered} / ${total}`;
        small.textContent = remaining ? `あと ${remaining}件` : "すべて回答済み";
        text.append(strong, small);
        const state = document.createElement("span");
        state.className = `vnext-answer-save-state is-${responseState}`;
        state.setAttribute("role", responseState === "error" ? "alert" : "status");
        state.textContent = responseStateLabel();
        progress.append(text, state);
    }

    const filter = controls.querySelector(".v4-answer-filter");
    if(filter){
        filter.textContent = unansweredOnly ? "すべて表示" : "未回答だけ";
        filter.setAttribute("aria-pressed", String(unansweredOnly));
    }
    const next = controls.querySelector(".v4-answer-next");
    if(next) next.disabled = remaining === 0;
    controls.querySelectorAll(".vnext-answer-bulk__button").forEach(button => {
        button.disabled = responseState === "saving" || pendingAnswers.length > 0;
    });
    renderBulkConfirmation(controls);
}

function responseStateLabel(){
    const queued = pendingAnswers.length + (activeQueuedAnswer ? 1 : 0);
    if(responseState === "saving" || queued) return queued > 1 ? `保存中… ${queued}件` : "保存中…";
    if(responseState === "saved") return "✓ 保存済み";
    if(responseState === "error") return responseError ? `保存失敗: ${responseError}` : "保存できませんでした";
    return "自動保存";
}

function applyAnswerFilter(cards){
    cards.forEach(card => {
        card.hidden = unansweredOnly && card.classList.contains("is-answered");
    });
}

function focusNextUnanswered(){
    const editor = root.querySelector(".v2-vote-editor");
    const card = Array.from(editor?.querySelectorAll(":scope > .v2-slot-card") ?? []).find(item => item.classList.contains("is-unanswered"));
    if(!card) return;
    card.hidden = false;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => card.querySelector(".v2-answer")?.focus({ preventScroll: true }), 180);
}

function interceptAnswer(event){
    const button = event.target instanceof Element ? event.target.closest(".v2-answer") : null;
    if(!button || !button.closest(".v2-vote-editor")) return;
    const card = button.closest(".v2-slot-card");
    const slotIndex = Number(card?.dataset?.vnextSlotIndex);
    const symbol = button.querySelector("strong")?.textContent?.trim();
    const answer = symbol === "○" ? "yes" : symbol === "△" ? "maybe" : symbol === "×" ? "no" : "";
    if(!Number.isInteger(slotIndex) || !answer) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    queueAnswer(slotIndex, answer, card);
}

function queueAnswer(slotIndex, answer, card){
    optimisticAnswers.set(slotIndex, answer);
    applyOptimisticAnswer(card, answer);

    for(let index = pendingAnswers.length - 1; index >= 0; index -= 1){
        if(pendingAnswers[index].slotIndex === slotIndex){
            pendingAnswers.splice(index, 1);
        }
    }
    pendingAnswers.push({ slotIndex, answer });
    enhanceVoteEditor();
    pumpAnswerQueue();
}

function pumpAnswerQueue(){
    if(activeQueuedAnswer || responseState === "saving" || !pendingAnswers.length) return;
    activeQueuedAnswer = pendingAnswers.shift();
    window.dispatchEvent(new CustomEvent("relmua:scheduler-answer", { detail: activeQueuedAnswer }));
}

function finishQueuedAnswer(saved){
    if(!activeQueuedAnswer) return;
    const completed = activeQueuedAnswer;
    activeQueuedAnswer = null;
    const newer = pendingAnswers.find(item => item.slotIndex === completed.slotIndex);
    if(!newer || !saved) optimisticAnswers.delete(completed.slotIndex);
}

function applyOptimisticAnswer(card, answer){
    card.querySelectorAll(".v2-answer").forEach(button => {
        const symbol = button.querySelector("strong")?.textContent?.trim();
        const buttonAnswer = symbol === "○" ? "yes" : symbol === "△" ? "maybe" : symbol === "×" ? "no" : "";
        const selected = buttonAnswer === answer;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
    card.classList.remove("is-unanswered");
    card.classList.add("is-answered", "is-optimistic");
}

function enhanceSlotCard(card, index){
    card.dataset.vnextSlotIndex = String(index);
    card.classList.add("vnext-answer-card", "v4-answer-card");
    const optimistic = optimisticAnswers.get(index);
    if(optimistic) applyOptimisticAnswer(card, optimistic);

    const selected = card.querySelector(".v2-answer.is-selected strong")?.textContent?.trim() ?? "";
    card.classList.toggle("is-answered", Boolean(selected));
    card.classList.toggle("is-unanswered", !selected);
    if(!optimistic) card.classList.remove("is-optimistic");

    const labels = { "○": "行ける", "△": "条件つき", "×": "難しい" };
    card.querySelectorAll(".v2-answer").forEach(button => {
        const symbol = button.querySelector("strong")?.textContent?.trim();
        let label = button.querySelector(":scope > .vnext-answer-button-label");
        if(!label){
            label = document.createElement("small");
            label.className = "vnext-answer-button-label";
            button.appendChild(label);
        }
        label.textContent = button.classList.contains("is-selected") ? "選択中" : (labels[symbol] ?? "回答");
    });

    const status = card.querySelector(".v2-slot-row > div:not(.v2-answer-grid) > small");
    if(status){
        status.textContent = selected ? `あなた: ${selected}` : "未回答";
        status.classList.add("vnext-answer-card__status");
    }
    enhancePartialResponse(card);
    enhanceMemo(card);
}

function enhancePartialResponse(card){
    const partial = card.querySelector(".v2-partial-response");
    if(!partial) return;
    const hasRanges = Boolean(partial.querySelector(".v2-partial-response__ranges"));
    const small = partial.querySelector(":scope > small");
    const buttons = Array.from(partial.querySelectorAll("button"));
    if(!hasRanges){
        if(small) small.textContent = "△はそのまま保存済み。必要なときだけ参加できる時間を追加できます。";
        const open = buttons.find(button => button.textContent?.includes("時間が限られる"));
        if(open) open.textContent = "時間を指定";
        const redundant = buttons.find(button => button.textContent?.includes("予定が未確定として回答"));
        if(redundant) redundant.hidden = true;
    }else{
        if(small) small.textContent = "参加できる時間だけ指定します。回答は△のままです。";
        const save = buttons.find(button => button.textContent?.includes("この内容で回答"));
        if(save) save.textContent = "この時間で保存";
        const clear = buttons.find(button => button.textContent?.includes("未確定に戻す"));
        if(clear) clear.textContent = "時間指定を外す";
    }
}

function enhanceMemo(card){
    const form = card.querySelector(":scope > .v2-response-memo");
    if(!form || form.dataset.v4MemoEnhanced === "true") return;
    form.dataset.v4MemoEnhanced = "true";
    const textarea = form.querySelector("textarea");
    const wrapper = document.createElement("details");
    wrapper.className = "vnext-answer-memo";
    const summary = document.createElement("summary");
    summary.textContent = String(textarea?.value ?? "").trim() ? "メモを編集" : "メモを追加";
    form.before(wrapper);
    wrapper.append(summary, form);
}

function requestBulkAnswer(answer){
    const editor = root.querySelector(".v2-vote-editor");
    if(!editor || responseState === "saving" || pendingAnswers.length || activeQueuedAnswer) return;
    const hasDetailedMaybe = Boolean(editor.querySelector(".v2-partial-response__ranges"));
    if(answer !== "maybe" && hasDetailedMaybe){
        bulkConfirmation = answer;
        enhanceVoteEditor();
        return;
    }
    dispatchBulkAnswer(answer);
}

function dispatchBulkAnswer(answer){
    window.dispatchEvent(new CustomEvent("relmua:scheduler-bulk-answer", { detail: { answer } }));
}

function renderBulkConfirmation(controls){
    const confirmation = controls.querySelector(".vnext-answer-bulk-confirm");
    if(!confirmation) return;
    if(!bulkConfirmation){
        confirmation.hidden = true;
        confirmation.replaceChildren();
        return;
    }
    confirmation.hidden = false;
    confirmation.replaceChildren();
    const message = document.createElement("p");
    message.textContent = "△で指定した時間帯があります。一括変更すると時間指定は外れます。";
    const actions = document.createElement("div");
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "v2-command";
    cancel.textContent = "やめる";
    cancel.addEventListener("click", () => { bulkConfirmation = ""; enhanceVoteEditor(); });
    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "v2-command v2-command--primary";
    confirm.textContent = bulkConfirmation === "yes" ? "全部○にする" : "全部×にする";
    confirm.addEventListener("click", () => {
        const answer = bulkConfirmation;
        bulkConfirmation = "";
        dispatchBulkAnswer(answer);
    });
    actions.append(cancel, confirm);
    confirmation.append(message, actions);
}

function enhanceScheduleTable(){
    const table = root.querySelector(".v2-schedule-table");
    if(table) table.classList.add("v4-schedule-matrix");
}

function findSectionByLabel(label){
    return Array.from(root.children).find(section => {
        const rowLabel = section.querySelector?.(":scope > .v2-row-label");
        return String(rowLabel?.textContent ?? "").trim() === label;
    }) ?? null;
}
