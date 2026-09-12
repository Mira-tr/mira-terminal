import {
    calendarImportRange,
    candidateFromDisplayedSlot,
    classifyCandidateAgainstBusy,
    parseCalendarBusyIntervals
} from "./calendarBusyModel.js";

const root = document.querySelector("[data-trpg-v2-app]");
const MAX_FILE_BYTES = 5 * 1024 * 1024;
let intervals = [];
let importName = "";
let feedback = "";
let observer = null;
let queued = false;

if(root){
    document.body.classList.add("scheduler-calendar-v5");
    observer = new MutationObserver(queueEnhance);
    observe();
    enhance();
}

function observe(){
    observer?.observe(root, { childList: true, subtree: true });
}

function queueEnhance(){
    if(queued) return;
    queued = true;
    queueMicrotask(() => {
        queued = false;
        enhance();
    });
}

function enhance(){
    const editor = root?.querySelector(".v2-vote-editor");
    if(!editor) return;
    observer?.disconnect();
    try{
        let panel = editor.querySelector(":scope > .v5-calendar-import");
        if(!panel){
            panel = createPanel();
            const controls = editor.querySelector(":scope > .v4-answer-controls");
            controls?.after(panel);
            if(!panel.isConnected) editor.prepend(panel);
        }
        renderPanel(panel);
        applyHints(editor);
    }finally{
        observe();
    }
}

function createPanel(){
    const panel = document.createElement("section");
    panel.className = "v5-calendar-import";
    panel.setAttribute("aria-label", "Google Calendar / iCalendar予定の確認");

    const head = document.createElement("div");
    head.className = "v5-calendar-import__head";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = "予定と照合";
    const help = document.createElement("small");
    help.textContent = "Google Calendarなどの .ics を、この端末の中だけで候補日と照合します。";
    copy.append(title, help);
    const badge = document.createElement("span");
    badge.textContent = "LOCAL ONLY";
    head.append(copy, badge);

    const actions = document.createElement("div");
    actions.className = "v5-calendar-import__actions";
    const label = document.createElement("label");
    label.className = "v2-command v2-command--primary v5-calendar-import__file";
    label.textContent = "予定ファイルを読み込む";
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ics,text/calendar";
    input.addEventListener("change", handleFile);
    label.appendChild(input);

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "v2-command";
    clear.dataset.calendarClear = "true";
    clear.textContent = "読み込みを解除";
    clear.addEventListener("click", () => {
        intervals = [];
        importName = "";
        feedback = "予定データをこのページから消しました。";
        enhance();
    });
    actions.append(label, clear);

    const status = document.createElement("div");
    status.className = "v5-calendar-import__status";
    status.setAttribute("aria-live", "polite");
    panel.append(head, actions, status);
    return panel;
}

async function handleFile(event){
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if(!file) return;
    if(file.size > MAX_FILE_BYTES){
        feedback = "5MB以下の .ics ファイルを選んでください。";
        enhance();
        return;
    }

    try{
        const editor = root?.querySelector(".v2-vote-editor");
        const candidates = readCandidates(editor);
        const range = calendarImportRange(candidates);
        const text = await file.text();
        intervals = parseCalendarBusyIntervals(text, range);
        importName = sanitizeFileName(file.name);
        feedback = intervals.length
            ? `${intervals.length}件の予定帯を候補日と照合しました。回答は自動変更しません。`
            : "候補日の範囲に重なる予定は見つかりませんでした。";
    }catch(error){
        console.error("[scheduler] Failed to read calendar file", error);
        intervals = [];
        importName = "";
        feedback = "予定ファイルを読み取れませんでした。Google CalendarのiCalendar形式（.ics）を確認してください。";
    }
    enhance();
}

function renderPanel(panel){
    const status = panel.querySelector(".v5-calendar-import__status");
    const clear = panel.querySelector('[data-calendar-clear="true"]');
    if(clear) clear.hidden = !importName && intervals.length === 0;
    if(!status) return;
    status.replaceChildren();

    const main = document.createElement("span");
    main.textContent = feedback || "Google Calendarなら「設定 → インポート/エクスポート → エクスポート」の .ics を使えます。予定名や内容は表示・送信・保存しません。";
    status.appendChild(main);
    if(importName){
        const file = document.createElement("small");
        file.textContent = `読込中: ${importName}`;
        status.appendChild(file);
    }
}

function applyHints(editor){
    const cards = Array.from(editor?.querySelectorAll(":scope > .v2-slot-card") ?? []);
    cards.forEach(card => {
        card.querySelector(":scope > .v5-calendar-hint")?.remove();
        card.classList.remove("has-calendar-free", "has-calendar-partial", "has-calendar-busy");
        if(!importName) return;
        const candidate = readCandidate(card);
        if(!candidate) return;
        const result = classifyCandidateAgainstBusy(intervals, candidate);
        const hint = document.createElement("div");
        hint.className = `v5-calendar-hint is-${result.state}`;
        hint.setAttribute("role", "status");
        const strong = document.createElement("strong");
        const small = document.createElement("small");
        if(result.state === "free"){
            strong.textContent = "○候補 / 予定の重なりなし";
            small.textContent = "カレンダー上では空いています。最終回答は自分で選んでください。";
        }else if(result.state === "partial"){
            strong.textContent = "△候補 / 一部予定あり";
            small.textContent = `${result.overlapMinutes}分ほど予定と重なります。`;
        }else if(result.state === "busy"){
            strong.textContent = "×候補 / 予定あり";
            small.textContent = `${result.overlapMinutes}分ほど予定と重なります。`;
        }else{
            strong.textContent = "判定できませんでした";
            small.textContent = "この候補日は手動で確認してください。";
        }
        hint.append(strong, small);
        const row = card.querySelector(":scope > .v2-slot-row");
        row?.after(hint);
        if(!hint.isConnected) card.prepend(hint);
        card.classList.add(`has-calendar-${result.state}`);
    });
}

function readCandidates(editor){
    return Array.from(editor?.querySelectorAll(":scope > .v2-slot-card") ?? []).map(readCandidate).filter(Boolean);
}

function readCandidate(card){
    const date = card?.querySelector(".v2-live-date");
    const time = card?.querySelector(".v2-slot-row > div:not(.v2-answer-grid) > strong");
    const parts = date ? Array.from(date.children).map(node => node.textContent?.trim() ?? "") : [];
    if(parts.length < 3 || !time) return null;
    return candidateFromDisplayedSlot({
        month: parts[0],
        day: parts[1],
        weekday: parts[2],
        timeRange: time.textContent
    });
}

function sanitizeFileName(value){
    const name = String(value ?? "").replace(/[\r\n\t]/g, " ").trim();
    return name.slice(0, 120) || "calendar.ics";
}
