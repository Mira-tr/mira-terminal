import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const APP_PATH = "apps/web/creators/chikage/trpg/v2/js/app.js";
const RUNTIME_DIR = "apps/web/creators/chikage/trpg/v2/js/runtime";
const TEST_PATH = "tests/trpg-runtime-modules.test.mjs";

let app = readFileSync(APP_PATH, "utf8");

if(app.includes('./runtime/sessionActions.js')){
    console.log("TRPG runtime is already modularized; nothing to transform.");
    process.exit(0);
}

function findFunctionRange(source, name){
    const pattern = new RegExp(`(^|\\n)(?:async\\s+)?function\\s+${name}\\s*\\(`);
    const match = pattern.exec(source);
    if(!match){
        throw new Error(`Function not found: ${name}`);
    }

    const start = match.index + (match[1] ? 1 : 0);
    const signatureStart = start;
    const paramsEnd = source.indexOf(")", signatureStart);
    const braceStart = source.indexOf("{", paramsEnd + 1);
    if(braceStart < 0){
        throw new Error(`Opening brace not found: ${name}`);
    }

    let depth = 0;
    let quote = null;
    let escaped = false;
    let lineComment = false;
    let blockComment = false;

    for(let index = braceStart; index < source.length; index += 1){
        const char = source[index];
        const next = source[index + 1];

        if(lineComment){
            if(char === "\n") lineComment = false;
            continue;
        }
        if(blockComment){
            if(char === "*" && next === "/"){
                blockComment = false;
                index += 1;
            }
            continue;
        }
        if(quote){
            if(escaped){
                escaped = false;
                continue;
            }
            if(char === "\\"){
                escaped = true;
                continue;
            }
            if(char === quote){
                quote = null;
            }
            continue;
        }

        if(char === "/" && next === "/"){
            lineComment = true;
            index += 1;
            continue;
        }
        if(char === "/" && next === "*"){
            blockComment = true;
            index += 1;
            continue;
        }
        if(char === "'" || char === '"' || char === "`"){
            quote = char;
            continue;
        }
        if(char === "{") depth += 1;
        if(char === "}"){
            depth -= 1;
            if(depth === 0){
                let end = index + 1;
                while(source[end] === "\r" || source[end] === "\n") end += 1;
                return { start, end, text: source.slice(start, index + 1) };
            }
        }
    }

    throw new Error(`Closing brace not found: ${name}`);
}

function takeFunction(name){
    const range = findFunctionRange(app, name);
    app = `${app.slice(0, range.start)}${app.slice(range.end)}`;
    return range.text.trim();
}

function exported(source){
    return source.replace(/^(async\s+)?function\s+/, (_, asyncPart = "") => `export ${asyncPart}function `);
}

function indent(source, spaces = 4){
    const pad = " ".repeat(spaces);
    return source.split("\n").map(line => line ? `${pad}${line}` : "").join("\n");
}

