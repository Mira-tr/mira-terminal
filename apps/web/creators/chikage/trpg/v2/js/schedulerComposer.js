export const JAPAN_TIME_ZONE = "Asia/Tokyo";
export const MAX_CANDIDATES_PER_BATCH = 120;

const DEFAULT_BULK_TIME = {
    startTime: "20:00",
    endTime: "00:00",
    endsNextDay: true,
    applyMode: "unmodified"
};

export function createCandidateComposer(now = new Date()){
    return {
        month: monthKeyFromDate(now),
        selections: {},
        bulk: {
            ...DEFAULT_BULK_TIME
        }
    };
}

export function createMonthDays(monthKey){
    const parsed = parseMonthKey(monthKey);

    if(!parsed){
        return [];
    }

    const first = new Date(Date.UTC(parsed.year, parsed.month - 1, 1));
    const leadingDays = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(parsed.year, parsed.month, 0)).getUTCDate();
    const days = [];

    for(let index = 0; index < leadingDays; index += 1){
        days.push(null);
    }

    for(let day = 1; day <= daysInMonth; day += 1){
        days.push({
            day,
            dateKey: toDateKey(parsed.year, parsed.month, day),
            weekday: new Date(Date.UTC(parsed.year, parsed.month - 1, day)).getUTCDay()
        });
    }

    while(days.length % 7 !== 0){
        days.push(null);
    }

    return days;
}

export function shiftComposerMonth(composer, amount){
    const parsed = parseMonthKey(composer?.month);
    const offset = Number.isInteger(amount) ? amount : 0;

    if(!parsed || offset === 0){
        return normalizeComposer(composer);
    }

    const date = new Date(Date.UTC(parsed.year, parsed.month - 1 + offset, 1));
    return {
        ...normalizeComposer(composer),
        month: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
    };
}

export function toggleComposerDate(composer, dateKey){
    const next = normalizeComposer(composer);

    if(!isDateKey(dateKey)){
        return next;
    }

    if(next.selections[dateKey]){
        delete next.selections[dateKey];
        return next;
    }

    if(countSelectedWindows(next) >= MAX_CANDIDATES_PER_BATCH){
        return next;
    }

    next.selections[dateKey] = [defaultSelection(next.bulk)];
    return next;
}

export function updateComposerBulk(composer, fields = {}){
    const next = normalizeComposer(composer);
    next.bulk = normalizeBulk({
        ...next.bulk,
        ...fields
    });
    return next;
}

export function applyComposerBulk(composer, mode = composer?.bulk?.applyMode){
    const next = normalizeComposer(composer);
    const applyMode = mode === "all" ? "all" : "unmodified";

    Object.entries(next.selections).forEach(([dateKey, windows]) => {
        next.selections[dateKey] = windows.map(selection => {
            if(applyMode === "unmodified" && selection.isOverridden){
                return selection;
            }

            return defaultSelection(next.bulk);
        });
    });

    next.bulk.applyMode = applyMode;
    return next;
}

export function updateComposerSelection(composer, dateKey, fields = {}){
    return updateComposerWindow(composer, dateKey, 0, fields);
}

export function updateComposerWindow(composer, dateKey, windowIndex, fields = {}){
    const next = normalizeComposer(composer);
    const windows = next.selections[dateKey];
    const current = windows?.[windowIndex];

    if(!current){
        return next;
    }

    windows[windowIndex] = normalizeSelection({
        ...current,
        ...fields,
        isOverridden: true
    }, next.bulk);
    return next;
}

export function addComposerWindow(composer, dateKey){
    const next = normalizeComposer(composer);
    const windows = next.selections[dateKey];
    const total = countSelectedWindows(next);

    if(!windows || total >= MAX_CANDIDATES_PER_BATCH){
        return next;
    }

    windows.push(defaultSelection(next.bulk));
    return next;
}

export function removeComposerWindow(composer, dateKey, windowIndex){
    const next = normalizeComposer(composer);
    const windows = next.selections[dateKey];

    if(!windows?.[windowIndex]){
        return next;
    }

    if(windows.length === 1){
        delete next.selections[dateKey];
        return next;
    }

    windows.splice(windowIndex, 1);
    return next;
}

