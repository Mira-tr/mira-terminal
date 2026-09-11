import {
    createSupabaseBrowserClient,
    loadSupabasePublicConfig
} from "../../scheduler/js/supabaseConfig.js";
import { SupabaseScheduleRepository } from "../../scheduler/js/supabaseRepository.js";
import {
    createCalendarViewModel,
    dateKey,
    formatCalendarDate,
    formatSessionTime,
    japanDateKey,
    monthRangeIso,
    monthStart,
    shiftMonth
} from "./calendarViewModel.js";

const root = document.querySelector("[data-trpg-calendar-app]");
const state = {
    repository: null,
    user: null,
    month: monthStart(),
    selectedDate: japanDateKey(),
    view: null
};

if(root){
    init();
}

async function init(){
    renderLoading();

    try{
        const config = await loadSupabasePublicConfig();
        if(!config.enabled || !config.scheduleEnabled){
            renderUnavailable();
            return;
        }

        state.repository = new SupabaseScheduleRepository(await createSupabaseBrowserClient(config));
        state.user = await state.repository.getCurrentUser();
        state.repository.onAuthStateChange(async user => {
            state.user = user;
            await refresh();
        });
        await refresh();
    }catch(error){
        renderError(error);
    }
}

async function refresh(){
    if(!state.user){
        renderSignedOut();
        return;
    }

    renderLoading();

    try{
        const range = monthRangeIso(state.month);
        const bundle = await state.repository.loadTrpgV7Calendar({
            monthStart: range.start,
            monthEnd: range.end,
            upcomingLimit: 12
        });
        state.view = createCalendarViewModel(bundle, state.month);
        if(!state.view.days.some(day => day.key === state.selectedDate)){
            state.selectedDate = state.view.today;
        }
        renderCalendar();
    }catch(error){
        renderError(error);
    }
}

function renderCalendar(){
    const view = state.view;
    const selectedSessions = view.sessionsByDate.get(state.selectedDate) ?? [];

    root.replaceChildren(
        el("section", { className: "cx-calendar-shell calendar-v5-shell" }, [
            nextSessionFocus(view),
            calendarControls(view),
            el("div", { className: "calendar-v5-workspace" }, [
                monthCalendar(view),
                el("aside", { className: "calendar-v5-side", "aria-label": "選択日と今後の予定" }, [
                    dayDetail(selectedSessions),
                    upcomingList(view)
                ])
            ])
        ])
    );
}

function nextSessionFocus(view){
    const next = view.upcoming[0];

    if(!next){
        return el("section", { className: "calendar-v5-next is-empty", "aria-labelledby": "calendarNextTitle" }, [
            el("div", { className: "calendar-v5-next__label" }, [
                el("p", { className: "cx-kicker" }, "NEXT SESSION"),
                el("span", {}, "NO SESSION")
            ]),
            el("div", { className: "calendar-v5-next__body" }, [
                el("h2", { id: "calendarNextTitle" }, "次の確定予定は、まだありません。"),
                el("p", {}, "日程を決める時はSchedulerから。Calendarには確定したSessionだけが並びます。")
            ]),
            el("a", { className: "cx-calendar-link calendar-v5-next__action", href: "../scheduler/" }, "Schedulerへ →")
        ]);
    }

    return el("section", { className: "calendar-v5-next", "aria-labelledby": "calendarNextTitle" }, [
        el("div", { className: "calendar-v5-next__date", "aria-hidden": "true" }, [
            el("span", {}, shortMonth(next.localDate)),
            el("strong", {}, next.localDate.slice(-2)),
            el("small", {}, shortWeekday(next.localDate))
        ]),
        el("div", { className: "calendar-v5-next__body" }, [
            el("p", { className: "cx-kicker" }, "NEXT SESSION"),
            el("h2", { id: "calendarNextTitle" }, next.title),
            el("p", {}, `${formatCalendarDate(next.localDate)} / ${formatSessionTime(next)} / SESSION ${String(next.sequence).padStart(2, "0")}`)
        ]),
        el("a", { className: "cx-calendar-link calendar-v5-next__action", href: scheduleHref(next.scheduleId) }, "卓を見る →")
    ]);
}

