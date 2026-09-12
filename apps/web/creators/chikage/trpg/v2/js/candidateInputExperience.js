import {
    formatParsedCandidate,
    MAX_TEXT_CANDIDATES,
    parseCandidateText
} from "./candidateTextParser.js";
import {
    formatJapaneseDate
} from "./schedulerComposer.js";

const root = document.querySelector("[data-trpg-v2-app]");
const PREVIEW_LIMIT = 8;
const MAX_MONTH_MOVES = 120;

let draftText = "";
let feedback = {
    kind: "idle",
    title: "",
    messages: [],
    preview: []
};
let observer = null;
let queued = false;
let applying = false;

if(root){
    ensureStyles();
    observer = new MutationObserver(queueEnhance);
    observeRoot();
    enhanceCandidateInput();
}

function ensureStyles(){
    if(document.querySelector('link[data-vnext-candidate-input="true"]')){
        return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("../css/trpg-vnext-candidate-input.css", import.meta.url).href;
    link.dataset.vnextCandidateInput = "true";
    document.head.appendChild(link);
}

function observeRoot(){
    if(!observer || !root){
        return;
    }

    observer.observe(root, {
        childList: true,
        subtree: true
    });
}

function queueEnhance(){
    if(queued || applying){
        return;
    }

    queued = true;
    queueMicrotask(()=>{
        queued = false;
        enhanceCandidateInput();
    });
}

function enhanceCandidateInput(){
    if(!root || applying){
        return;
    }

    const composer = root.querySelector(".v2-candidate-composer");
    if(!composer){
        return;
    }

    observer?.disconnect();
    try{
        let panel = composer.querySelector(":scope > .vnext-candidate-paste");
        if(!panel){
            panel = createCandidatePastePanel();
            const head = composer.querySelector(":scope > .v2-candidate-composer__head");
            if(head){
                head.after(panel);
            }else{
                composer.prepend(panel);
            }
        }
        updatePanel(panel);
    }finally{
        observeRoot();
    }
}

function createCandidatePastePanel(){
    const section = document.createElement("section");
    section.className = "vnext-candidate-paste";
    section.setAttribute("aria-label", "候補日時をまとめて入力");

    const heading = document.createElement("div");
    heading.className = "vnext-candidate-paste__head";

    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = "候補日時をまとめて入力";
    const help = document.createElement("small");
    help.textContent = "1行1候補。月日と時間だけでOKです。";
    copy.append(title, help);

    const badge = document.createElement("span");
    badge.textContent = "PASTE / FAST";
    heading.append(copy, badge);

    const label = document.createElement("label");
    label.className = "vnext-candidate-paste__field";
    const fieldLabel = document.createElement("span");
    fieldLabel.textContent = "候補日時";
    const textarea = document.createElement("textarea");
    textarea.rows = 5;
    textarea.maxLength = 12000;
    textarea.placeholder = "9/18 20-24\n9/20 21:30-翌1:00\n9/23 13-18";
    textarea.value = draftText;
    textarea.addEventListener("input", event=>{
        draftText = event.currentTarget.value;
    });
    label.append(fieldLabel, textarea);

    const examples = document.createElement("p");
    examples.className = "vnext-candidate-paste__examples";
    examples.textContent = "例: 9/18 20-24 / 9月20日 21時-翌1時 / 2026-09-23 13:00-18:00";

    const actions = document.createElement("div");
    actions.className = "vnext-candidate-paste__actions";

    const applyButton = document.createElement("button");
    applyButton.className = "v2-command v2-command--primary";
    applyButton.type = "button";
    applyButton.dataset.candidatePreview = "true";
    applyButton.textContent = "入力を候補に反映";
    applyButton.addEventListener("click", handleApplyText);

    const clearButton = document.createElement("button");
    clearButton.className = "v2-command";
    clearButton.type = "button";
    clearButton.textContent = "入力を消す";
    clearButton.addEventListener("click", ()=>{
        draftText = "";
        feedback = {
            kind: "idle",
            title: "",
            messages: [],
            preview: []
        };
        updatePanel(section);
        section.querySelector("textarea")?.focus();
    });

    actions.append(applyButton, clearButton);

    const status = document.createElement("div");
    status.className = "vnext-candidate-paste__status";
    status.setAttribute("aria-live", "polite");

    section.append(heading, label, examples, actions, status);
    return section;
}

function updatePanel(panel){
    const textarea = panel.querySelector("textarea");
    if(textarea && textarea.value !== draftText){
        textarea.value = draftText;
    }

    const fastSaveEnabled = Boolean(panel.querySelector('[data-candidate-fast-save="true"]'));
    const applyButton = panel.querySelector('[data-candidate-preview="true"]')
        ?? panel.querySelector('.vnext-candidate-paste__actions .v2-command--primary:not([data-candidate-fast-save="true"])');
    if(applyButton){
        applyButton.dataset.candidatePreview = "true";
        applyButton.disabled = applying;
        const nextLabel = applying
            ? "候補へ反映中…"
            : fastSaveEnabled
                ? "候補欄で確認"
                : "入力を候補に反映";
        if(applyButton.textContent !== nextLabel){
            applyButton.textContent = nextLabel;
        }
    }

    const status = panel.querySelector(".vnext-candidate-paste__status");
    if(!status){
        return;
    }

    const signature = JSON.stringify({
        feedback,
        fastSaveEnabled
    });
    if(status.dataset.renderSignature === signature){
        return;
    }
    status.dataset.renderSignature = signature;
    status.className = `vnext-candidate-paste__status is-${feedback.kind}`;
    status.replaceChildren();

    if(feedback.kind === "idle"){
        const note = document.createElement("small");
        note.textContent = fastSaveEnabled
            ? "まとめて追加は1回で保存。保存前に編集したい時だけ「候補欄で確認」を使えます。"
            : `最大${MAX_TEXT_CANDIDATES}件。ここでは候補欄へ反映するだけで、まだ保存されません。`;
        status.appendChild(note);
        return;
    }

    const title = document.createElement("strong");
    title.textContent = feedback.title;
    status.appendChild(title);

    if(feedback.messages.length){
        const list = document.createElement("ul");
        feedback.messages.slice(0, 5).forEach(message=>{
            const item = document.createElement("li");
            item.textContent = message;
            list.appendChild(item);
        });
        if(feedback.messages.length > 5){
            const more = document.createElement("li");
            more.textContent = `ほか ${feedback.messages.length - 5}件`;
            list.appendChild(more);
        }
        status.appendChild(list);
    }

    if(feedback.preview.length){
        const preview = document.createElement("div");
        preview.className = "vnext-candidate-paste__preview";
        feedback.preview.slice(0, PREVIEW_LIMIT).forEach(entry=>{
            const item = document.createElement("span");
            item.textContent = formatParsedCandidate(entry);
            preview.appendChild(item);
        });
        if(feedback.preview.length > PREVIEW_LIMIT){
            const more = document.createElement("span");
            more.textContent = `+${feedback.preview.length - PREVIEW_LIMIT}件`;
            preview.appendChild(more);
        }
        status.appendChild(preview);
    }
}

function handleApplyText(){
    const parsed = parseCandidateText(draftText, {
        maxCandidates: MAX_TEXT_CANDIDATES
    });

    if(!parsed.ok){
        feedback = {
            kind: "error",
            title: "入力を確認してください",
            messages: parsed.errors,
            preview: parsed.entries
        };
        enhanceCandidateInput();
        return;
    }

    const capacity = inspectCapacity(parsed.entries);
    if(!capacity.ok){
        feedback = {
            kind: "error",
            title: "候補が多すぎます",
            messages: [capacity.message],
            preview: parsed.entries
        };
        enhanceCandidateInput();
        return;
    }

    applying = true;
    observer?.disconnect();

    try{
        applyEntries(parsed.entries);
        feedback = {
            kind: "success",
            title: `${parsed.entries.length}件を候補欄へ反映しました`,
            messages: [
                ...parsed.warnings,
                "下の候補日時を確認して、最後の「候補日を追加」を押すと保存されます。"
            ],
            preview: parsed.entries
        };
    }catch(error){
        console.error("[scheduler] Failed to apply pasted candidates", error);
        feedback = {
            kind: "error",
            title: "候補欄へ反映できませんでした",
            messages: [error instanceof Error ? error.message : "カレンダーを開き直して、もう一度お試しください。"],
            preview: parsed.entries
        };
    }finally{
        applying = false;
        observeRoot();
        enhanceCandidateInput();
    }
}

function inspectCapacity(entries){
    const currentWindows = Array.from(root.querySelectorAll(".v2-candidate-date"));
    const currentTotal = currentWindows.reduce((count, editor)=>{
        return count + editor.querySelectorAll(".v2-candidate-window").length;
    }, 0);
    const targetCounts = new Map();

    entries.forEach(entry=>{
        const label = formatJapaneseDate(entry.dateKey);
        targetCounts.set(label, (targetCounts.get(label) ?? 0) + 1);
    });

    let replacedCount = 0;
    currentWindows.forEach(editor=>{
        const label = editor.querySelector(".v2-candidate-date__head strong")?.textContent?.trim() ?? "";
        if(targetCounts.has(label)){
            replacedCount += editor.querySelectorAll(".v2-candidate-window").length;
        }
    });

    const projected = currentTotal - replacedCount + entries.length;
    return projected <= MAX_TEXT_CANDIDATES
        ? { ok: true, message: "" }
        : {
            ok: false,
            message: `現在の選択と合わせると${projected}件になります。一度に追加できるのは${MAX_TEXT_CANDIDATES}件までです。`
        };
}

function applyEntries(entries){
    const groups = groupByDate(entries);

    for(const [dateKey, dateEntries] of groups){
        navigateToMonth(dateKey.slice(0, 7));
        resetSelectedDate(dateKey);
        ensureWindowCount(dateKey, dateEntries.length);
        applyDateWindows(dateKey, dateEntries);
    }

    refreshComposerPresentation();
}

function groupByDate(entries){
    const groups = new Map();
    entries.forEach(entry=>{
        const rows = groups.get(entry.dateKey) ?? [];
        rows.push(entry);
        groups.set(entry.dateKey, rows);
    });
    return [...groups.entries()].sort(([left], [right])=>left.localeCompare(right));
}

function navigateToMonth(targetMonth){
    for(let step = 0; step <= MAX_MONTH_MOVES; step += 1){
        const currentMonth = readCurrentMonth();
        if(!currentMonth){
            throw new Error("候補日カレンダーの月を確認できませんでした。");
        }
        if(currentMonth === targetMonth){
            return;
        }

        const currentIndex = monthIndex(currentMonth);
        const targetIndex = monthIndex(targetMonth);
        const direction = targetIndex > currentIndex ? "次の月" : "前の月";
        const button = findButton(root.querySelector(".v2-calendar__head"), direction);
        if(!button){
            throw new Error("候補日カレンダーを移動できませんでした。");
        }
        button.click();
    }

    throw new Error("入力した日付が現在のカレンダーから離れすぎています。");
}

function readCurrentMonth(){
    const text = root.querySelector(".v2-calendar__head strong")?.textContent?.trim() ?? "";
    const match = text.match(/(\d{4})年\s*(\d{1,2})月/);
    return match ? `${match[1]}-${String(Number(match[2])).padStart(2, "0")}` : "";
}

function monthIndex(monthKey){
    const match = String(monthKey).match(/^(\d{4})-(\d{2})$/);
    if(!match){
        return 0;
    }
    return Number(match[1]) * 12 + Number(match[2]);
}

function resetSelectedDate(dateKey){
    const label = formatJapaneseDate(dateKey);
    let button = findDayButton(label);
    if(!button){
        throw new Error(`${label}をカレンダーで見つけられませんでした。`);
    }

    if(button.getAttribute("aria-pressed") === "true"){
        button.click();
    }

    button = findDayButton(label);
    if(!button){
        throw new Error(`${label}をカレンダーで見つけられませんでした。`);
    }

    if(button.getAttribute("aria-pressed") !== "true"){
        button.click();
    }

    button = findDayButton(label);
    if(button?.getAttribute("aria-pressed") !== "true"){
        throw new Error(`${label}を候補日に追加できませんでした。候補数を確認してください。`);
    }
}

function findDayButton(label){
    return Array.from(root.querySelectorAll(".v2-calendar__day")).find(button=>{
        return String(button.getAttribute("aria-label") ?? "").startsWith(label);
    }) ?? null;
}

function ensureWindowCount(dateKey, count){
    while(true){
        const editor = findDateEditor(dateKey);
        if(!editor){
            throw new Error(`${formatJapaneseDate(dateKey)}の編集欄を開けませんでした。`);
        }

        const current = editor.querySelectorAll(".v2-candidate-window").length;
        if(current >= count){
            return;
        }

        const addButton = findButton(editor, "＋ 時間帯を追加");
        if(!addButton){
            throw new Error(`${formatJapaneseDate(dateKey)}へ時間帯を追加できませんでした。`);
        }
        addButton.click();
    }
}

function findDateEditor(dateKey){
    const label = formatJapaneseDate(dateKey);
    return Array.from(root.querySelectorAll(".v2-candidate-date")).find(editor=>{
        return editor.querySelector(".v2-candidate-date__head strong")?.textContent?.trim() === label;
    }) ?? null;
}

function applyDateWindows(dateKey, entries){
    const editor = findDateEditor(dateKey);
    const windows = Array.from(editor?.querySelectorAll(".v2-candidate-window") ?? []);

    if(windows.length < entries.length){
        throw new Error(`${formatJapaneseDate(dateKey)}の時間帯をすべて用意できませんでした。`);
    }

    entries.forEach((entry, index)=>{
        const window = windows[index];
        const inputs = Array.from(window.querySelectorAll('input[type="time"]'));
        const nextDay = window.querySelector('.v2-next-day-toggle input[type="checkbox"]');

        if(inputs.length < 2 || !nextDay){
            throw new Error(`${formatJapaneseDate(dateKey)}の時間入力を確認できませんでした。`);
        }

        changeValue(inputs[0], entry.startTime);
        changeValue(inputs[1], entry.endTime);
        changeChecked(nextDay, entry.endsNextDay);
    });
}

function changeValue(input, value){
    input.value = value;
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

function changeChecked(input, checked){
    input.checked = Boolean(checked);
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

function refreshComposerPresentation(){
    const head = root.querySelector(".v2-calendar__head");
    const next = findButton(head, "次の月");
    if(!next){
        return;
    }

    next.click();
    const previous = findButton(root.querySelector(".v2-calendar__head"), "前の月");
    previous?.click();
}

function findButton(container, text){
    if(!container){
        return null;
    }
    return Array.from(container.querySelectorAll("button")).find(button=>{
        return button.textContent?.trim() === text;
    }) ?? null;
}
