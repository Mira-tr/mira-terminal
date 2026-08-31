const EXPECTED_APPLICATION_IDS = {
    production: "1540825749945196614",
    staging: "1540646111042076702"
};

export function expectedDiscordApplicationId(environment){
    return EXPECTED_APPLICATION_IDS[String(environment ?? "").trim()];
}

export function groupDeliveries(deliveries){
    const groups = new Map();
    for(const delivery of array(deliveries)){
        const key = [delivery.profileId, delivery.type, delivery.scheduleId, delivery.roundId, delivery.sessionId].join(":");
        const group = groups.get(key) ?? [];
        group.push(delivery);
        groups.set(key, group);
    }
    return [...groups.values()];
}

export function renderNotification(deliveries){
    const items = array(deliveries);
    const first = items[0] ?? {};
    const title = text(first.scheduleTitle) || "無題の卓";
    const type = text(first.type);
    const sessions = array(first.sessions);
    const sessionLines = sessions.slice(0, 4).map(session => formatDateTime(session.startsAt, session.endsAt));
    const preparation = preparationDetails(first);

    if(type === "session_confirmed"){
        return message("日程が決まりました", [title, ...sessionLines], [
            button("次の卓を見る", "v10:upcoming", 1),
            button("卓を見る", `v11:table:${first.scheduleId}`, 2)
        ]);
    }
    if(type === "response_stale"){
        const changed = items.length;
        const details = changed === 1 && first.slotStartsAt
            ? [`${formatDateTime(first.slotStartsAt, first.slotEndsAt)} の候補時間が変更されました。`]
            : [`${changed}件の候補が変更されました。`];
        const slotId = text(first.slotId);
        return message("再回答が必要です", [title, ...details], [
            button("再回答する", slotId ? `v11:stale:${first.scheduleId}:${slotId}` : `v11:answer:${first.scheduleId}`, 1),
            button("卓を見る", `v11:table:${first.scheduleId}`, 2)
        ]);
    }
    if(type === "round_opened"){
        return message("新しい日程調整が始まりました", [title, `候補日 ${Number(first.candidateCount) || 0}件`], [
            button("回答する", `v11:answer:${first.scheduleId}`, 1),
            button("日程を見る", `v10:show:${first.scheduleId}:0`, 2)
        ]);
    }
    if(type === "response_reminder"){
        return message("回答が必要です", [title, `未回答 ${Number(first.outstandingCount) || 0}件`], [
            button("回答する", `v11:answer:${first.scheduleId}`, 1),
            button("卓を見る", `v11:table:${first.scheduleId}`, 2)
        ]);
    }
    if(type === "session_day_before"){
        return preparation.count
            ? preparationReminderMessage(title, first.scheduleId, sessionLines, preparation)
            : message(`明日は「${title}」です`, sessionLines.slice(0, 1), [
                button("卓を見る", `v11:table:${first.scheduleId}`, 1),
                button("次の卓を見る", "v10:upcoming", 2)
            ]);
    }
    if(type === "preparation_reminder"){
        return preparationReminderMessage(title, first.scheduleId, sessionLines, preparation);
    }
    return message(`今日は「${title}」です`, sessionLines.slice(0, 1), [
        button("卓を見る", `v11:table:${first.scheduleId}`, 1)
    ]);
}

export function classifyDiscordDelivery(status, payload, attempt){
    const retryAfter = Number(payload?.retry_after);
    if(status === 429){
        return { outcome: "retry", retryAfterSeconds: Number.isFinite(retryAfter) ? Math.ceil(retryAfter) : retryDelay(attempt), errorCode: "discord_rate_limited" };
    }
    if(status >= 500 || status === 0){
        return { outcome: "retry", retryAfterSeconds: retryDelay(attempt), errorCode: "discord_transient_error" };
    }
    if(status >= 400){
        return { outcome: "failed", retryAfterSeconds: null, errorCode: "discord_delivery_unavailable" };
    }
    return { outcome: "sent", retryAfterSeconds: null, errorCode: null };
}

function message(heading, lines, buttons){
    return {
        content: [heading, ...array(lines).filter(Boolean)].join("\n\n"),
        components: buttons.length ? [{ type: 1, components: buttons.slice(0, 5) }] : []
    };
}

function button(label, customId, style){
    return { type: 2, style, label, custom_id: customId };
}

function retryDelay(attempt){
    return Math.min(86400, Math.max(60, 60 * (2 ** Math.max(0, Number(attempt) - 1))));
}

function preparationReminderMessage(title, scheduleId, sessionLines, preparation){
    const count = preparation.count;
    const lines = [
        ...array(sessionLines).slice(0, 1),
        `あなたの準備\n残り ${count}件`,
        preparation.items.length
            ? [...preparation.items.map(item => `・${text(item?.title) || "準備"}`), count > preparation.items.length ? `ほか${count - preparation.items.length}件` : null].filter(Boolean).join("\n")
            : null
    ];
    return message(`明日は「${title}」です`, lines, [
        button("準備を見る", `v12:prep:${scheduleId}`, 1),
        button("卓を見る", `v11:table:${scheduleId}`, 2)
    ]);
}

function preparationDetails(delivery){
    const payload = delivery?.payload && typeof delivery.payload === "object" ? delivery.payload : {};
    const count = Math.max(0, Number(delivery?.preparationCount ?? payload.preparationCount) || 0);
    const items = array(delivery?.preparationItems ?? payload.preparationItems).slice(0, 3);
    return { count, items };
}

function formatDateTime(startsAt, endsAt){
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if(Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) return "日時を確認してください";
    const date = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", weekday: "short" }).format(start);
    const time = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    return `${date} ${time.format(start)}〜${time.format(end)}`;
}

function text(value){
    return String(value ?? "").trim();
}

function array(value){
    return Array.isArray(value) ? value : [];
}