function calendarControls(view){
    return el("header", { className: "cx-calendar-heading calendar-v5-heading" }, [
        el("div", {}, [
            el("p", { className: "cx-kicker" }, "MONTH"),
            el("h2", {}, view.monthLabel),
            el("p", { className: "cx-calendar-heading__copy" }, "日付を選ぶと、その日のSessionを右側 / 下側で確認できます。")
        ]),
        el("div", { className: "cx-calendar-controls", "aria-label": "月の移動" }, [
            button("←", "前の月", () => changeMonth(-1)),
            button("今日", "今日へ戻る", () => {
                state.month = monthStart();
                state.selectedDate = japanDateKey();
                refresh();
            }),
            button("→", "次の月", () => changeMonth(1))
        ])
    ]);
}

function monthCalendar(view){
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return el("section", { className: "cx-calendar-month calendar-v5-month", "aria-label": `${view.monthLabel}のカレンダー` }, [
        el("div", { className: "cx-calendar-weekdays", "aria-hidden": "true" }, weekdays.map(day => el("span", {}, day))),
        el("div", { className: "cx-calendar-grid" }, view.days.map(day => calendarDay(day)))
    ]);
}

function calendarDay(day){
    const visible = day.sessions.slice(0, 2);
    const more = day.sessions.length - visible.length;
    const classNames = ["cx-calendar-day"];
    if(!day.inMonth){ classNames.push("is-outside"); }
    if(day.isToday){ classNames.push("is-today"); }
    if(day.key === state.selectedDate){ classNames.push("is-selected"); }
    if(day.sessions.length){ classNames.push("has-session"); }

    return el("button", {
        className: classNames.join(" "),
        type: "button",
        "aria-pressed": day.key === state.selectedDate,
        "aria-label": `${formatCalendarDate(day.key)}${day.sessions.length ? `、${day.sessions.length}件のSession` : "、予定なし"}`,
        onClick(){
            state.selectedDate = day.key;
            renderCalendar();
        }
    }, [
        el("span", { className: "cx-calendar-day__number" }, String(day.day)),
        day.sessions.length
            ? el("span", { className: "calendar-v5-day-mark", "aria-hidden": "true" }, String(day.sessions.length))
            : null,
        ...visible.map(session => el("span", { className: `cx-calendar-day__event is-${session.status}` }, `${formatSessionTime(session)} ${session.title}`)),
        more > 0 ? el("span", { className: "cx-calendar-day__more" }, `+${more}`) : null
    ]);
}

function upcomingList(view){
    const groups = groupUpcoming(view.upcoming, view.today);
    return el("section", { className: "cx-calendar-upcoming calendar-v5-upcoming", "aria-labelledby": "upcomingTitle" }, [
        el("div", { className: "cx-calendar-section-head" }, [
            el("div", {}, [
                el("p", { className: "cx-kicker" }, "UPCOMING"),
                el("h2", { id: "upcomingTitle" }, "この先の予定")
            ]),
            el("small", { className: "calendar-v5-count" }, `${view.upcoming.length} SESSIONS`)
        ]),
        view.upcoming.length
            ? el("div", { className: "cx-upcoming-list" }, groups.flatMap(([label, sessions]) => [
                el("p", { className: "cx-upcoming-group" }, label),
                ...sessions.map((session, index) => upcomingRow(session, label === "次のSession" && index === 0))
            ]))
            : el("div", { className: "cx-calendar-empty" }, [
                el("strong", {}, "この先に確定している卓はありません。"),
                el("p", {}, "新しい予定を決める時はSchedulerへ。"),
                el("a", { href: "../scheduler/" }, "Schedulerを開く →")
            ])
    ]);
}

function upcomingRow(session, isNearest){
    return el("a", {
        className: `cx-upcoming-row${isNearest ? " is-nearest" : ""}`,
        href: scheduleHref(session.scheduleId)
    }, [
        el("span", { className: "cx-upcoming-row__date" }, japaneseShortDate(session.localDate)),
        el("span", { className: "cx-upcoming-row__body" }, [
            el("strong", {}, session.title),
            el("small", {}, `${formatSessionTime(session)} / SESSION ${String(session.sequence).padStart(2, "0")}`)
        ]),
        el("span", { className: `cx-session-status is-${session.status}` }, session.statusLabel)
    ]);
}

