const root = document.querySelector("[data-trpg-v2-app]");

let responseState = "idle";
let responseError = "";
let joinAutoOpened = false;
let bulkConfirmation = "";
let renderQueued = false;

if(root){
    document.body.classList.toggle("scheduler-vnext-answer-route", isJoinRoute());

    window.addEventListener("relmua:scheduler-response-state", event => {
        responseState = String(event?.detail?.state ?? "idle");
        responseError = String(event?.detail?.message ?? "");
        bulkConfirmation = "";
        enhanceAnswerExperience();
    });

    root.addEventListener("click", interceptMaybeAnswer, true);

    const observer = new MutationObserver(() => queueEnhance());
    observer.observe(root, {
        childList: true,
        subtree: true
    });

    enhanceAnswerExperience();
}

function queueEnhance(){
    if(renderQueued){
        return;
    }

    renderQueued = true;
    queueMicrotask(() => {
        renderQueued = false;
        enhanceAnswerExperience();
    });
}

function enhanceAnswerExperience(){
    if(!root){
        return;
    }

    const joinRoute = isJoinRoute();
    document.body.classList.toggle("scheduler-vnext-answer-route", joinRoute);

    enhanceJoinLanding(joinRoute);
    enhanceDetailSections(joinRoute);
    enhanceScheduleToolbar(joinRoute);
    enhanceVoteEditor();
}

function isJoinRoute(){
    return /^#\/join\/[A-Za-z0-9_-]{16,}$/.test(location.hash)
        || new URL(location.href).searchParams.has("invite");
}

function enhanceJoinLanding(joinRoute){
    if(!joinRoute){
        return;
    }

    const section = findSectionByLabel("JOIN SESSION");
    if(!section || section.dataset.vnextJoinEnhanced === "true"){
        return;
    }

    section.dataset.vnextJoinEnhanced = "true";
    section.classList.add("vnext-answer-join");

    const label = section.querySelector(":scope > .v2-row-label");
    if(label){
        label.textContent = "ANSWER / 日程回答";
    }

    const copy = section.querySelector(".v2-app-copy");
    if(copy){
        copy.textContent = "名前を入れたら、候補日時へ ○・△・× を付けるだけ。アカウント登録なしでも回答できます。";
    }

    const guestForm = Array.from(section.querySelectorAll("form")).find(form => form.querySelector('[name="displayName"]'));
    const summary = section.querySelector(".v2-session-summary");

    if(guestForm){
        guestForm.classList.add("vnext-answer-guest-form");
        const guestLabel = guestForm.querySelector("label > span");
        const submit = guestForm.querySelector('button[type="submit"]');
        if(guestLabel){
            guestLabel.textContent = "表示名";
        }
        if(submit){
            submit.textContent = "名前を入れて回答する";
            submit.classList.add("v2-command--primary");
        }
        if(summary){
            summary.after(guestForm);
        }
    }

    const accountButton = Array.from(section.querySelectorAll("button")).find(button => {
        return /Discord.*参加/.test(button.textContent ?? "");
    });

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

    const sections = Array.from(root.children).filter(node => node instanceof HTMLElement);
    const keepLabels = new Set(["SESSION DETAIL", "SCHEDULE"]);

    sections.forEach(section => {
        const label = section.querySelector(":scope > .v2-row-label");
        const rawLabel = String(label?.textContent ?? "").trim();
        const keep = keepLabels.has(rawLabel) || rawLabel.startsWith("ANSWER /") || rawLabel.startsWith("CANDIDATES /");
        section.classList.toggle("vnext-answer-hidden", !keep);

        if(rawLabel === "SESSION DETAIL"){
            label.textContent = "ANSWER / 日程回答";
            section.classList.add("vnext-answer-detail-head");
        }
        if(rawLabel === "SCHEDULE"){
            label.textContent = "CANDIDATES / 候補日時";
            section.classList.add("vnext-answer-section");
        }
    });

    root.querySelectorAll(".vnext-answer-section .v2-round-summary").forEach(node => {
        node.classList.add("vnext-answer-round-summary");
    });
}

