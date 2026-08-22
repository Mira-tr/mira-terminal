export const DISCORD_INTERACTION_TYPE = {
    ping: 1,
    applicationCommand: 2
};

export const DISCORD_RESPONSE_TYPE = {
    pong: 1,
    channelMessageWithSource: 4
};

export const DISCORD_MESSAGE_FLAG = {
    ephemeral: 64
};

export const NEXT_SESSION_COMMAND_NAME = "次の卓";

export function verifyDiscordRequestSignature({
    body,
    timestamp,
    signature,
    publicKey,
    verifyDetached
}){
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
        return {
            status: 200,
            body: {
                type: DISCORD_RESPONSE_TYPE.pong
            }
        };
    }

    if(interaction.type !== DISCORD_INTERACTION_TYPE.applicationCommand){
        return badRequestResponse();
    }

    if(interaction.data?.name !== NEXT_SESSION_COMMAND_NAME){
        return ephemeralText("このコマンドにはまだ対応していません。");
    }

    const discordUserId = getInteractionUserId(interaction);
    if(!discordUserId){
        return ephemeralText("Discordユーザーを確認できませんでした。");
    }

    try{
        const nextSession = await handlers.findNextSessionForDiscordUser(discordUserId, now);
        if(!nextSession){
            return ephemeralText("現在、確定している次の卓はありません。");
        }

        return ephemeralText(formatNextSessionMessage(nextSession));
    }catch{
        return ephemeralText("次の卓を確認できませんでした。少し時間をおいて再度試してください。");
    }
}

export function getInteractionUserId(interaction){
    return text(interaction?.member?.user?.id) || text(interaction?.user?.id);
}

export function selectNearestFutureSession(sessions, now = new Date()){
    const nowTime = now.getTime();

    return array(sessions)
        .filter(session => {
            return session?.status === "confirmed" &&
                Number.isFinite(new Date(session.startsAt).getTime()) &&
                new Date(session.startsAt).getTime() >= nowTime;
        })
        .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0] ?? null;
}

export function formatNextSessionMessage(session){
    const role = session.role === "KP" ? "KP" : "PL";
    return [
        `次の卓は「${text(session.title) || "無題の卓"}」です。`,
        `${formatSessionDateTime(session.startsAt, session.endsAt)} / ${role}`,
        "RELMUAのMy Sessionsで詳細を確認してください。"
    ].join("\n");
}

export function ephemeralText(content){
    return {
        status: 200,
        body: {
            type: DISCORD_RESPONSE_TYPE.channelMessageWithSource,
            data: {
                content,
                flags: DISCORD_MESSAGE_FLAG.ephemeral
            }
        }
    };
}

function badRequestResponse(){
    return {
        status: 400,
        body: {
            error: "bad request"
        }
    };
}

function formatSessionDateTime(startsAt, endsAt){
    const start = new Date(startsAt);
    const end = new Date(endsAt);

    if(Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())){
        return "日時未定";
    }

    const dateParts = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "2-digit",
        day: "2-digit",
        weekday: "short"
    }).formatToParts(start);
    const date = Object.fromEntries(dateParts.map(part => [part.type, part.value]));
    const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });

    return `${date.month}.${date.day} ${date.weekday} ${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
}

function hexToUint8Array(hex){
    if(!/^[0-9a-f]+$/i.test(String(hex ?? "")) || hex.length % 2 !== 0){
        return new Uint8Array();
    }

    return new Uint8Array(hex.match(/.{2}/g).map(value => parseInt(value, 16)));
}

function array(value){
    return Array.isArray(value) ? value : [];
}

function text(value){
    return String(value ?? "").trim();
}