export function buildCandidateBatch(composer, expectedDurationMinutes = 0){
    const normalized = normalizeComposer(composer);
    const entries = Object.entries(normalized.selections).sort(([left], [right]) => left.localeCompare(right));

    if(entries.length === 0){
        return {
            ok: false,
            errors: ["候補日を1日以上選択してください。"],
            warnings: [],
            candidates: []
        };
    }

    const errors = [];
    const warnings = [];
    const candidates = [];
    const requiredMinutes = normalizePositiveInteger(expectedDurationMinutes, 0);

    entries.forEach(([dateKey, windows]) => {
        windows.forEach(selection => {
            const result = inspectCandidateSelection(dateKey, selection);

            if(!result.ok){
                errors.push(result.error);
                return;
            }

            if(requiredMinutes > 0 && result.durationMinutes < requiredMinutes){
                warnings.push(`${formatJapaneseDate(dateKey)}は想定プレイ時間より短い候補です。`);
            }

            candidates.push(result.candidate);
        });
    });

    return {
        ok: errors.length === 0,
        errors,
        warnings,
        candidates
    };
}

export function formatDurationMinutes(value){
    const total = normalizePositiveInteger(value, 0);
    const hours = Math.floor(total / 60);
    const minutes = total % 60;

    if(hours === 0){
        return `${minutes}分`;
    }

    return minutes === 0 ? `${hours}時間` : `${hours}時間${minutes}分`;
}

export function combineDurationMinutes(hours, minutes){
    const wholeHours = normalizePositiveInteger(hours, -1);
    const remainingMinutes = normalizePositiveInteger(minutes, -1);

    if(wholeHours < 0 || remainingMinutes < 0 || remainingMinutes > 59){
        return null;
    }

    const total = wholeHours * 60 + remainingMinutes;
    return total >= 30 && total <= 1800 ? total : null;
}

export function formatCandidateTime(selection){
    const normalized = normalizeSelection(selection);
    return normalized.endsNextDay
        ? `${normalized.startTime} - 翌${normalized.endTime}`
        : `${normalized.startTime} - ${normalized.endTime}`;
}

export function formatJapaneseDate(dateKey){
    if(!isDateKey(dateKey)){
        return "日付";
    }

    const date = new Date(`${dateKey}T00:00:00+09:00`);
    return new Intl.DateTimeFormat("ja-JP", {
        timeZone: JAPAN_TIME_ZONE,
        month: "2-digit",
        day: "2-digit",
        weekday: "short"
    }).format(date);
}

export function resolveDiscordDisplayName(metadata, fallback = "RELMUA User"){
    const source = metadata && typeof metadata === "object" ? metadata : {};
    const values = [
        source.global_name,
        source.full_name,
        source.username,
        source.user_name,
        source.preferred_username,
        source.name
    ];

    return values
        .map(value => String(value ?? "").trim())
        .find(Boolean)
        ?.slice(0, 80) || String(fallback ?? "RELMUA User").trim().slice(0, 80) || "RELMUA User";
}

export function inspectCandidateSelection(dateKey, selection){
    const normalized = normalizeSelection(selection);

    if(!isDateKey(dateKey)){
        return {
            ok: false,
            error: "候補日の日時を確認してください。"
        };
    }

    const startMinute = timeToMinute(normalized.startTime);
    const endMinute = timeToMinute(normalized.endTime);

    if(startMinute === null){
        return {
            ok: false,
            error: `${formatJapaneseDate(dateKey)}の開始時刻を入力してください。`
        };
    }

    if(endMinute === null){
        return {
            ok: false,
            error: `${formatJapaneseDate(dateKey)}の終了時刻を入力してください。`
        };
    }

    if(!normalized.endsNextDay && endMinute <= startMinute){
        return {
            ok: false,
            error: `${formatJapaneseDate(dateKey)}の終了は開始より後にしてください。日付をまたぐ場合は「翌日終了」を選んでください。`
        };
    }

    const durationMinutes = normalized.endsNextDay
        ? 24 * 60 - startMinute + endMinute
        : endMinute - startMinute;

    if(durationMinutes <= 0 || durationMinutes > 1800){
        return {
            ok: false,
            error: `${formatJapaneseDate(dateKey)}の候補は30時間以内にしてください。`
        };
    }

    const endDate = normalized.endsNextDay ? addDays(dateKey, 1) : dateKey;
    const startsAt = createJapanIso(dateKey, normalized.startTime);
    const endsAt = createJapanIso(endDate, normalized.endTime);

    if(!startsAt || !endsAt || new Date(endsAt).getTime() <= new Date(startsAt).getTime()){
        return {
            ok: false,
            error: `${formatJapaneseDate(dateKey)}の日時を確認してください。`
        };
    }

    return {
        ok: true,
        durationMinutes,
        candidate: {
            startsAt,
            endsAt,
            label: ""
        }
    };
}

