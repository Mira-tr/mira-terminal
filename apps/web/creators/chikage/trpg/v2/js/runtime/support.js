import {
    formatMinuteTime,
    MAX_AVAILABILITY_RANGES,
    timeToMinute
} from "../availabilityModel.js";
import {
    formatDateLockup,
    formatTimeRange
} from "../sessionViewModel.js";

export function minutesFromTimeFields(fields, fallback){
    const startMinute = timeToMinute(fields.startTime ?? formatMinuteTime(fallback?.startMinute));
    const endBase = timeToMinute(fields.endTime ?? formatMinuteTime(fallback?.endMinute));

    if(startMinute === null || endBase === null){
        return null;
    }

    const endsNextDay = endBase <= startMinute;

    return {
        startMinute,
        endMinute: endBase + (endsNextDay ? 1440 : 0)
    };
}

export function normalizeMinuteRange(range){
    return {
        startMinute: Number(range?.startMinute ?? range?.start_minute ?? 0),
        endMinute: Number(range?.endMinute ?? range?.end_minute ?? 0)
    };
}

export function validatePartialRanges(slot, ranges){
    const slotStart = Number(slot?.start_minute ?? slot?.startMinute);
    const slotEnd = Number(slot?.end_minute ?? slot?.endMinute);
    const normalized = ranges.map(normalizeMinuteRange).sort((left, right) => left.startMinute - right.startMinute);

    if(normalized.length === 0 || normalized.length > MAX_AVAILABILITY_RANGES){
        return {
            ok: false,
            error: `参加可能時間は1〜${MAX_AVAILABILITY_RANGES}件で入力してください。`
        };
    }

    for(let index = 0; index < normalized.length; index += 1){
        const range = normalized[index];
        if(!Number.isFinite(range.startMinute) || !Number.isFinite(range.endMinute) ||
            range.endMinute <= range.startMinute || range.startMinute < slotStart || range.endMinute > slotEnd){
            return {
                ok: false,
                error: "参加可能時間は候補時間の範囲内で設定してください。"
            };
        }

        if(index > 0 && normalized[index - 1].endMinute > range.startMinute){
            return {
                ok: false,
                error: "参加可能時間が重複しています。"
            };
        }
    }

    return {
        ok: true,
        ranges: normalized
    };
}

export function formatComposerMonth(monthKey){
    const [year, month] = String(monthKey ?? "").split("-").map(Number);
    return Number.isInteger(year) && Number.isInteger(month) ? `${year}年${month}月` : "候補日";
}

export function formatDateLine(slot){
    const lockup = formatDateLockup(slot);
    return `${lockup.month} ${lockup.day} ${lockup.weekday} / ${formatTimeRange(slot)}`;
}

export function toUserMessage(error){
    const message = String(error?.message ?? "");

    if(/timeout|timed out/i.test(message)){
        return "読み込みに時間がかかっています。通信状態を確認して、もう一度お試しください。";
    }

    if(/auth|login|jwt|permission|denied|row-level|RLS/i.test(message)){
        return "権限を確認できませんでした。ログイン状態または参加権限を確認してください。";
    }

    if(/network|fetch|config/i.test(message)){
        return "通信または設定を確認できませんでした。時間をおいて再度試してください。";
    }

    if(/duplicate|unique|already/i.test(message)){
        return "すでに参加済みの可能性があります。招待URLを開き直してください。";
    }

    if(/invalid|not found|available/i.test(message)){
        return "入力内容または招待URLを確認してください。";
    }

    return "処理に失敗しました。少し時間をおいて再度試してください。";
}

export function withTimeout(task, timeoutMs = 15000, timeoutMessage = "Request timed out."){
    const duration = Number(timeoutMs);
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 15000;

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(timeoutMessage)), safeDuration);

        Promise.resolve()
            .then(task)
            .then(value => {
                clearTimeout(timer);
                resolve(value);
            }, error => {
                clearTimeout(timer);
                reject(error);
            });
    });
}

export function candidateErrorMessage(error){
    const message = String(error?.message ?? "");

    if(/candidate duration|30 hours|invalid candidate time|schedule_slots_minute_check/i.test(message)){
        return "候補日の時間を確認してください。終了が開始より前なら翌日として扱われます。1候補は30時間以内にしてください。";
    }

    return "候補日の追加に失敗しました。再読み込みしても続く場合は、もう一度お試しください。";
}

export function preparationErrorMessage(error){
    const message = String(error?.message ?? "");
    if(/owner access|completion access|participant access|permission|denied/i.test(message)){
        return "この準備項目を変更する権限を確認できませんでした。";
    }
    if(/title|required|category|assignee|round|session/i.test(message)){
        return "準備の内容・担当・関連する予定を確認してください。";
    }
    return "準備項目の保存に失敗しました。時間をおいてもう一度お試しください。";
}

export function candidateManagementError(error){
    const message = String(error?.message ?? "");

    if(/confirmed candidate/i.test(message)){
        return "確定済みの日程は直接編集・削除できません。新しい候補を追加して再調整してください。";
    }

    if(/owner|permission|authentication|denied/i.test(message)){
        return "候補日の管理は現在のKPだけが行えます。";
    }

    if(/candidate duration|30 hours|invalid candidate time/i.test(message)){
        return "候補日の時刻を確認してください。終了が開始より前なら翌日として扱われます。1候補は30時間以内です。";
    }

    if(/unique|duplicate/i.test(message)){
        return "同じ日時の候補がすでにあります。時刻または日付を確認してください。";
    }

    return "候補日の更新に失敗しました。再読み込みしてからもう一度お試しください。";
}

export function recommendationErrorMessage(error){
    const message = String(error?.message ?? "");

    if(/stale|latest responses|unanswered|required participants|uncertain|required/i.test(message)){
        return "回答内容が更新されています。最新結果を確認してから、もう一度確定してください。";
    }

    if(/conflict.*confirmed session/i.test(message)){
        return "別の確定卓と重複しています。最新の候補を確認してください。";
    }

    if(/within the candidate|candidate not found/i.test(message)){
        return "候補時間が更新されています。最新結果を確認してください。";
    }

    return "日程の確定に失敗しました。再読み込みしても続く場合は、もう一度お試しください。";
}

export function reportSchedulerError(scope, error){
    const host = String(location.hostname ?? "");
    const isDevelopment = host === "127.0.0.1" || host === "localhost" || host.endsWith(".local");

    if(!isDevelopment){
        return;
    }

    console.warn(`[Scheduler] ${scope} failed`, {
        code: String(error?.code ?? "").slice(0, 40),
        message: String(error?.message ?? "").slice(0, 180)
    });
}