function write(path, content){
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${content.trim()}\n`, "utf8");
}

const domNames = [
    "sectionBlock",
    "emptyState",
    "feedbackMessage",
    "field",
    "textareaField",
    "el"
];
const domFunctions = domNames.map(takeFunction);
write(`${RUNTIME_DIR}/dom.js`, domFunctions.map(exported).join("\n\n"));

const navigationNames = [
    "readRoute",
    "createInviteUrl",
    "copyText",
    "todayInJapan"
];
const navigationFunctions = navigationNames.map(takeFunction);
write(`${RUNTIME_DIR}/navigation.js`, navigationFunctions.map(exported).join("\n\n"));

const supportNames = [
    "minutesFromTimeFields",
    "normalizeMinuteRange",
    "validatePartialRanges",
    "formatComposerMonth",
    "formatDateLine",
    "toUserMessage",
    "candidateErrorMessage",
    "preparationErrorMessage",
    "candidateManagementError",
    "recommendationErrorMessage",
    "reportSchedulerError"
];
const supportFunctions = supportNames.map(takeFunction);
write(`${RUNTIME_DIR}/support.js`, `
import {
    formatMinuteTime,
    MAX_AVAILABILITY_RANGES,
    timeToMinute
} from "../availabilityModel.js";
import {
    formatDateLockup,
    formatTimeRange
} from "../sessionViewModel.js";

${supportFunctions.map(exported).join("\n\n")}
`);

const scheduleSupportNames = [
    "roundStatusLabel",
    "sessionStatusLabel",
    "candidateEditDraft",
    "candidateResponseCount",
    "candidateStaleResponseCount",
    "isActiveCandidate",
    "minuteTime",
    "compactParticipantName",
    "formatCompactDate"
];
const scheduleSupportFunctions = scheduleSupportNames.map(takeFunction);
write(`${RUNTIME_DIR}/scheduleSupport.js`, `
import { formatDateLockup } from "../sessionViewModel.js";

${scheduleSupportFunctions.map(exported).join("\n\n")}
`);

function writeController(fileName, factoryName, names, deps){
    const functions = names.map(takeFunction);
    const depLines = deps.map(name => `        ${name}`).join(",\n");
    const returnLines = names.map(name => `        ${name}`).join(",\n");
    write(`${RUNTIME_DIR}/${fileName}`, `
export function ${factoryName}(context){
    const {
${depLines}
    } = context;

${functions.map(source => indent(source)).join("\n\n")}

    return {
${returnLines}
    };
}
`);
}

writeController(
    "availabilityController.js",
    "createAvailabilityController",
    [
        "renderAvailability",
        "availabilityWeekdayRow",
        "availabilityExceptionRow",
        "availabilityStateSelect",
        "availabilityRangesEditor",
        "savePersonalAvailability"
    ],
    [
        "appState", "root", "WEEKDAY_LABELS", "availabilityEntry", "formatJapaneseDate",
        "updateExceptionState", "updateWeeklyState", "removeException", "updateAvailabilityRange",
        "removeAvailabilityRange", "addAvailabilityRange", "MAX_AVAILABILITY_RANGES",
        "validateAvailabilityPayload", "createPersonalAvailabilityModel", "el", "sectionBlock",
        "textButton", "emptyState", "feedbackMessage", "actionButton", "timeRangeEditor",
        "minutesFromTimeFields", "renderDashboard", "setBusy", "reportSchedulerError"
    ]
);

writeController(
    "preparationActions.js",
    "createPreparationActions",
    [
        "savePreparationItem",
        "setPreparationStatus",
        "archivePreparationItem",
        "reorderPreparation"
    ],
    [
        "appState", "setBusy", "reloadActiveDetail", "loadDashboard", "renderDetail",
        "reportSchedulerError", "preparationErrorMessage", "movePreparationItem", "sortPreparationItems"
    ]
);

writeController(
    "sessionActions.js",
    "createSessionActions",
    [
        "openDetail",
        "loginWithDiscord",
        "logout",
        "createSession",
        "joinAccount",
        "joinGuest",
        "updateSessionDisplayName",
        "answerSlot",
        "transferKp",
        "updateAccountDisplayName",
        "updateSessionStatus"
    ],
    [
        "appState", "renderLoading", "createScheduleBundleViewModel", "renderDetail", "renderError",
        "toUserMessage", "rememberAuthIntent", "createAuthRedirectUrl", "renderSignedOut",
        "combineDurationMinutes", "renderDashboard", "setBusy", "loadDashboard", "reportSchedulerError",
        "userDisplayName", "reloadActiveDetail"
    ]
);

writeController(
    "schedulerActions.js",
    "createSchedulerActions",
    [
        "addCandidateBatch",
        "createRound",
        "confirmRecommendation",
        "confirmRecommendationPlan",
        "saveExistingCandidate",
        "saveCandidateBulkTimes",
        "retireCandidate",
        "restoreCandidate"
    ],
    [
        "appState", "buildCandidateBatch", "createCandidateComposer", "combineDurationMinutes",
        "renderDetail", "setBusy", "reloadActiveDetail", "loadDashboard", "reportSchedulerError",
        "candidateErrorMessage", "toUserMessage", "recommendationSnapshotForConfirmation",
        "createScheduleBundleViewModel", "recommendationErrorMessage", "candidateManagementError",
        "minutesFromTimeFields"
    ]
);

const imports = `import {
    el,
    emptyState,
    feedbackMessage,
    field,
    sectionBlock,
    textareaField
} from "./runtime/dom.js";
import {
    copyText,
    createInviteUrl,
    readRoute,
    todayInJapan
} from "./runtime/navigation.js";
import {
    candidateErrorMessage,
    candidateManagementError,
    formatComposerMonth,
    formatDateLine,
    minutesFromTimeFields,
    normalizeMinuteRange,
    preparationErrorMessage,
    recommendationErrorMessage,
    reportSchedulerError,
    toUserMessage,
    validatePartialRanges
} from "./runtime/support.js";
import {
    candidateEditDraft,
    candidateResponseCount,
    candidateStaleResponseCount,
    compactParticipantName,
    formatCompactDate,
    isActiveCandidate,
    minuteTime,
    roundStatusLabel,
    sessionStatusLabel
} from "./runtime/scheduleSupport.js";
import { createAvailabilityController } from "./runtime/availabilityController.js";
import { createPreparationActions } from "./runtime/preparationActions.js";
import { createSchedulerActions } from "./runtime/schedulerActions.js";
import { createSessionActions } from "./runtime/sessionActions.js";
`;

app = `${imports}\n${app}`;

const rootMarker = 'const root = document.querySelector("[data-trpg-v2-app]");';
if(!app.includes(rootMarker)){
    throw new Error("TRPG app root marker was not found.");
}

const controllers = `

const { renderAvailability } = createAvailabilityController({
    appState,
    root,
    WEEKDAY_LABELS,
    availabilityEntry,
    formatJapaneseDate,
    updateExceptionState,
    updateWeeklyState,
    removeException,
    updateAvailabilityRange,
    removeAvailabilityRange,
    addAvailabilityRange,
    MAX_AVAILABILITY_RANGES,
    validateAvailabilityPayload,
    createPersonalAvailabilityModel,
    el,
    sectionBlock,
    textButton,
    emptyState,
    feedbackMessage,
    actionButton,
    timeRangeEditor,
    minutesFromTimeFields,
    renderDashboard,
    setBusy,
    reportSchedulerError
});

const {
    savePreparationItem,
    setPreparationStatus,
    archivePreparationItem,
    reorderPreparation
} = createPreparationActions({
    appState,
    setBusy,
    reloadActiveDetail,
    loadDashboard,
    renderDetail,
    reportSchedulerError,
    preparationErrorMessage,
    movePreparationItem,
    sortPreparationItems
});

const {
    openDetail,
    loginWithDiscord,
    logout,
    createSession,
    joinAccount,
    joinGuest,
    updateSessionDisplayName,
    answerSlot,
    transferKp,
    updateAccountDisplayName,
    updateSessionStatus
} = createSessionActions({
    appState,
    renderLoading,
    createScheduleBundleViewModel,
    renderDetail,
    renderError,
    toUserMessage,
    rememberAuthIntent,
    createAuthRedirectUrl,
    renderSignedOut,
    combineDurationMinutes,
    renderDashboard,
    setBusy,
    loadDashboard,
    reportSchedulerError,
    userDisplayName,
    reloadActiveDetail
});

const {
    addCandidateBatch,
    createRound,
    confirmRecommendation,
    confirmRecommendationPlan,
    saveExistingCandidate,
    saveCandidateBulkTimes,
    retireCandidate,
    restoreCandidate
} = createSchedulerActions({
    appState,
    buildCandidateBatch,
    createCandidateComposer,
    combineDurationMinutes,
    renderDetail,
    setBusy,
    reloadActiveDetail,
    loadDashboard,
    reportSchedulerError,
    candidateErrorMessage,
    toUserMessage,
    recommendationSnapshotForConfirmation,
    createScheduleBundleViewModel,
    recommendationErrorMessage,
    candidateManagementError,
    minutesFromTimeFields
});`;

app = app.replace(rootMarker, `${rootMarker}${controllers}`);
app = `${app.trimEnd()}\n`;
writeFileSync(APP_PATH, app, "utf8");

const testSource = String.raw`
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const APP = "apps/web/creators/chikage/trpg/v2/js/app.js";
const RUNTIME = "apps/web/creators/chikage/trpg/v2/js/runtime";

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("TRPG v2 app is an orchestrator backed by domain runtime modules", async () => {
    const app = await read(APP);
    const bytes = Buffer.byteLength(app);

    for(const moduleName of [
        "dom.js",
        "navigation.js",
        "support.js",
        "scheduleSupport.js",
        "availabilityController.js",
        "preparationActions.js",
        "schedulerActions.js",
        "sessionActions.js"
    ]){
        assert.ok(app.includes("runtime/" + moduleName));
    }

    assert.ok(bytes < 100000, "app.js should stay below 100KB after modularization, got " + bytes);

    for(const moved of [
        "renderAvailability",
        "savePreparationItem",
        "openDetail",
        "createSession",
        "answerSlot",
        "addCandidateBatch",
        "saveExistingCandidate",
        "sectionBlock",
        "readRoute",
        "normalizeMinuteRange"
    ]){
        assert.ok(!app.includes("function " + moved + "(") && !app.includes("async function " + moved + "("));
    }
});

test("TRPG runtime controllers keep mutation boundaries explicit", async () => {
    const availability = await read(RUNTIME + "/availabilityController.js");
    const preparation = await read(RUNTIME + "/preparationActions.js");
    const scheduler = await read(RUNTIME + "/schedulerActions.js");
    const sessions = await read(RUNTIME + "/sessionActions.js");

    assert.match(availability, /createAvailabilityController/);
    assert.match(preparation, /createPreparationActions/);
    assert.match(scheduler, /createSchedulerActions/);
    assert.match(sessions, /createSessionActions/);

    assert.match(preparation, /createTrpgV12PreparationItem/);
    assert.match(scheduler, /addTrpgV6Candidates/);
    assert.match(sessions, /createTrpgV2Session/);
    assert.match(sessions, /upsertAccountResponse/);
});
`;
write(TEST_PATH, testSource);

console.log(`Refactored ${APP_PATH}`);
console.log(`app.js: ${Buffer.byteLength(app)} bytes / ${app.split(/\\r?\\n/).length} lines`);
