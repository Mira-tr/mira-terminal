export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
export const AVAILABILITY_STATES = ["unset", "available", "unavailable"];
export const MAX_AVAILABILITY_RANGES = 4;

export function createPersonalAvailabilityModel(payload = {}){
    const model = {
        weekly: {},
        exceptions: {}
    };

    collectionEntries(payload.weekly, "weekday").forEach(item => {
        const weekday = Number(item?.weekday);
        if(Number.isInteger(weekday) && weekday >= 0 && weekday <= 6){
            model.weekly[String(weekday)] = normalizeEntry(item);
        }
    });

    collectionEntries(payload.exceptions, "localDate").forEach(item => {
        const localDate = normalizeDateKey(item?.localDate ?? item?.local_date);
        if(localDate){
            model.exceptions[localDate] = normalizeEntry(item);
        }
    });

    return model;
}

export function availabilityEntry(model, scope, key){
    const collection = scope === "exception" ? model?.exceptions : model?.weekly;
    return normalizeEntry(collection?.[String(key)]);
}

export function updateWeeklyState(model, weekday, state){
    if(!AVAILABILITY_STATES.includes(state)){
        return model;
    }

    const next = cloneModel(model);
    const key = String(weekday);

    if(state === "unset"){
        delete next.weekly[key];
        return next;
    }

    const entry = availabilityEntry(next, "weekly", key);
    next.weekly[key] = {
        state,
        ranges: state === "available" ? ensureRanges(entry.ranges) : []
    };
    return next;
}

export function updateExceptionState(model, localDate, state){
    const dateKey = normalizeDateKey(localDate);
    if(!dateKey || !["available", "unavailable"].includes(state)){
        return model;
    }

    const next = cloneModel(model);
    const entry = availabilityEntry(next, "exception", dateKey);
    next.exceptions[dateKey] = {
        state,
        ranges: state === "available" ? ensureRanges(entry.ranges) : []
    };
    return next;
}

export function removeException(model, localDate){
    const dateKey = normalizeDateKey(localDate);
    const next = cloneModel(model);
    delete next.exceptions[dateKey];
    return next;
}

export function updateAvailabilityRange(model, scope, key, rangeIndex, fields){
    const next = cloneModel(model);
    const collection = scope === "exception" ? next.exceptions : next.weekly;
    const entryKey = String(key);
    const entry = availabilityEntry(next, scope, entryKey);

    if(entry.state !== "available" || !entry.ranges[rangeIndex]){
        return model;
    }

    entry.ranges[rangeIndex] = normalizeRange({
        ...entry.ranges[rangeIndex],
        ...fields
    });
    collection[entryKey] = entry;
    return next;
}

export function addAvailabilityRange(model, scope, key){
    const next = cloneModel(model);
    const collection = scope === "exception" ? next.exceptions : next.weekly;
    const entryKey = String(key);
    const entry = availabilityEntry(next, scope, entryKey);

    if(entry.state !== "available" || entry.ranges.length >= MAX_AVAILABILITY_RANGES){
        return model;
    }

    entry.ranges.push(defaultRange());
    collection[entryKey] = entry;
    return next;
}

export function removeAvailabilityRange(model, scope, key, rangeIndex){
    const next = cloneModel(model);
    const collection = scope === "exception" ? next.exceptions : next.weekly;
    const entryKey = String(key);
    const entry = availabilityEntry(next, scope, entryKey);

    if(entry.state !== "available" || entry.ranges.length <= 1 || !entry.ranges[rangeIndex]){
        return model;
    }

    entry.ranges.splice(rangeIndex, 1);
    collection[entryKey] = entry;
    return next;
}

export function toAvailabilityPayload(model){
    const normalized = createPersonalAvailabilityModel({
        weekly: Object.entries(model?.weekly ?? {}).map(([weekday, entry]) => ({
            weekday: Number(weekday),
            ...entry
        })),
        exceptions: Object.entries(model?.exceptions ?? {}).map(([localDate, entry]) => ({
            localDate,
            ...entry
        }))
    });

    return {
        weekly: Object.entries(normalized.weekly)
            .map(([weekday, entry]) => ({
                weekday: Number(weekday),
                state: entry.state,
                ranges: entry.state === "available" ? entry.ranges.map(range => ({ ...range })) : []
            }))
            .sort((left, right) => left.weekday - right.weekday),
        exceptions: Object.entries(normalized.exceptions)
            .map(([localDate, entry]) => ({
                localDate,
                state: entry.state,
                ranges: entry.state === "available" ? entry.ranges.map(range => ({ ...range })) : []
            }))
            .sort((left, right) => left.localDate.localeCompare(right.localDate))
    };
}

