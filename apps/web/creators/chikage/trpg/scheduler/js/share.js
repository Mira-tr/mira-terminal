import {
    formatSlot
} from "./schedulerMath.js";

export function createPublicUrl(pathname, scheduleId){
    return `${location.origin}${pathname}#${encodeURIComponent(scheduleId)}`;
}

export function createInviteText(state, slots){
    return [
        `【日程調整】${state.schedule.title}`,
        `候補: ${slots.length}件`,
        `回答URL: ${createPublicUrl(location.pathname, state.schedule.id)}`
    ].join("\n");
}

export function createResultText(state, summaries){
    const lines = [
        `【集計】${state.schedule.title}`
    ];

    summaries.slice(0, 5).forEach((summary, index) => {
        lines.push(`${index + 1}. ${formatSlot(summary.slot)} ○${summary.counts.yes} △${summary.counts.maybe} ×${summary.counts.no}`);
    });

    return lines.join("\n");
}
