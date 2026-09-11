export const MAX_TEXT_CANDIDATES = 120;

export function parseCandidateText(source, options = {}){
    const now = options.now instanceof Date ? options.now : new Date();
    const maxCandidates = Number.isInteger(options.maxCandidates) && options.maxCandidates > 0
        ? options.maxCandidates
        : MAX_TEXT_CANDIDATES;
    const lines = String(source ?? "").split(/\r?\n/);
    const entries = [];
    const errors = [];
    const warnings = [];
    const seen = new Set();

    lines.forEach((rawLine, index) => {
        const line = normalizeLine(rawLine);
        if(!line){
            return;
        }

        const parsed = parseCandidateLine(line, now);
        if(!parsed.ok){
            errors.push(`${index + 1}行目: ${parsed.error}`);
            return;
        }

        const key = [
            parsed.entry.dateKey,
            parsed.entry.startTime,
            parsed.entry.endTime,
            parsed.entry.endsNextDay ? "next" : "same"
        ].join("|");

        if(seen.has(key)){
            warnings.push(`${index + 1}行目は同じ候補があるため重複を省きました。`);
            return;
        }

        seen.add(key);
        entries.push(parsed.entry);
    });

    if(entries.length === 0 && errors.length === 0){
        errors.push("候補日時を1行以上入力してください。");
    }

    if(entries.length > maxCandidates){
        errors.push(`候補は一度に${maxCandidates}件までです。`);
    }

    return {
        ok: errors.length === 0 && entries.length > 0 && entries.length <= maxCandidates,
        entries: entries.slice(0, maxCandidates),
        errors,
        warnings
    };
}

export function parseCandidateLine(source, now = new Date()){
    const line = normalizeLine(source);
    const datePart = parseDatePrefix(line);

    if(!datePart){
        return {
            ok: false,
            error: "日付と時間を「9/18 20-24」のように入力してください。"
        };
    }

    const dateKey = resolveDateKey(datePart, now);
    if(!dateKey){
        return {
            ok: false,
            error: "日付を確認してください。"
        };
    }

    const time = parseTimeRange(datePart.rest);
    if(!time){
        return {
            ok: false,
            error: "時間を「20-24」または「20:30-翌1:00」のように入力してください。"
        };
    }

    return {
        ok: true,
        entry: {
            dateKey,
            startTime: time.startTime,
            endTime: time.endTime,
            endsNextDay: time.endsNextDay
        }
    };
}

export function formatParsedCandidate(entry){
    if(!entry){
        return "";
    }

    const date = String(entry.dateKey ?? "");
    const time = entry.endsNextDay
        ? `${entry.startTime}-翌${entry.endTime}`
        : `${entry.startTime}-${entry.endTime}`;
    return `${date} ${time}`;
}

function normalizeLine(value){
    return String(value ?? "")
        .normalize("NFKC")
        .replace(/[〜～—–−]/g, "-")
        .replace(/、/g, ",")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[;,]+$/, "");
}

function parseDatePrefix(line){
    const patterns = [
        /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\s+(.+)$/,
        /^(\d{1,2})[\/-](\d{1,2})\s+(.+)$/,
        /^(\d{4})年(\d{1,2})月(\d{1,2})日?\s+(.+)$/,
        /^(\d{1,2})月(\d{1,2})日?\s+(.+)$/
    ];

    for(const pattern of patterns){
        const match = line.match(pattern);
        if(!match){
            continue;
        }

        if(match.length === 5){
            return {
                year: Number(match[1]),
                month: Number(match[2]),
                day: Number(match[3]),
                rest: match[4]
            };
        }

        return {
            year: null,
            month: Number(match[1]),
            day: Number(match[2]),
            rest: match[3]
        };
    }

    return null;
}

function resolveDateKey(parts, now){
    const today = japanDateParts(now);
    const explicitYear = Number.isInteger(parts.year) ? parts.year : null;
    let year = explicitYear ?? today.year;

    if(!isRealDate(year, parts.month, parts.day)){
        return "";
    }

    let dateKey = toDateKey(year, parts.month, parts.day);
    const todayKey = toDateKey(today.year, today.month, today.day);

    if(explicitYear === null && dateKey < todayKey){
        year += 1;
        if(!isRealDate(year, parts.month, parts.day)){
            return "";
        }
        dateKey = toDateKey(year, parts.month, parts.day);
    }

    return dateKey;
}

function parseTimeRange(source){
    const normalized = normalizeTimeText(source);
    const match = normalized.match(/^(翌)?(\d{1,2})(?::(\d{1,2}))?\s*-\s*(翌)?(\d{1,2})(?::(\d{1,2}))?$/);

    if(!match){
        return null;
    }

    if(match[1]){
        return null;
    }

    const startHour = Number(match[2]);
    const startMinute = Number(match[3] ?? 0);
    const explicitNext = Boolean(match[4]);
    const endHourRaw = Number(match[5]);
    const endMinute = Number(match[6] ?? 0);

    if(
        startHour < 0 || startHour > 23
        || startMinute < 0 || startMinute > 59
        || endHourRaw < 0 || endHourRaw > 47
        || endMinute < 0 || endMinute > 59
    ){
        return null;
    }

    const startTotal = startHour * 60 + startMinute;
    const endClockHour = endHourRaw % 24;
    const endClockTotal = endClockHour * 60 + endMinute;
    const endsNextDay = explicitNext || endHourRaw >= 24 || endClockTotal <= startTotal;
    const durationMinutes = endsNextDay
        ? 24 * 60 - startTotal + endClockTotal
        : endClockTotal - startTotal;

    if(durationMinutes <= 0 || durationMinutes > 1800){
        return null;
    }

    return {
        startTime: `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`,
        endTime: `${String(endClockHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`,
        endsNextDay
    };
}

function normalizeTimeText(value){
    return String(value ?? "")
        .replace(/(\d{1,2})時(?:(\d{1,2})分?)?/g, (_, hour, minute) => minute ? `${hour}:${minute}` : hour)
        .replace(/\s+/g, " ")
        .trim();
}

function japanDateParts(date){
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date).map(part => [part.type, part.value]));

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day)
    };
}

function isRealDate(year, month, day){
    if(
        !Number.isInteger(year) || year < 2000 || year > 2100
        || !Number.isInteger(month) || month < 1 || month > 12
        || !Number.isInteger(day) || day < 1 || day > 31
    ){
        return false;
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}

function toDateKey(year, month, day){
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