function enhanceScheduleToolbar(joinRoute){
    const toolbar = root.querySelector(".v2-schedule-toolbar");
    if(!toolbar){
        return;
    }

    const heading = toolbar.querySelector("strong");
    const copy = toolbar.querySelector("small");
    const button = toolbar.querySelector("button");

    if(button?.textContent?.includes("投票する") && joinRoute && !joinAutoOpened){
        joinAutoOpened = true;
        button.click();
        return;
    }

    if(button?.textContent?.includes("投票する")){
        button.textContent = "自分の回答を編集";
        if(heading){
            heading.textContent = "みんなの回答";
        }
    }else if(button?.textContent?.includes("投票を終える")){
        button.textContent = "回答表を見る";
        if(heading){
            heading.textContent = "あなたの回答";
        }
        if(copy){
            copy.textContent = "○・△・×を押すと、その候補だけ保存されます";
        }
    }
}

function enhanceVoteEditor(){
    const editor = root.querySelector(".v2-vote-editor");
    if(!editor){
        return;
    }

    editor.classList.add("vnext-answer-editor");

    const cards = Array.from(editor.querySelectorAll(":scope > .v2-slot-card"));
    cards.forEach((card, index) => enhanceSlotCard(card, index));

    let controls = editor.querySelector(":scope > .vnext-answer-controls");
    if(!controls){
        controls = createAnswerControls();
        editor.prepend(controls);
    }

    updateAnswerControls(controls, cards);
}