function normalizeComposer(value){
    const source = value && typeof value === "object" ? value : {};
    const selections = {};
    const bulk = normalizeBulk(source.bulk);

    Object.entries(source.selections && typeof source.selections === "object" ? source.selections : {}).forEach(([dateKey, selection]) => {
        if(isDateKey(dateKey)){
            selections[dateKey] = normalizeWindows(selection, bulk);
        }
    });

    return {
        month: parseMonthKey(source.month) ? source.month : monthKeyFromDate(new Date()),
        selections,
        bulk
    };
}

function normalizeBulk(value){
    const source = value && typeof value === "object" ? value : {};
    return {
        startTime: normalizeTime(source.startTime, DEFAULT_BULK_TIME.startTime),
        endTime: normalizeTime(source.endTime, DEFAULT_BULK_TIME.endTime),
        endsNextDay: Boolean(source.endsNextDay ?? DEFAULT_BULK_TIME.endsNextDay),
        applyMode: source.applyMode === "all" ? "all" : "unmodified"
    };
}

function normalizeSelection(value, fallback = DEFAULT_BULK_TIME){
    const source = value && typeof value === "object" ? value : {};
    return {
        startTime: normalizeTime(source.startTime, fallback.startTime),
        endTime: normalizeTime(source.endTime, fallback.endTime),
        endsNextDay: Boolean(source.endsNextDay ?? fallback.endsNextDay),
        isOverridden: Boolean(source.isOverridden)
    };
}

function defaultSelection(bulk){
    return {
        startTime: bulk.startTime,
        endTime: bulk.endTime,
        endsNextDay: bulk.endsNextDay,
        isOverridden: false
    };
}

function normalizeWindows(value, bulk){
    const source = Array.isArray(value) ? value : [value];
    return source.slice(0, MAX_CANDIDATES_PER_BATCH).map(item => normalizeSelection(item, bulk));
}

function countSelectedWindows(composer){
    return Object.values(composer.selections).reduce((total, windows) => total + windows.length, 0);
}

function monthKeyFromDate(value){
    const date = value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date();
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
        timeZone: JAPAN_TIME_ZONE,
        year: "numeric",
        month: "2-digit"
    }).formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}`;
}

function parseMonthKey(value){
    const match = String(value ?? "").match(/^(\d{4})-(\d{2})$/);

    if(!match){
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    return Number.isInteger(year) && month >= 1 && month <= 12 ? { year, month } : null;
}

function createJapanIso(dateKey, time){
    const normalizedTime = normalizeTime(time, "");

    if(!isDateKey(dateKey) || !normalizedTime){
        return "";
    }

    const date = new Date(`${dateKey}T${normalizedTime}:00+09:00`);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function addDays(dateKey, amount){
    const [year, month, day] = dateKey.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + amount));
    return toDateKey(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function isDateKey(value){
    const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if(!match){
        return false;
    }

    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return date.getUTCFullYear() === Number(match[1]) &&
        date.getUTCMonth() === Number(match[2]) - 1 &&
        date.getUTCDate() === Number(match[3]);
}

function toDateKey(year, month, day){
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeTime(value, fallback){
    const time = String(value ?? "").trim();
    return timeToMinute(time) === null ? fallback : time;
}

function timeToMinute(value){
    const match = String(value ?? "").match(/^(\d{2}):(\d{2})$/);

    if(!match){
        return null;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? hour * 60 + minute : null;
}

function normalizePositiveInteger(value, fallback){
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}