export function validateAvailabilityPayload(payload){
    const errors = [];
    const normalized = toAvailabilityPayload(payload);
    const weekdays = new Set();
    const dates = new Set();

    normalized.weekly.forEach(item => {
        if(weekdays.has(item.weekday)){
            errors.push("同じ曜日の予定が重複しています。");
        }
        weekdays.add(item.weekday);
        validateEntry(item, `${WEEKDAY_LABELS[item.weekday]}曜日`, errors);
    });

    normalized.exceptions.forEach(item => {
        if(dates.has(item.localDate)){
            errors.push("同じ日付の例外が重複しています。");
        }
        dates.add(item.localDate);
        validateEntry(item, item.localDate, errors);
    });

    return {
        ok: errors.length === 0,
        errors,
        payload: normalized
    };
}

export function evaluateAvailabilityForSlot({ availability, slot, confirmedSlots = [], scheduleId = "" }){
    const localDate = normalizeDateKey(slot?.local_date ?? slot?.localDate);
    const slotStart = number(slot?.start_minute ?? slot?.startMinute);
    const slotEnd = number(slot?.end_minute ?? slot?.endMinute);

    if(!localDate || slotStart === null || slotEnd === null || slotEnd <= slotStart){
        return emptyDraft("unset");
    }

    const model = createPersonalAvailabilityModel(availability);
    const exception = model.exceptions[localDate];
    const weekday = weekdayForDate(localDate);
    const weekly = weekday === null ? null : model.weekly[String(weekday)];
    const source = exception ?? weekly ?? null;

    if(!source){
        const conflicts = findConfirmedConflicts(slot, confirmedSlots, scheduleId);
        return {
            ...emptyDraft(conflicts.length ? "confirmed-busy" : "unset"),
            conflicts
        };
    }

    if(source.state === "unavailable"){
        return {
            answer: "no",
            ranges: [],
            source: exception ? "exception" : "weekly",
            conflicts: []
        };
    }

    const candidateRanges = intersectRanges(source.ranges, [{
        startMinute: slotStart,
        endMinute: slotEnd
    }]);
    const conflicts = findConfirmedConflicts(slot, confirmedSlots, scheduleId);
    const availableRanges = subtractRanges(candidateRanges, conflicts);

    if(availableRanges.length === 0){
        return {
            answer: "no",
            ranges: [],
            source: conflicts.length ? "confirmed-busy" : (exception ? "exception" : "weekly"),
            conflicts
        };
    }

    const fullCoverage = availableRanges.length === 1 &&
        availableRanges[0].startMinute <= slotStart &&
        availableRanges[0].endMinute >= slotEnd;

    return {
        answer: fullCoverage ? "yes" : "maybe",
        ranges: availableRanges,
        source: conflicts.length ? "confirmed-busy" : (exception ? "exception" : "weekly"),
        conflicts
    };
}

