const root = document.querySelector("[data-trpg-v2-app]");

const MONTHS = new Map([
    ["JAN", "1"], ["FEB", "2"], ["MAR", "3"], ["APR", "4"],
    ["MAY", "5"], ["JUN", "6"], ["JUL", "7"], ["AUG", "8"],
    ["SEP", "9"], ["OCT", "10"], ["NOV", "11"], ["DEC", "12"]
]);
const WEEKDAYS = new Map([
    ["MON", "月"], ["TUE", "火"], ["WED", "水"], ["THU", "木"],
    ["FRI", "金"], ["SAT", "土"], ["SUN", "日"]
]);

let observer = null;
let queued = false;

if(root){
    document.body.classList.add("scheduler-dense-v5");
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
    observer?.disconnect();
    try{
        enhanceAnswerRows();
        enhanceScheduleMatrix();
    }finally{
        observe();
    }
}

function enhanceAnswerRows(){
    root.querySelectorAll(".v2-vote-editor > .v2-slot-card").forEach(card => {
        card.classList.add("v5-answer-row");
        const row = card.querySelector(":scope > .v2-slot-row");
        if(!row || row.querySelector(":scope > .v5-answer-when")) return;

        const date = row.querySelector(":scope > .v2-live-date");
        const info = Array.from(row.children).find(node => node !== date && !node.classList?.contains("v2-answer-grid"));
        const month = MONTHS.get(String(date?.children?.[0]?.textContent ?? "").trim().toUpperCase()) ?? String(date?.children?.[0]?.textContent ?? "").trim();
        const day = String(date?.querySelector("strong")?.textContent ?? "").trim().replace(/^0+/, "") || "-";
        const weekday = WEEKDAYS.get(String(date?.children?.[2]?.textContent ?? "").trim().toUpperCase()) ?? String(date?.children?.[2]?.textContent ?? "").trim();
        const time = String(info?.querySelector("strong")?.textContent ?? "").trim();

        // Keep this wrapper out of the legacy `div:not(.v2-answer-grid)` selector used
        // by the answer enhancer. Using a span prevents the dense date label from
        // being mistaken for the mutable response-status container.
        const when = document.createElement("span");
        when.className = "v5-answer-when";
        const dateLine = document.createElement("strong");
        dateLine.textContent = month && weekday ? `${month}/${day}(${weekday})` : `${month}/${day}`;
        const timeLine = document.createElement("small");
        timeLine.textContent = time;
        when.append(dateLine, timeLine);
        row.prepend(when);

        row.querySelectorAll(".v2-answer").forEach(button => {
            const symbol = String(button.querySelector("strong")?.textContent ?? "").trim();
            button.setAttribute("aria-label", `${dateLine.textContent} ${time} ${answerDescription(symbol)}`.trim());
        });
    });
}

function enhanceScheduleMatrix(){
    root.querySelectorAll(".v2-schedule-table").forEach(table => {
        table.classList.add("v5-dense-matrix");
        const head = table.querySelector(":scope > .v2-schedule-table__desktop-head");
        if(head && !head.querySelector(":scope > .v5-schedule-summary-head")){
            const summaryHead = document.createElement("span");
            summaryHead.className = "v5-schedule-summary-head";
            summaryHead.textContent = "集計";
            head.children[0]?.after(summaryHead);
        }
        table.querySelectorAll(":scope > .v2-schedule-table__row").forEach(row => {
            row.classList.add("v5-dense-matrix__row");
        });
    });
}

function answerDescription(symbol){
    if(symbol === "○") return "参加できる";
    if(symbol === "△") return "条件つき";
    if(symbol === "×") return "参加できない";
    return "回答";
}
