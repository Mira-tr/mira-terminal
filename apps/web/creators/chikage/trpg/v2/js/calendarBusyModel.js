const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SCAN_DAYS = 7300;
const MAX_OCCURRENCES = 4096;
const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const DISPLAY_WEEKDAYS = { SUN: "SU", MON: "MO", TUE: "TU", WED: "WE", THU: "TH", FRI: "FR", SAT: "SA" };
const MONTHS = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };

export function parseCalendarBusyIntervals(icsText, options = {}){
    const text = String(icsText ?? "");
    const rangeStart = finiteNumber(options.rangeStart, Date.now() - DAY_MS);
    const rangeEnd = finiteNumber(options.rangeEnd, rangeStart + 365 * DAY_MS);
    const events = parseEvents(text);
    const intervals = [];

    events.forEach(event => {
        expandEvent(event, rangeStart, rangeEnd).forEach(interval => {
            if(interval.end > rangeStart && interval.start < rangeEnd){
                intervals.push({
                    start: Math.max(interval.start, rangeStart),
                    end: Math.min(interval.end, rangeEnd)
                });
            }
        });
    });

    return mergeBusyIntervals(intervals);
}

export function classifyCandidateAgainstBusy(intervals, candidate){
    const start = finiteNumber(candidate?.start, NaN);
    const end = finiteNumber(candidate?.end, NaN);
    if(!Number.isFinite(start) || !Number.isFinite(end) || end <= start){
        return { state: "unknown", overlapMinutes: 0, overlapRatio: 0, conflicts: 0 };
    }

    let overlap = 0;
    let conflicts = 0;
    for(const interval of Array.isArray(intervals) ? intervals : []){
        const busyStart = finiteNumber(interval?.start, NaN);
        const busyEnd = finiteNumber(interval?.end, NaN);
        if(!Number.isFinite(busyStart) || !Number.isFinite(busyEnd) || busyEnd <= busyStart) continue;
        const shared = Math.max(0, Math.min(end, busyEnd) - Math.max(start, busyStart));
        if(shared > 0){
            overlap += shared;
            conflicts += 1;
        }
    }

    const duration = end - start;
    const overlapRatio = Math.min(1, overlap / duration);
    const overlapMinutes = Math.round(overlap / 60000);
    if(overlap === 0) return { state: "free", overlapMinutes, overlapRatio, conflicts };
    if(overlapRatio >= 0.5) return { state: "busy", overlapMinutes, overlapRatio, conflicts };
    return { state: "partial", overlapMinutes, overlapRatio, conflicts };
}