function createAnswerControls(){
    const controls = document.createElement("section");
    controls.className = "vnext-answer-controls";
    controls.setAttribute("aria-label", "回答の進み具合と一括回答");

    const progress = document.createElement("div");
    progress.className = "vnext-answer-progress";

    const bulk = document.createElement("div");
    bulk.className = "vnext-answer-bulk";
    bulk.setAttribute("aria-label", "すべての候補へ同じ回答を付ける");

    [
        ["yes", "全部○"],
        ["maybe", "全部△"],
        ["no", "全部×"]
    ].forEach(([answer, label]) => {
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

    controls.append(progress, bulk, confirmation);
    return controls;
}

function updateAnswerControls(controls, cards){
    const answeredCount = cards.filter(card => card.querySelector(".v2-answer.is-selected")).length;
    const totalCount = cards.length;
    const remaining = Math.max(0, totalCount - answeredCount);
    const progress = controls.querySelector(".vnext-answer-progress");

    if(progress){
        progress.replaceChildren();

        const text = document.createElement("div");
        const strong = document.createElement("strong");
        const small = document.createElement("small");
        strong.textContent = `回答 ${answeredCount} / ${totalCount}`;
        small.textContent = remaining ? `あと ${remaining}件` : "すべて回答済み";
        text.append(strong, small);

        const state = document.createElement("span");
        state.className = `vnext-answer-save-state is-${responseState}`;
        state.setAttribute("role", responseState === "error" ? "alert" : "status");
        state.textContent = responseStateLabel(answeredCount);

        progress.append(text, state);
    }

    controls.querySelectorAll(".vnext-answer-bulk__button").forEach(button => {
        button.disabled = responseState === "saving";
    });

    renderBulkConfirmation(controls, cards);
}

function responseStateLabel(answeredCount){
    if(responseState === "saving"){
        return "保存中…";
    }
    if(responseState === "saved"){
        return "✓ 保存済み";
    }
    if(responseState === "error"){
        return responseError ? `保存できませんでした: ${responseError}` : "保存できませんでした";
    }
    return answeredCount ? "保存済み" : "未回答";
}

function requestBulkAnswer(answer){
    const editor = root.querySelector(".v2-vote-editor");
    if(!editor || responseState === "saving"){
        return;
    }

    const hasDetailedMaybe = Boolean(editor.querySelector(".v2-partial-response__ranges"));
    if(answer !== "maybe" && hasDetailedMaybe){
        bulkConfirmation = answer;
        enhanceVoteEditor();
        return;
    }

    dispatchBulkAnswer(answer);
}

function renderBulkConfirmation(controls, cards){
    const confirmation = controls.querySelector(".vnext-answer-bulk-confirm");
    if(!confirmation){
        return;
    }

    if(!bulkConfirmation){
        confirmation.hidden = true;
        confirmation.replaceChildren();
        return;
    }

    confirmation.hidden = false;
    confirmation.replaceChildren();

    const message = document.createElement("p");
    message.textContent = "△で指定した時間帯があります。一括変更すると、その時間指定は外れます。";

    const actions = document.createElement("div");
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "v2-command";
    cancel.textContent = "やめる";
    cancel.addEventListener("click", () => {
        bulkConfirmation = "";
        enhanceVoteEditor();
    });

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

function dispatchBulkAnswer(answer){
    window.dispatchEvent(new CustomEvent("relmua:scheduler-bulk-answer", {
        detail: { answer }
    }));
}

function interceptMaybeAnswer(event){
    const button = event.target instanceof Element ? event.target.closest(".v2-answer") : null;
    if(!button || !button.closest(".v2-vote-editor")){
        return;
    }

    const symbol = button.querySelector("strong")?.textContent?.trim();
    if(symbol !== "△"){
        return;
    }

    const card = button.closest(".v2-slot-card");
    const slotIndex = Number(card?.dataset?.vnextSlotIndex);
    if(!Number.isInteger(slotIndex)){
        return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    window.dispatchEvent(new CustomEvent("relmua:scheduler-answer", {
        detail: {
            slotIndex,
            answer: "maybe"
        }
    }));
}

function enhanceSlotCard(card, index){
    card.dataset.vnextSlotIndex = String(index);
    card.classList.add("vnext-answer-card");

    const answerButtons = Array.from(card.querySelectorAll(".v2-answer"));
    answerButtons.forEach(button => {
        const symbol = button.querySelector("strong")?.textContent?.trim();
        const labels = {
            "○": "行ける",
            "△": "条件つき",
            "×": "難しい"
        };
        const current = button.querySelector(":scope > .vnext-answer-button-label");
        const label = current ?? document.createElement("small");
        label.className = "vnext-answer-button-label";
        label.textContent = button.classList.contains("is-selected") ? "選択中" : (labels[symbol] ?? "回答");
        if(!current){
            button.appendChild(label);
        }
    });

    const selected = card.querySelector(".v2-answer.is-selected strong")?.textContent?.trim() ?? "";
    const status = card.querySelector(".v2-slot-row > div:not(.v2-answer-grid) > small");
    if(status){
        status.textContent = selected ? `あなたの回答: ${selected}` : "未回答";
        status.classList.add("vnext-answer-card__status");
    }

    enhancePartialResponse(card);
    enhanceMemo(card);
}

function enhancePartialResponse(card){
    const partial = card.querySelector(".v2-partial-response");
    if(!partial){
        return;
    }

    const hasRanges = Boolean(partial.querySelector(".v2-partial-response__ranges"));
    const small = partial.querySelector(":scope > small");
    const buttons = Array.from(partial.querySelectorAll("button"));

    if(!hasRanges){
        if(small){
            small.textContent = "必要なら、参加できる時間だけ指定できます。";
        }
        const openButton = buttons.find(button => button.textContent?.includes("時間が限られる"));
        if(openButton){
            openButton.textContent = "時間を指定";
        }
        const redundantButton = buttons.find(button => button.textContent?.includes("予定が未確定として回答"));
        if(redundantButton){
            redundantButton.hidden = true;
        }
        return;
    }

    if(small){
        small.textContent = "参加できる時間を指定できます。△のまま、時間帯だけ保存します。";
    }
    const saveButton = buttons.find(button => button.textContent?.includes("この内容で回答"));
    if(saveButton){
        saveButton.textContent = "この時間で保存";
    }
    const clearButton = buttons.find(button => button.textContent?.includes("未確定に戻す"));
    if(clearButton){
        clearButton.textContent = "時間指定を外す";
    }
}

function enhanceMemo(card){
    const form = card.querySelector(":scope > .v2-response-memo");
    if(!form || form.dataset.vnextMemoEnhanced === "true"){
        return;
    }

    form.dataset.vnextMemoEnhanced = "true";
    const textarea = form.querySelector("textarea");
    const wrapper = document.createElement("details");
    wrapper.className = "vnext-answer-memo";
    const summary = document.createElement("summary");
    summary.textContent = String(textarea?.value ?? "").trim() ? "メモを編集" : "メモを追加";

    form.before(wrapper);
    wrapper.append(summary, form);
}

function findSectionByLabel(label){
    return Array.from(root.children).find(section => {
        const rowLabel = section.querySelector?.(":scope > .v2-row-label");
        return String(rowLabel?.textContent ?? "").trim() === label;
    }) ?? null;
}