export function formatMinuteTime(value){
    const minute = Math.max(0, Number(value) || 0);
    return `${String(Math.floor((minute % 1440) / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export function timeToMinute(value, endsNextDay = false){
    const match = String(value ?? "").match(/^(\d{2}):(\d{2})$/);
    if(!match){
        return null;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if(hour > 23 || minute > 59){
        return null;
    }

    return hour * 60 + minute + (endsNextDay ? 1440 : 0);
}

function normalizeEntry(entry){
    const state = ["available", "unavailable"].includes(entry?.state) ? entry.state : "unset";
    return {
        state,
        ranges: state === "available"
            ? ensureRanges(array(entry?.ranges).map(normalizeRange))
            : []
    };
}

function normalizeRange(range){
    return {
        startMinute: number(range?.startMinute ?? range?.start_minute) ?? 20 * 60,
        endMinute: number(range?.endMinute ?? range?.end_minute) ?? 24 * 60
    };
}

function ensureRanges(ranges){
    return ranges.length ? ranges.slice(0, MAX_AVAILABILITY_RANGES) : [defaultRange()];
}

function defaultRange(){
    return {
        startMinute: 20 * 60,
        endMinute: 24 * 60
    };
}

function cloneModel(model){
    return createPersonalAvailabilityModel(toAvailabilityPayload(model));
}

function validateEntry(entry, label, errors){
    if(entry.state === "available" && entry.ranges.length === 0){
        errors.push(`${label}の参加可能時間を1つ以上入力してください。`);
    }

    if(entry.ranges.length > MAX_AVAILABILITY_RANGES){
        errors.push(`${label}の時間帯は${MAX_AVAILABILITY_RANGES}件までです。`);
    }

    const sorted = entry.ranges.slice().sort((left, right) => left.startMinute - right.startMinute);
    sorted.forEach((range, index) => {
        if(range.startMinute < 0 || range.endMinute <= range.startMinute || range.endMinute > 1800){
            errors.push(`${label}の時間帯は開始より後、かつ30時間以内で設定してください。`);
        }
        if(index > 0 && sorted[index - 1].endMinute > range.startMinute){
            errors.push(`${label}の時間帯が重複しています。`);
        }
    });
}

function findConfirmedConflicts(slot, confirmedSlots, scheduleId){
    const candidateStart = Date.parse(slot?.starts_at ?? slot?.startsAt ?? "");
    const candidateEnd = Date.parse(slot?.ends_at ?? slot?.endsAt ?? "");
    const localDate = normalizeDateKey(slot?.local_date ?? slot?.localDate);
    const midnight = Date.parse(`${localDate}T00:00:00+09:00`);

    if(Number.isNaN(candidateStart) || Number.isNaN(candidateEnd) || Number.isNaN(midnight)){
        return [];
    }

    return array(confirmedSlots)
        .filter(item => String(item?.schedule_id ?? item?.scheduleId ?? "") !== String(scheduleId ?? ""))
        .filter(item => String(item?.status ?? "") === "confirmed")
        .map(item => ({
            start: Date.parse(item?.starts_at ?? item?.startsAt ?? ""),
            end: Date.parse(item?.ends_at ?? item?.endsAt ?? "")
        }))
        .filter(item => !Number.isNaN(item.start) && !Number.isNaN(item.end) && item.end > candidateStart && item.start < candidateEnd)
        .map(item => ({
            startMinute: Math.max(0, Math.round((Math.max(item.start, candidateStart) - midnight) / 60000)),
            endMinute: Math.min(1800, Math.round((Math.min(item.end, candidateEnd) - midnight) / 60000))
        }))
        .filter(range => range.endMinute > range.startMinute);
}

function intersectRanges(left, right){
    return array(left).flatMap(leftRange => array(right).map(rightRange => ({
        startMinute: Math.max(leftRange.startMinute, rightRange.startMinute),
        endMinute: Math.min(leftRange.endMinute, rightRange.endMinute)
    }))).filter(range => range.endMinute > range.startMinute);
}

function subtractRanges(ranges, blockedRanges){
    return array(blockedRanges).reduce((available, blocked) => {
        return available.flatMap(range => {
            if(blocked.endMinute <= range.startMinute || blocked.startMinute >= range.endMinute){
                return [range];
            }

            const next = [];
            if(blocked.startMinute > range.startMinute){
                next.push({ startMinute: range.startMinute, endMinute: blocked.startMinute });
            }
            if(blocked.endMinute < range.endMinute){
                next.push({ startMinute: blocked.endMinute, endMinute: range.endMinute });
            }
            return next;
        });
    }, array(ranges).map(range => ({ ...range })));
}

function emptyDraft(source){
    return {
        answer: "unknown",
        ranges: [],
        source,
        conflicts: []
    };
}

function weekdayForDate(dateKey){
    const date = new Date(`${dateKey}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date.getUTCDay();
}

function normalizeDateKey(value){
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) ? String(value) : "";
}

function number(value){
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function array(value){
    return Array.isArray(value) ? value : [];
}

function collectionEntries(value, keyName){
    if(Array.isArray(value)){
        return value;
    }

    if(value && typeof value === "object"){
        return Object.entries(value).map(([key, item]) => ({
            ...(item && typeof item === "object" ? item : {}),
            [keyName]: key
        }));
    }

    return [];
}