export function candidateFromDisplayedSlot({ month, day, weekday, timeRange }, now = new Date()){
    const monthIndex = MONTHS[String(month ?? "").trim().toUpperCase()];
    const dayNumber = Number(day);
    const weekdayText = String(weekday ?? "").trim().slice(0, 3).toUpperCase();
    const weekdayCode = DISPLAY_WEEKDAYS[weekdayText] ?? "";
    const times = parseTimeRange(timeRange);
    if(monthIndex === undefined || !Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31 || !times){
        return null;
    }

    const nowDate = now instanceof Date ? now : new Date(now);
    const baseYear = Number.isNaN(nowDate.getTime()) ? new Date().getFullYear() : nowDate.getFullYear();
    const candidates = [];
    for(let year = baseYear - 1; year <= baseYear + 2; year += 1){
        const date = new Date(Date.UTC(year, monthIndex, dayNumber));
        if(date.getUTCMonth() !== monthIndex || date.getUTCDate() !== dayNumber) continue;
        const code = WEEKDAY_CODES[date.getUTCDay()];
        if(weekdayCode && weekdayCode !== code) continue;
        const dayStart = Date.parse(`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}T00:00:00+09:00`);
        const start = dayStart + times.startMinute * 60000;
        const end = dayStart + times.endMinute * 60000;
        candidates.push({ start, end, dateKey: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}` });
    }

    if(!candidates.length) return null;
    const nowMs = nowDate.getTime();
    const future = candidates.filter(item => item.end >= nowMs - 7 * DAY_MS).sort((a, b) => a.start - b.start);
    if(future.length) return future[0];
    return candidates.sort((a, b) => Math.abs(a.start - nowMs) - Math.abs(b.start - nowMs))[0];
}

export function calendarImportRange(candidates, paddingDays = 2){
    const valid = (Array.isArray(candidates) ? candidates : []).filter(item => Number.isFinite(item?.start) && Number.isFinite(item?.end));
    if(!valid.length){
        const now = Date.now();
        return { rangeStart: now - DAY_MS, rangeEnd: now + 365 * DAY_MS };
    }
    return {
        rangeStart: Math.min(...valid.map(item => item.start)) - paddingDays * DAY_MS,
        rangeEnd: Math.max(...valid.map(item => item.end)) + paddingDays * DAY_MS
    };
}

function parseEvents(text){
    const lines = unfoldLines(text);
    const events = [];
    let current = null;

    for(const line of lines){
        if(line === "BEGIN:VEVENT"){
            current = { exdates: [] };
            continue;
        }
        if(line === "END:VEVENT"){
            if(current?.start){
                if(!current.end){
                    current.end = current.start + (current.allDay ? DAY_MS : 60 * 60 * 1000);
                }
                if(current.end > current.start) events.push(current);
            }
            current = null;
            continue;
        }
        if(!current) continue;

        const property = parseProperty(line);
        if(!property) continue;
        const { name, params, value } = property;
        if(name === "DTSTART"){
            const parsed = parseIcsDate(value, params);
            if(parsed){ current.start = parsed.time; current.allDay = parsed.allDay; current.startParts = parsed.parts; }
        }else if(name === "DTEND"){
            const parsed = parseIcsDate(value, params);
            if(parsed) current.end = parsed.time;
        }else if(name === "DURATION" && current.start){
            const duration = parseDuration(value);
            if(duration > 0) current.end = current.start + duration;
        }else if(name === "RRULE"){
            current.rrule = parseRrule(value);
        }else if(name === "EXDATE"){
            value.split(",").forEach(entry => {
                const parsed = parseIcsDate(entry, params);
                if(parsed) current.exdates.push(parsed.time);
            });
        }
    }
    return events;
}

function unfoldLines(text){
    const raw = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const lines = [];
    for(const line of raw){
        if((line.startsWith(" ") || line.startsWith("\t")) && lines.length){
            lines[lines.length - 1] += line.slice(1);
        }else{
            lines.push(line.trimEnd());
        }
    }
    return lines;
}

function parseProperty(line){
    const colon = line.indexOf(":");
    if(colon <= 0) return null;
    const head = line.slice(0, colon).split(";");
    const name = head.shift().toUpperCase();
    const params = {};
    head.forEach(part => {
        const [key, ...rest] = part.split("=");
        if(key && rest.length) params[key.toUpperCase()] = rest.join("=");
    });
    return { name, params, value: line.slice(colon + 1).trim() };
}

function parseIcsDate(value, params = {}){
    const raw = String(value ?? "").trim();
    const dateOnly = params.VALUE === "DATE" || /^\d{8}$/.test(raw);
    if(dateOnly){
        const match = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
        if(!match) return null;
        const [, y, m, d] = match;
        return { time: Date.parse(`${y}-${m}-${d}T00:00:00+09:00`), allDay: true, parts: { y: +y, m: +m, d: +d, hh: 0, mm: 0, ss: 0 } };
    }

    const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
    if(!match) return null;
    const [, y, m, d, hh, mm, ss = "00", z] = match;
    let time;
    if(z){
        time = Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss);
    }else{
        const tzid = String(params.TZID ?? "");
        if(!tzid || /^(Asia\/Tokyo|Japan|JST)$/i.test(tzid)){
            time = Date.parse(`${y}-${m}-${d}T${hh}:${mm}:${ss}+09:00`);
        }else{
            time = new Date(+y, +m - 1, +d, +hh, +mm, +ss).getTime();
        }
    }
    return { time, allDay: false, parts: { y: +y, m: +m, d: +d, hh: +hh, mm: +mm, ss: +ss } };
}

function parseDuration(value){
    const match = String(value ?? "").match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
    if(!match) return 0;
    return ((Number(match[1] || 0) * 24 * 60 + Number(match[2] || 0) * 60 + Number(match[3] || 0)) * 60 + Number(match[4] || 0)) * 1000;
}

function parseRrule(value){
    const rule = {};
    String(value ?? "").split(";").forEach(part => {
        const [key, raw] = part.split("=");
        if(key && raw) rule[key.toUpperCase()] = raw;
    });
    return rule;
}

function expandEvent(event, rangeStart, rangeEnd){
    const duration = event.end - event.start;
    const rule = event.rrule;
    if(!rule?.FREQ){
        return [{ start: event.start, end: event.end }];
    }

    const freq = String(rule.FREQ).toUpperCase();
    const interval = Math.max(1, Number(rule.INTERVAL || 1) || 1);
    const countLimit = Math.max(0, Number(rule.COUNT || 0) || 0);
    const untilParsed = rule.UNTIL ? parseIcsDate(rule.UNTIL, {}) : null;
    const until = untilParsed?.time ?? Number.POSITIVE_INFINITY;
    const byDays = String(rule.BYDAY ?? "").split(",").map(item => item.trim().slice(-2).toUpperCase()).filter(item => WEEKDAY_CODES.includes(item));
    const exdates = new Set((event.exdates || []).map(value => Math.round(value / 60000)));
    const baseCalendar = tokyoCalendarParts(event.start);
    const startScanDay = calendarSerial(baseCalendar.y, baseCalendar.m, baseCalendar.d);
    const endParts = tokyoCalendarParts(Math.min(rangeEnd, until));
    const endScanDay = calendarSerial(endParts.y, endParts.m, endParts.d);
    const maxDay = Math.min(endScanDay, startScanDay + MAX_SCAN_DAYS);
    const result = [];
    let occurrenceIndex = 0;

    for(let serial = startScanDay; serial <= maxDay && result.length < MAX_OCCURRENCES; serial += 1){
        const parts = serialToCalendar(serial);
        if(!matchesRecurrence(parts, baseCalendar, freq, interval, byDays)) continue;
        occurrenceIndex += 1;
        if(countLimit && occurrenceIndex > countLimit) break;
        const start = Date.parse(`${parts.y}-${pad2(parts.m)}-${pad2(parts.d)}T${pad2(baseCalendar.hh)}:${pad2(baseCalendar.mm)}:${pad2(baseCalendar.ss)}+09:00`);
        if(start < event.start || start > until) continue;
        if(exdates.has(Math.round(start / 60000))) continue;
        const end = start + duration;
        if(end > rangeStart && start < rangeEnd) result.push({ start, end });
    }

    return result;
}

function matchesRecurrence(parts, base, freq, interval, byDays){
    const serial = calendarSerial(parts.y, parts.m, parts.d);
    const baseSerial = calendarSerial(base.y, base.m, base.d);
    const dayDiff = serial - baseSerial;
    if(dayDiff < 0) return false;
    const weekday = WEEKDAY_CODES[new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay()];

    if(freq === "DAILY"){
        return dayDiff % interval === 0 && (!byDays.length || byDays.includes(weekday));
    }
    if(freq === "WEEKLY"){
        const baseDow = (new Date(Date.UTC(base.y, base.m - 1, base.d)).getUTCDay() + 6) % 7;
        const currentDow = (new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay() + 6) % 7;
        const baseWeek = baseSerial - baseDow;
        const currentWeek = serial - currentDow;
        const weekDiff = Math.floor((currentWeek - baseWeek) / 7);
        const allowed = byDays.length ? byDays : [WEEKDAY_CODES[new Date(Date.UTC(base.y, base.m - 1, base.d)).getUTCDay()]];
        return weekDiff >= 0 && weekDiff % interval === 0 && allowed.includes(weekday);
    }
    if(freq === "MONTHLY"){
        const monthDiff = (parts.y - base.y) * 12 + (parts.m - base.m);
        return monthDiff >= 0 && monthDiff % interval === 0 && parts.d === base.d;
    }
    if(freq === "YEARLY"){
        const yearDiff = parts.y - base.y;
        return yearDiff >= 0 && yearDiff % interval === 0 && parts.m === base.m && parts.d === base.d;
    }
    return serial === baseSerial;
}

function tokyoCalendarParts(time){
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date(time));
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { y: +map.year, m: +map.month, d: +map.day, hh: +map.hour, mm: +map.minute, ss: +map.second };
}

function calendarSerial(y, m, d){ return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS); }
function serialToCalendar(serial){ const date = new Date(serial * DAY_MS); return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() }; }
function pad2(value){ return String(value).padStart(2, "0"); }
function finiteNumber(value, fallback){ const number = Number(value); return Number.isFinite(number) ? number : fallback; }

function parseTimeRange(value){
    const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(翌)?(\d{1,2}):(\d{2})$/);
    if(!match) return null;
    const startMinute = Number(match[1]) * 60 + Number(match[2]);
    let endMinute = Number(match[4]) * 60 + Number(match[5]);
    if(match[3]) endMinute += 24 * 60;
    if(endMinute <= startMinute) endMinute += 24 * 60;
    return { startMinute, endMinute };
}

export function mergeBusyIntervals(intervals){
    const sorted = (Array.isArray(intervals) ? intervals : [])
        .map(item => ({ start: Number(item?.start), end: Number(item?.end) }))
        .filter(item => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start)
        .sort((a, b) => a.start - b.start || a.end - b.end);
    const merged = [];
    for(const item of sorted){
        const last = merged[merged.length - 1];
        if(last && item.start <= last.end){
            last.end = Math.max(last.end, item.end);
        }else{
            merged.push({ ...item });
        }
    }
    return merged;
}
