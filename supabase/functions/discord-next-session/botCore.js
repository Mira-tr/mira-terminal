export const DISCORD_INTERACTION_TYPE = {
    ping: 1,
    applicationCommand: 2,
    messageComponent: 3,
    modalSubmit: 5
};

export const DISCORD_RESPONSE_TYPE = {
    pong: 1,
    channelMessageWithSource: 4,
    updateMessage: 7,
    modal: 9
};

export const DISCORD_MESSAGE_FLAG = {
    ephemeral: 64
};

export const NEXT_SESSION_COMMAND_NAME = "次の卓";
export const SCHEDULE_COMMAND_NAME = "卓";
export const ROUND_COMMAND_NAME = "日程";
export const RESPONSE_COMMAND_NAME = "回答";
export const UPCOMING_COMMAND_NAME = "予定";

const COMMAND_NAMES = new Set([
    NEXT_SESSION_COMMAND_NAME,
    SCHEDULE_COMMAND_NAME,
    ROUND_COMMAND_NAME,
    RESPONSE_COMMAND_NAME,
    UPCOMING_COMMAND_NAME
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function verifyDiscordRequestSignature({ body, timestamp, signature, publicKey, verifyDetached }){
    if(!body || !timestamp || !signature || !publicKey || typeof verifyDetached !== "function"){
        return false;
    }
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(publicKey);
    if(signatureBytes.length !== 64 || publicKeyBytes.length !== 32){
        return false;
    }
    return Boolean(verifyDetached(
        new TextEncoder().encode(`${timestamp}${body}`),
        signatureBytes,
        publicKeyBytes
    ));
}

export async function createInteractionResponse(interaction, handlers, now = new Date()){
    if(!interaction || typeof interaction !== "object"){
        return badRequestResponse();
    }
    if(interaction.type === DISCORD_INTERACTION_TYPE.ping){
        return { status: 200, body: { type: DISCORD_RESPONSE_TYPE.pong } };
    }

    const discordUserId = getInteractionUserId(interaction);
    if(!discordUserId){
        return ephemeralText("Discordユーザーを確認できませんでした。");
    }

    try{
        if(interaction.type === DISCORD_INTERACTION_TYPE.applicationCommand){
            return await handleCommand(interaction, handlers, discordUserId, now);
        }
        if(interaction.type === DISCORD_INTERACTION_TYPE.messageComponent){
            return await handleComponent(interaction, handlers, discordUserId, now);
        }
        if(interaction.type === DISCORD_INTERACTION_TYPE.modalSubmit){
            return await handleModal(interaction, handlers, discordUserId);
        }
    }catch(error){
        return interaction.type === DISCORD_INTERACTION_TYPE.applicationCommand
            ? ephemeralText(safeErrorMessage(error))
            : updateText(safeErrorMessage(error));
    }
    return badRequestResponse();
}

export function getInteractionUserId(interaction){
    return text(interaction?.member?.user?.id) || text(interaction?.user?.id);
}

export function selectNearestFutureSession(sessions, now = new Date()){
    const nowTime = now.getTime();
    return array(sessions)
        .filter(session => ["scheduled", "confirmed"].includes(String(session?.status ?? "")) && new Date(session.startsAt).getTime() >= nowTime)
        .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0] ?? null;
}

export function formatNextSessionMessage(session){
    const role = session.role === "KP" || session.role === "owner" ? "KP" : "PL";
    const sequence = Number(session.sequence);
    return [
        `次の卓は「${text(session.title) || "無題の卓"}」です。`,
        Number.isInteger(sequence) && sequence > 0 ? `SESSION ${String(sequence).padStart(2, "0")}` : null,
        `${formatSessionDateTime(session.startsAt, session.endsAt)} / ${role}`,
        "RELMUAのMy Sessionsで詳細を確認してください。"
    ].filter(Boolean).join("\n");
}

export function ephemeralText(content, components = []){
    return {
        status: 200,
        body: {
            type: DISCORD_RESPONSE_TYPE.channelMessageWithSource,
            data: {
                content,
                flags: DISCORD_MESSAGE_FLAG.ephemeral,
                ...(components.length ? { components } : {})
            }
        }
    };
}

export function updateText(content, components = []){
    return {
        status: 200,
        body: {
            type: DISCORD_RESPONSE_TYPE.updateMessage,
            data: {
                content,
                ...(components.length ? { components } : {})
            }
        }
    };
}

function modal(title, customId, fields){
    return {
        status: 200,
        body: {
            type: DISCORD_RESPONSE_TYPE.modal,
            data: {
                title,
                custom_id: customId,
                components: fields.map(field => ({
                    type: 1,
                    components: [{
                        type: 4,
                        custom_id: field.id,
                        label: field.label,
                        style: field.paragraph ? 2 : 1,
                        required: Boolean(field.required),
                        max_length: field.maxLength,
                        value: field.value ?? "",
                        placeholder: field.placeholder ?? ""
                    }]
                }))
            }
        }
    };
}

async function handleCommand(interaction, handlers, discordUserId, now){
    const command = text(interaction?.data?.name);
    if(!COMMAND_NAMES.has(command)){
        return ephemeralText("このコマンドにはまだ対応していません。");
    }
    if(command === NEXT_SESSION_COMMAND_NAME){
        const nextSession = await handlers.findNextSessionForDiscordUser(discordUserId, now);
        return nextSession ? ephemeralText(formatNextSessionMessage(nextSession)) : ephemeralText("現在、確定している次の卓はありません。");
    }
    if(command === UPCOMING_COMMAND_NAME){
        return renderUpcoming(await handlers.findUpcomingSessionsForDiscordUser(discordUserId, 5, now));
    }
    const schedules = await handlers.listSchedulesForDiscordUser(discordUserId, 0);
    return renderSchedulePicker(schedules, 0, command === RESPONSE_COMMAND_NAME ? "response" : "round");
}

async function handleComponent(interaction, handlers, discordUserId, now){
    const parsed = parseCustomId(interaction?.data?.custom_id);
    if(!parsed){
        return updateText("この操作は期限切れです。もう一度コマンドから開いてください。");
    }
    if(parsed.action === "list"){
        const schedules = await handlers.listSchedulesForDiscordUser(discordUserId, parsed.offset);
        return renderSchedulePicker(schedules, parsed.offset, parsed.mode);
    }
    if(parsed.action === "pick"){
        const scheduleId = text(interaction?.data?.values?.[0]);
        if(!isUuid(scheduleId)){
            return updateText("卓を確認できませんでした。もう一度選択してください。");
        }
        return renderRound(await handlers.getScheduleContext(discordUserId, scheduleId), 0);
    }
    if(parsed.action === "show"){
        return renderRound(await handlers.getScheduleContext(discordUserId, parsed.scheduleId), parsed.page);
    }
    if(parsed.action === "answer"){
        const context = await handlers.saveResponse(discordUserId, {
            scheduleId: parsed.scheduleId,
            slotId: parsed.slotId,
            answer: parsed.answer,
            note: "",
            ranges: []
        });
        return renderRound(context, nextUnansweredIndex(context, parsed.page));
    }
    if(parsed.action === "partial"){
        const context = await handlers.getScheduleContext(discordUserId, parsed.scheduleId);
        return partialModal(parsed.scheduleId, parsed.slotId, ownResponse(context, parsed.slotId));
    }
    if(parsed.action === "memo"){
        const context = await handlers.getScheduleContext(discordUserId, parsed.scheduleId);
        const response = ownResponse(context, parsed.slotId);
        return !response || response.stale
            ? updateText("先に○・△・×を回答してからメモを追加してください。")
            : memoModal(parsed.scheduleId, parsed.slotId, response.note);
    }
    if(parsed.action === "draft"){
        return renderAvailabilityDraft(await handlers.getAvailabilityDraft(discordUserId, parsed.scheduleId));
    }
    if(parsed.action === "apply-draft"){
        const context = await handlers.applyAvailabilityDraft(discordUserId, parsed.scheduleId);
        return renderRound(context, nextUnansweredIndex(context, 0));
    }
    if(parsed.action === "status"){
        return renderResponseStatus(await handlers.getScheduleContext(discordUserId, parsed.scheduleId));
    }
    if(parsed.action === "recommend"){
        return renderRecommendation(await handlers.getRecommendation(discordUserId, parsed.scheduleId, now));
    }
    if(parsed.action === "confirm"){
        const context = await handlers.confirmRecommendation(discordUserId, parsed.scheduleId, parsed.roundId, now);
        return updateText(`日程を確定しました。\n\n${formatConfirmedSessions(context)}`);
    }
    return updateText("この操作には対応していません。");
}

async function handleModal(interaction, handlers, discordUserId){
    const parsed = parseCustomId(interaction?.data?.custom_id);
    if(!parsed){
        return updateText("この入力は期限切れです。もう一度開いてください。");
    }
    const values = modalValues(interaction?.data?.components);
    if(parsed.action === "submit-partial"){
        const ranges = parsePartialRanges(values);
        if(!ranges.ok){
            return updateText(ranges.message);
        }
        const context = await handlers.saveResponse(discordUserId, {
            scheduleId: parsed.scheduleId,
            slotId: parsed.slotId,
            answer: "maybe",
            note: values.memo ?? "",
            ranges: ranges.value
        });
        return asEphemeral(renderRound(context, nextUnansweredIndex(context, 0)));
    }
    if(parsed.action === "submit-memo"){
        return asEphemeral(renderRound(await handlers.saveMemo(discordUserId, {
            scheduleId: parsed.scheduleId,
            slotId: parsed.slotId,
            note: values.memo ?? ""
        }), 0));
    }
    return updateText("この入力には対応していません。");
}

function renderSchedulePicker(payload, offset, mode){
    const schedules = array(payload?.schedules);
    const total = Math.max(0, Number(payload?.totalCount) || 0);
    if(!schedules.length){
        return ephemeralText("参加中の卓はありません。RELMUAで卓へ参加すると、ここにも表示されます。");
    }
    const page = Math.floor(offset / 25) + 1;
    const pages = Math.max(1, Math.ceil(total / 25));
    return ephemeralText(`参加中の卓\n${total}件`, [
        actionRow([{
            type: 3,
            custom_id: `v10:pick:${Math.max(0, offset)}:${mode}`,
            placeholder: "卓を選ぶ",
            min_values: 1,
            max_values: 1,
            options: schedules.slice(0, 25).map(schedule => ({
                label: truncate(schedule.title || "無題の卓", 100),
                value: schedule.scheduleId,
                description: truncate(scheduleDescription(schedule), 100)
            }))
        }]),
        actionRow([
            button("前へ", `v10:list:${Math.max(0, offset - 25)}:${mode}`, 2, offset <= 0),
            button(`${page} / ${pages}`, "v10:noop", 2, true),
            button("次へ", `v10:list:${offset + 25}:${mode}`, 2, offset + 25 >= total)
        ])
    ]);
}

function renderUpcoming(payload){
    const sessions = array(payload?.sessions);
    if(!sessions.length){
        return ephemeralText("現在、予定されている卓はありません。");
    }
    return ephemeralText(["今後の予定", ...sessions.map(item => `${formatSessionDateTime(item.startsAt, item.endsAt)}\n${text(item.title) || "無題の卓"} / ${item.role === "owner" ? "KP" : "PL"}`)].join("\n\n"));
}

function renderRound(context, requestedPage = 0){
    const schedule = context?.schedule ?? {};
    const slots = array(context?.slots);
    const round = openRound(context);
    if(!round || !slots.length){
        return updateText("この卓には、回答できる調整中の日程がありません。");
    }
    const page = Math.max(0, Math.min(Number(requestedPage) || 0, slots.length - 1));
    const slot = slots[page];
    const response = ownResponse(context, slot.id);
    const summary = array(context?.summaries).find(item => same(item.slotId, slot.id)) ?? {};
    const isOwner = Boolean(context?.bot?.isOwner ?? context?.me?.role === "owner");
    const current = response?.stale ? "再回答が必要" : response ? answerLabel(response.answer, response.ranges) : "未回答";
    const content = [
        `${text(schedule.title) || "無題の卓"} / ROUND ${String(round.sequence ?? "").padStart(2, "0")}`,
        formatSlot(slot),
        `現在: ${current}`,
        `回答 ${Number(summary.answered) || 0} / ${array(context?.participants).filter(item => item.required !== false).length}`,
        response?.stale ? "この候補は更新されました。以前の回答は集計に使われません。" : null
    ].filter(Boolean).join("\n");
    const rows = [
        actionRow([
            button("○", `v10:answer:yes:${schedule.id}:${slot.id}`, 3),
            button("△", `v10:partial:${schedule.id}:${slot.id}`, 1),
            button("×", `v10:answer:no:${schedule.id}:${slot.id}`, 4)
        ]),
        actionRow([
            button("前へ", `v10:show:${schedule.id}:${Math.max(0, page - 1)}`, 2, page === 0),
            button(`${page + 1} / ${slots.length}`, "v10:noop", 2, true),
            button("次へ", `v10:show:${schedule.id}:${Math.min(slots.length - 1, page + 1)}`, 2, page >= slots.length - 1)
        ]),
        actionRow([
            button("メモ", `v10:memo:${schedule.id}:${slot.id}`, 2, !response || response.stale),
            button("空き時間から回答案", `v10:draft:${schedule.id}`, 2)
        ])
    ];
    if(isOwner){
        rows.push(actionRow([
            button("回答状況", `v10:status:${schedule.id}`, 2),
            button("おすすめ", `v10:recommend:${schedule.id}`, 1)
        ]));
    }
    return updateText(content, rows);
}

function renderAvailabilityDraft(draft){
    const suggestions = array(draft?.suggestions);
    const context = draft?.context;
    if(!context || !suggestions.length){
        return updateText("空き時間から作れる回答案はありません。日程を開いて手入力してください。");
    }
    return updateText(["空き時間からの回答案", ...suggestions.map(item => `${formatSlot(item.slot)} ${answerLabel(item.answer, item.ranges)}`), "この内容はまだ保存されていません。"].join("\n"), [
        actionRow([
            button("この内容を使う", `v10:apply-draft:${context.schedule.id}`, 3),
            button("日程へ戻る", `v10:show:${context.schedule.id}:0`, 2)
        ])
    ]);
}

function renderResponseStatus(context){
    if(!context?.bot?.isOwner){
        return updateText("この卓の回答状況はKPだけが確認できます。");
    }
    const participants = array(context?.participants).filter(item => item.role !== "viewer");
    const completed = participants.filter(item => item.answered).length;
    return updateText([
        `${text(context?.schedule?.title) || "無題の卓"} / ROUND ${String(openRound(context)?.sequence ?? "").padStart(2, "0")}`,
        `回答済み ${completed} / ${participants.length}`,
        ...participants.map(item => `${text(item.displayName) || "参加者"} ${item.answered ? "回答済み" : "未回答"}`)
    ].join("\n"), [actionRow([button("日程へ戻る", `v10:show:${context.schedule.id}:0`, 2)])]);
}

function renderRecommendation(result){
    const context = result?.context;
    const plan = result?.plan;
    if(!context?.bot?.isOwner){
        return updateText("おすすめの確認と確定はKPだけが行えます。");
    }
    if(!plan?.primary?.length || !plan?.meetsPreferred){
        return updateText("全員の最新回答だけでは、想定プレイ時間を満たすおすすめを作れません。", [actionRow([button("日程へ戻る", `v10:show:${context.schedule.id}:0`, 2)])]);
    }
    const primary = plan.primary.map(item => `${formatSlot(item.item.slot)} ${formatMinuteDuration(item.minutes)}`);
    const reserve = array(plan.reserve).map(item => formatSlot(item.item.slot));
    return updateText(["おすすめ", "本番", ...primary, `計 ${formatMinuteDuration(plan.totalMinutes)}`, reserve.length ? `予備\n${reserve.join("\n")}` : null].filter(Boolean).join("\n"), [
        actionRow([
            button("このプランで確定", `v10:confirm:${context.schedule.id}:${openRound(context)?.id}`, 3),
            button("日程へ戻る", `v10:show:${context.schedule.id}:0`, 2)
        ])
    ]);
}

function partialModal(scheduleId, slotId, response){
    const ranges = array(response?.ranges);
    return modal("△ 参加できる時間", `v10:submit-partial:${scheduleId}:${slotId}`, [
        rangeField("range1", "時間帯 1（例 22:00-翌02:00）", ranges[0], true),
        rangeField("range2", "追加時間帯 2（任意）", ranges[1]),
        rangeField("range3", "追加時間帯 3（任意）", ranges[2]),
        rangeField("range4", "追加時間帯 4（任意）", ranges[3]),
        { id: "memo", label: "ひとことメモ（任意）", paragraph: true, maxLength: 120, value: text(response?.note) }
    ]);
}

function memoModal(scheduleId, slotId, note){
    return modal("この日のひとことメモ", `v10:submit-memo:${scheduleId}:${slotId}`, [
        { id: "memo", label: "メモ（任意）", paragraph: true, maxLength: 120, value: text(note) }
    ]);
}

function rangeField(id, label, range, required = false){
    return {
        id, label, required, maxLength: 15, placeholder: "22:00-翌02:00",
        value: range ? `${formatMinute(Number(range.startMinute ?? range.start_minute))}-${formatEndMinute(Number(range.endMinute ?? range.end_minute))}` : ""
    };
}

function nextUnansweredIndex(context, fallback){
    const next = array(context?.slots).findIndex(slot => {
        const response = ownResponse(context, slot.id);
        return !response || response.stale;
    });
    return next >= 0 ? next : Math.max(0, Number(fallback) || 0);
}

function ownResponse(context, slotId){
    return array(context?.responses).find(item => same(item.slotId, slotId));
}

function openRound(context){
    return array(context?.rounds).find(item => ["draft", "open"].includes(String(item.status))) ?? null;
}

function parseCustomId(value){
    const parts = String(value ?? "").split(":");
    if(parts[0] !== "v10") return null;
    const action = parts[1];
    if(action === "list" && Number.isInteger(Number(parts[2])) && ["round", "response"].includes(parts[3])){
        return { action, offset: Math.max(0, Number(parts[2])), mode: parts[3] };
    }
    if(action === "pick" && Number.isInteger(Number(parts[2])) && ["round", "response"].includes(parts[3])){
        return { action, offset: Math.max(0, Number(parts[2])), mode: parts[3] };
    }
    if(["show", "draft", "apply-draft", "status", "recommend"].includes(action) && isUuid(parts[2])){
        return { action, scheduleId: parts[2], page: Math.max(0, Number(parts[3]) || 0) };
    }
    if(["answer", "partial", "memo", "submit-partial", "submit-memo"].includes(action)){
        const position = action === "answer" ? 3 : 2;
        if(!isUuid(parts[position]) || !isUuid(parts[position + 1])) return null;
        if(action === "answer" && !["yes", "no"].includes(parts[2])) return null;
        return { action, scheduleId: parts[position], slotId: parts[position + 1], answer: parts[2] };
    }
    if(action === "confirm" && isUuid(parts[2]) && isUuid(parts[3])){
        return { action, scheduleId: parts[2], roundId: parts[3] };
    }
    return null;
}

function modalValues(rows){
    const values = {};
    array(rows).forEach(row => array(row?.components).forEach(component => {
        if(text(component?.custom_id)) values[component.custom_id] = text(component?.value);
    }));
    return values;
}

export function parsePartialRanges(values){
    const ranges = [];
    for(const key of ["range1", "range2", "range3", "range4"]){
        const raw = text(values?.[key]);
        if(!raw) continue;
        const match = raw.match(/^(翌?\d{1,2}:\d{2})\s*[-〜~]\s*(翌?\d{1,2}:\d{2})$/);
        if(!match) return { ok: false, message: "時間帯は「22:00-翌02:00」の形式で入力してください。" };
        const startMinute = parseTimeToken(match[1]);
        let endMinute = parseTimeToken(match[2]);
        if(startMinute === null || endMinute === null) return { ok: false, message: "時刻を確認してください。" };
        if(endMinute <= startMinute && !match[2].startsWith("翌")) endMinute += 1440;
        if(endMinute <= startMinute || endMinute > 1800) return { ok: false, message: "終了は開始より後、かつ翌06:00までで入力してください。" };
        if(ranges.some(item => item.startMinute < endMinute && startMinute < item.endMinute)) return { ok: false, message: "時間帯が重複しています。" };
        ranges.push({ startMinute, endMinute, answer: "maybe" });
    }
    return ranges.length ? { ok: true, value: ranges.sort((left, right) => left.startMinute - right.startMinute) } : { ok: false, message: "△の参加可能時間を1つ以上入力してください。" };
}

function parseTimeToken(value){
    const match = String(value ?? "").match(/^(翌?)(\d{1,2}):(\d{2})$/);
    if(!match) return null;
    const hour = Number(match[2]);
    const minute = Number(match[3]);
    if(hour > 23 || minute > 59) return null;
    return hour * 60 + minute + (match[1] ? 1440 : 0);
}

function formatSlot(slot){
    const date = String(slot?.localDate ?? slot?.local_date ?? "").replace(/-/g, "/");
    return `${date} ${formatMinute(Number(slot?.startMinute ?? slot?.start_minute))}-${formatEndMinute(Number(slot?.endMinute ?? slot?.end_minute))}`.trim();
}

function formatMinute(value){
    const minute = Math.max(0, Number(value) || 0);
    return `${String(Math.floor((minute % 1440) / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function formatEndMinute(value){
    const minute = Math.max(0, Number(value) || 0);
    return minute >= 1440 ? `翌${formatMinute(minute - 1440)}` : formatMinute(minute);
}

function answerLabel(answer, ranges){
    if(answer === "yes") return "○";
    if(answer === "no") return "×";
    if(answer === "maybe"){
        const formatted = array(ranges).map(range => `${formatMinute(Number(range.startMinute ?? range.start_minute))}-${formatEndMinute(Number(range.endMinute ?? range.end_minute))}`);
        return formatted.length ? `△ ${formatted.join(" / ")}` : "△";
    }
    return "未回答";
}

function formatConfirmedSessions(context){
    const sessions = array(context?.sessions).filter(item => item.status === "scheduled");
    return sessions.length ? sessions.map(item => `SESSION ${String(item.sequence).padStart(2, "0")} ${formatSessionDateTime(item.startsAt, item.endsAt)}`).join("\n") : "確定した日程を確認してください。";
}

function formatMinuteDuration(minutes){
    const value = Math.max(0, Number(minutes) || 0);
    const hours = Math.floor(value / 60);
    const remainder = value % 60;
    return remainder ? `${hours}時間${remainder}分` : `${hours}時間`;
}

function scheduleDescription(schedule){
    const round = schedule.roundSequence ? `ROUND ${String(schedule.roundSequence).padStart(2, "0")}` : "調整中の日程なし";
    return schedule.unansweredCount ? `${round} / 未回答 ${schedule.unansweredCount}件` : round;
}

function actionRow(components){ return { type: 1, components }; }
function button(label, customId, style, disabled = false){ return { type: 2, style, label, custom_id: customId, disabled }; }
function asEphemeral(response){ return ephemeralText(response.body?.data?.content ?? "更新しました。", response.body?.data?.components ?? []); }

function safeErrorMessage(error){
    const message = String(error?.message ?? "").toLowerCase();
    if(message.includes("linked") || message.includes("discord account")) return "DiscordアカウントがRELMUAに連携されていません。RELMUAでDiscordログインを完了してから、もう一度お試しください。";
    if(message.includes("access denied") || message.includes("owner access") || message.includes("participant access")) return "この卓を操作する権限を確認できませんでした。";
    if(message.includes("stale") || message.includes("revision")) return "日程が更新されたため、そのまま保存できませんでした。最新の日程を表示して再回答してください。";
    if(message.includes("range") || message.includes("candidate time")) return "入力した時間が候補日の範囲に収まりません。最新の日程を確認してください。";
    return "処理に失敗しました。少し時間をおいて、もう一度お試しください。";
}

function badRequestResponse(){ return { status: 400, body: { error: "bad request" } }; }

function formatSessionDateTime(startsAt, endsAt){
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if(Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "日時未定";
    const dateParts = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(start);
    const date = Object.fromEntries(dateParts.map(part => [part.type, part.value]));
    const time = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false });
    return `${date.month}.${date.day} ${date.weekday} ${time.format(start)} - ${time.format(end)}`;
}

function hexToUint8Array(hex){
    if(!/^[0-9a-f]+$/i.test(String(hex ?? "")) || hex.length % 2 !== 0) return new Uint8Array();
    return new Uint8Array(hex.match(/.{2}/g).map(value => parseInt(value, 16)));
}
function array(value){ return Array.isArray(value) ? value : []; }
function text(value){ return String(value ?? "").trim(); }
function truncate(value, length){ const source = text(value); return source.length > length ? `${source.slice(0, Math.max(1, length - 1))}…` : source || "無題の卓"; }
function isUuid(value){ return UUID.test(String(value ?? "")); }
function same(left, right){ return String(left ?? "") === String(right ?? ""); }
