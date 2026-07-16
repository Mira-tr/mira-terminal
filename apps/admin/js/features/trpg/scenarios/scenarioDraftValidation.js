import {
    isSafeHttpUrl
} from "../../../utils.js";

export function validateScenarioDraft(data, {
    ownerCreatorId = ""
} = {}){
    const errors = [];

    if(!data || typeof data !== "object"){
        errors.push(createScenarioDraftError(
            "invalid-data",
            "入力内容を読み取れませんでした。",
            "シナリオの入力内容が正しい形ではありません。",
            "もう一度入力内容を確認してください。"
        ));
        return {
            ok: false,
            errors
        };
    }

    if(!String(data.title || "").trim()){
        errors.push(createScenarioDraftError(
            "missing-title",
            "シナリオ名が必要です。",
            "一覧や表示確認で何のシナリオか分かるようにするためです。",
            "シナリオ名を入力してください。"
        ));
    }

    if(ownerCreatorId && data.ownerCreatorId && data.ownerCreatorId !== ownerCreatorId){
        errors.push(createScenarioDraftError(
            "invalid-creator",
            "このTRPGを保存できる活動者ではありません。",
            "TRPGは選択した活動者のコレクションとして管理します。",
            "Studioの追加Wizardから活動者を選び直してください。"
        ));
    }

    if(data.url && !isSafeHttpUrl(data.url)){
        errors.push(createScenarioDraftError(
            "invalid-url",
            "URLの形式が正しくありません。",
            "外部リンクは http:// または https:// だけ利用できます。",
            "URLを確認してください。"
        ));
    }

    [
        ["summary", "短い紹介"],
        ["notes", "注意すること"],
        ["storageNote", "保存場所メモ"]
    ].forEach(([key, label]) => {
        if(String(data[key] || "").length > 240){
            errors.push(createScenarioDraftError(
                `${key}-too-long`,
                `${label}が長すぎます。`,
                `${label}は240文字以内にしてください。`,
                "短くまとめてから保存してください。"
            ));
        }
    });

    if(isInvalidRange(data.playersMin, data.playersMax)){
        errors.push(createScenarioDraftError(
            "invalid-player-range",
            "人数の範囲が逆になっています。",
            "最小人数は最大人数以下にしてください。",
            "人数の入力を直してください。"
        ));
    }

    if(isInvalidRange(data.timeMin, data.timeMax)){
        errors.push(createScenarioDraftError(
            "invalid-time-range",
            "時間の範囲が逆になっています。",
            "最短時間は最長時間以下にしてください。",
            "時間の入力を直してください。"
        ));
    }

    return {
        ok: errors.length === 0,
        errors
    };
}

export function createScenarioDraftError(code, title, reason, fix){
    return {
        code,
        title,
        reason,
        fix,
        message: `${title} ${fix}`
    };
}

function isInvalidRange(min, max){
    if(!min || !max){
        return false;
    }

    return Number(min) > Number(max);
}
