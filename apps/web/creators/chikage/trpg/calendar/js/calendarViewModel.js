const TIME_ZONE = "Asia/Tokyo";

export const SESSION_STATUS_LABELS = {
    scheduled: "予定",
    completed: "完了",
    cancelled: "中止"
};

export function createCalendarViewModel(bundle, monthDate, now = new Date()){
    const month = monthStart(monthDate);
    const schedules = array(bundle?.schedules);
    const scheduleById = new Map(schedules.map(schedule => [text(schedule.id), schedule]));
    const sessions = uniqueSessions(array(bundle?.monthSessions).concat(array(bundle?.upcomingSessions)))
        .map(session => normalizeSession(session, scheduleById))
        .sort(sortByStart);
    const today = japanDateKey(now);
    const monthKey = dateKey(month).slice(0, 7);
    const calendarSessions = sessions.filter(session => session.localDate.startsWith(monthKey));
    const eventsByDate = new Map();

    calendarSessions.forEach(session => {
        const events = eventsByDate.get(session.localDate) ?? [];
        events.push(session);
        eventsByDate.set(session.localDate, events);
    });

    return {
        month,
        monthLabel: new Intl.DateTimeFormat("ja-JP", {
            timeZone: TIME_ZONE,
            year: "numeric",
            month: "long"
        }).format(month),
        today,
        days: createMonthGrid(month).map(date => ({
            date,
            key: dateKey(date),
            day: Number(dateKey(date).slice(-2)),
            inMonth: dateKey(date).startsWith(monthKey),
            isToday: dateKey(date) === today,
            sessions: eventsByDate.get(dateKey(date)) ?? []
        })),
        upcoming: sessions
            .filter(session => session.status === "scheduled" && new Date(session.startsAt).getTime() >= now.getTime())
            .sort(sortByStart)
            .slice(0, 12),
        sessionsByDate: eventsByDate
    };
}

export function monthStart(value = new Date()){
    const key = japanDateKey(value);
    return dateFromKey(`${key.slice(0, 7)}-01`);
}

export function japanDateKey(value = new Date()){
    const date = value instanceof Date ? value : new Date(value);
    if(Number.isNaN(date.getTime())){
        return "1970-01-01";
    }

    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
}

export function shiftMonth(value, offset){
    const date = monthStart(value);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + offset;
    return new Date(Date.UTC(year, month, 1, 12));
}

export function dateKey(value){
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

export function dateFromKey(key){
    const match = text(key).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!match){
        return new Date(Date.UTC(1970, 0, 1, 12));
    }

    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
}

export function monthRangeIso(month){
    const start = dateKey(monthStart(month));
    const end = dateKey(shiftMonth(month, 1));
    return {
        start: `${start}T00:00:00+09:00`,
        end: `${end}T00:00:00+09:00`
    };
}

export function formatCalendarDate(key){
    const date = dateFromKey(key);
    return new Intl.DateTimeFormat("ja-JP", {
        timeZone: TIME_ZONE,
        month: "long",
        day: "numeric",
        weekday: "short"
    }).format(date);
}

export function formatSessionTime(session){
    const start = minuteLabel(session.startMinute);
    const end = session.endMinute >= 24 * 60
        ? `翌${minuteLabel(session.endMinute - 24 * 60)}`
        : minuteLabel(session.endMinute);
    return `${start}-${end}`;
}

function createMonthGrid(month){
    const start = new Date(month.getTime());
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start.getTime());
        date.setUTCDate(start.getUTCDate() + index);
        return date;
    });
}

function normalizeSession(session, scheduleById){
    const schedule = scheduleById.get(text(session.schedule_id ?? session.scheduleId)) ?? {};
    const startsAt = session.starts_at ?? session.startsAt ?? "";
    const localDate = text(session.local_date ?? session.localDate) || japanDateKey(startsAt);
    const sequence = Number(session.sequence ?? 0);

    return {
        id: text(session.id),
        scheduleId: text(session.schedule_id ?? session.scheduleId),
        title: text(schedule.title) || "無題の卓",
        status: SESSION_STATUS_LABELS[session.status] ? session.status : "scheduled",
        statusLabel: SESSION_STATUS_LABELS[session.status] ?? SESSION_STATUS_LABELS.scheduled,
        sequence,
        localDate,
        startMinute: Number(session.start_minute ?? session.startMinute ?? 0),
        endMinute: Number(session.end_minute ?? session.endMinute ?? 0),
        startsAt,
        endsAt: session.ends_at ?? session.endsAt ?? ""
    };
}

function uniqueSessions(sessions){
    const seen = new Set();
    return sessions.filter(session => {
        const id = text(session?.id);
        if(!id || seen.has(id)){
            return false;
        }
        seen.add(id);
        return true;
    });
}

function minuteLabel(value){
    const minute = Math.max(0, Number(value) || 0);
    return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function sortByStart(left, right){
    return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
}

function array(value){
    return Array.isArray(value) ? value : [];
}

function text(value){
    return String(value ?? "").trim();
}