function dayDetail(sessions){
    return el("section", { className: "cx-calendar-day-detail calendar-v5-day-detail", "aria-live": "polite" }, [
        el("div", { className: "cx-calendar-section-head" }, [
            el("div", {}, [
                el("p", { className: "cx-kicker" }, "SELECTED DAY"),
                el("h2", {}, formatCalendarDate(state.selectedDate))
            ]),
            sessions.length
                ? el("small", { className: "calendar-v5-count" }, `${sessions.length} SESSIONS`)
                : el("small", { className: "calendar-v5-count" }, "NO SESSION")
        ]),
        sessions.length
            ? el("div", { className: "cx-day-session-list" }, sessions.map(session => el("a", {
                className: "cx-day-session-row",
                href: scheduleHref(session.scheduleId)
            }, [
                el("span", { className: "cx-day-session-row__time" }, formatSessionTime(session)),
                el("span", {}, [
                    el("strong", {}, session.title),
                    el("small", {}, `SESSION ${String(session.sequence).padStart(2, "0")} / ${session.statusLabel}`)
                ]),
                el("span", { className: "cx-day-session-row__open", "aria-hidden": "true" }, "見る →")
            ])))
            : el("div", { className: "cx-calendar-empty" }, [
                el("strong", {}, "この日のSessionはありません。"),
                el("p", {}, "予定がある日には月表示に印がつきます。")
            ])
    ]);
}

function changeMonth(offset){
    state.month = shiftMonth(state.month, offset);
    state.selectedDate = dateKey(state.month);
    refresh();
}

function groupUpcoming(sessions, today){
    const groups = new Map();
    sessions.forEach(session => {
        const label = session.localDate === today ? "今日" : groups.has("次のSession") ? "この先" : "次のSession";
        const rows = groups.get(label) ?? [];
        rows.push(session);
        groups.set(label, rows);
    });
    return Array.from(groups.entries());
}

function japaneseShortDate(key){
    return new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "numeric",
        day: "numeric",
        weekday: "short"
    }).format(new Date(`${key}T12:00:00+09:00`));
}

function shortMonth(key){
    return `${Number(key.slice(5, 7))}月`;
}

function shortWeekday(key){
    return new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        weekday: "short"
    }).format(new Date(`${key}T12:00:00+09:00`));
}

function scheduleHref(scheduleId){
    return `../scheduler/?schedule=${encodeURIComponent(scheduleId)}`;
}

function renderLoading(){
    root.replaceChildren(statePanel(
        "CALENDAR / LOADING",
        "予定を読み込んでいます。",
        "確定したSessionを確認しています。"
    ));
}

function renderSignedOut(){
    root.replaceChildren(statePanel(
        "CALENDAR / SIGN IN",
        "自分の卓を見るにはログイン。",
        "CalendarはSchedulerと同じDiscordアカウントの予定を表示します。",
        el("a", { className: "cx-calendar-link", href: "../scheduler/" }, "Schedulerでログイン →")
    ));
}

function renderUnavailable(){
    root.replaceChildren(statePanel(
        "CALENDAR / OFFLINE",
        "いまは予定の同期を利用できません。",
        "Scheduler側の公開設定を確認してください。",
        el("a", { className: "cx-calendar-link", href: "../scheduler/" }, "Schedulerへ →")
    ));
}

function renderError(){
    root.replaceChildren(statePanel(
        "CALENDAR / ERROR",
        "予定を取得できませんでした。",
        "通信状態を確認して、もう一度読み込んでください。",
        button("再試行", "予定を再読み込み", refresh)
    ));
}

function statePanel(kicker, title, copy, action = null){
    return el("section", { className: "cx-calendar-state calendar-v5-state", "aria-live": "polite" }, [
        el("p", { className: "cx-kicker" }, kicker),
        el("strong", {}, title),
        el("p", {}, copy),
        action
    ]);
}

function button(label, ariaLabel, onClick){
    return el("button", { type: "button", className: "cx-calendar-button", "aria-label": ariaLabel, onClick }, label);
}

function el(tagName, attrs = {}, children = []){
    const node = document.createElement(tagName);
    Object.entries(attrs).forEach(([key, value]) => {
        if(value === null || value === undefined || value === false){ return; }
        if(key === "className"){ node.className = value; return; }
        if(key === "onClick"){ node.addEventListener("click", value); return; }
        if(key in node){ node[key] = value; return; }
        node.setAttribute(key, String(value));
    });
    (Array.isArray(children) ? children : [children]).forEach(child => {
        if(child !== null && child !== undefined){
            node.append(child instanceof Node ? child : document.createTextNode(String(child)));
        }
    });
    return node;
}
