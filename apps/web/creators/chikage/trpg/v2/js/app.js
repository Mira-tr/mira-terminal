import {
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

import {
    createSupabaseBrowserClient,
    loadSupabasePublicConfig
} from "../../scheduler/js/supabaseConfig.js";
import {
    createGuestTokenStore,
    SupabaseScheduleRepository
} from "../../scheduler/js/supabaseRepository.js";
import {
    ANSWER_LABELS,
    createDashboardViewModel,
    createScheduleBundleViewModel,
    findResponseForParticipant,
    formatDateLockup,
    formatTimeRange,
    summarizeSlotResponses
} from "./sessionViewModel.js";
import {
    addComposerWindow,
    applyComposerBulk,
    buildCandidateBatch,
    combineDurationMinutes,
    createCandidateComposer,
    createMonthDays,
    formatCandidateTime,
    formatDurationMinutes,
    formatJapaneseDate,
    inspectCandidateSelection,
    MAX_CANDIDATES_PER_BATCH,
    removeComposerWindow,
    resolveDiscordDisplayName,
    shiftComposerMonth,
    toggleComposerDate,
    updateComposerBulk,
    updateComposerWindow
} from "./schedulerComposer.js";
import {
    addAvailabilityRange,
    availabilityEntry,
    createPersonalAvailabilityModel,
    evaluateAvailabilityForSlot,
    formatMinuteTime,
    MAX_AVAILABILITY_RANGES,
    removeException,
    removeAvailabilityRange,
    timeToMinute,
    toAvailabilityPayload,
    updateAvailabilityRange,
    updateExceptionState,
    updateWeeklyState,
    validateAvailabilityPayload,
    WEEKDAY_LABELS
} from "./availabilityModel.js";
import {
    formatRecommendationRange,
    recommendMultiDayPlan,
    recommendSchedule,
    recommendationSnapshotForConfirmation
} from "./recommendationEngine.js";
import {
    movePreparationItem,
    PREPARATION_CATEGORIES,
    preparationCategoryLabel,
    sortPreparationItems
} from "./preparationModel.js";

const appState = {
    config: null,
    repository: null,
    guestTokens: createGuestTokenStore(),
    user: null,
    dashboardBundle: null,
    dashboard: null,
    activeDetail: null,
    activeGuest: null,
    personalAvailability: createPersonalAvailabilityModel(),
    availabilityEditor: createPersonalAvailabilityModel(),
    availabilityFeedback: null,
    availabilityNewDate: todayInJapan(),
    screen: "dashboard",
    candidateComposer: createCandidateComposer(),
    candidateScheduleId: "",
    candidateEditorOpen: false,
    candidateFeedback: null,
    candidateEditDraft: null,
    candidateRetireSlotId: "",
    candidateBulkSlotIds: [],
    candidateBulkDraft: null,
    roundCreateOpen: false,
    roundFeedback: null,
    dashboardFeedback: null,
    responseFeedback: null,
    partialResponseDrafts: {},
    voteMode: false,
    accountDisplayName: "",
    preparationScheduleId: "",
    preparationOpen: false,
    preparationAddOpen: false,
    preparationEditItemId: "",
    preparationFeedback: null,
    confirmRecommendation: null,
    route: {
        type: "home",
        shareId: ""
    },
    busy: false
};

const AUTH_INTENT_KEY = "relmua_trpg_v2_auth_intent_v1";
const root = document.querySelector("[data-trpg-v2-app]");
const shellLoginButton = document.querySelector("[data-trpg-shell-login]");

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
});

if(root){
    init();
}

async function init(){
    renderLoading("卓の記録を確認しています。");
    bindShellLogin();

    try{
        appState.route = readRoute();
        appState.config = await loadSupabasePublicConfig();
        renderShellAuth();

        if(!appState.config.enabled || !appState.config.scheduleEnabled){
            renderConfigMissing();
            return;
        }

        const client = await createSupabaseBrowserClient(appState.config);
        appState.repository = new SupabaseScheduleRepository(client);
        appState.user = await appState.repository.getCurrentUser();
        renderShellAuth();
        restoreAuthIntent();

        appState.repository.onAuthStateChange(async user => {
            appState.user = user;
            renderShellAuth();
            restoreAuthIntent();
            await refresh();
        });

        await refresh();
    }catch(error){
        renderError(toUserMessage(error));
    }
}

async function refresh(){
    try{
        if(appState.user){
            const profile = await appState.repository.ensureTrpgV2Profile();
            appState.accountDisplayName = String(profile?.displayName ?? userDisplayName(appState.user));
        }

        if(appState.route.type === "join"){
            await renderJoin(appState.route.shareId);
            return;
        }

        if(appState.user){
            await loadDashboard();
            if(appState.route.type === "schedule"){
                const target = appState.dashboard.sessions.find(item => item.schedule.id === appState.route.scheduleId);
                if(!target){
                    renderError("この卓を開く権限がありません。");
                    return;
                }
                await openDetail(target);
            }else if(appState.screen === "availability"){
                renderAvailability();
            }else{
                renderDashboard();
            }
        }else{
            renderSignedOut();
        }
    }catch(error){
        renderError(toUserMessage(error));
    }
}

async function loadDashboard(){
    appState.dashboardBundle = await appState.repository.loadTrpgV2Dashboard();
    appState.dashboard = createDashboardViewModel(appState.dashboardBundle, appState.user?.id ?? "");

    try{
        const availability = await appState.repository.loadTrpgV31PersonalAvailability();
        appState.personalAvailability = createPersonalAvailabilityModel(availability);
        if(appState.screen !== "availability"){
            appState.availabilityEditor = createPersonalAvailabilityModel(availability);
        }
    }catch(error){
        reportSchedulerError("load-personal-availability", error);
        appState.personalAvailability = createPersonalAvailabilityModel();
        if(appState.screen !== "availability"){
            appState.availabilityEditor = createPersonalAvailabilityModel();
        }
    }
}

async function renderJoin(shareId){
    const storedGuest = appState.guestTokens.load()[shareId];

    if(storedGuest){
        const view = await appState.repository.loadGuestView(shareId, storedGuest.participantId, storedGuest.guestToken);
        appState.activeGuest = {
            shareId,
            ...storedGuest
        };
        appState.activeDetail = createScheduleBundleViewModel(view);
        renderDetail();
        return;
    }

    if(appState.user){
        const accountView = await appState.repository.loadAccountView(shareId);
        const accountDetail = createScheduleBundleViewModel(accountView, appState.user.id);

        if(accountDetail.ownParticipantId){
            appState.activeGuest = null;
            appState.activeDetail = accountDetail;
            renderDetail();
            return;
        }
    }

    const publicView = await appState.repository.loadSharedSchedule(shareId);

    if(!publicView){
        renderError("この招待URLは利用できません。");
        return;
    }

    const detail = createScheduleBundleViewModel(publicView);
    root.replaceChildren(
        sectionBlock("JOIN SESSION", [
            el("p", {
                className: "v2-app-copy"
            }, "招待された卓へ参加します。Discordでログインするか、Guestとして予定回答だけ参加できます。"),
            sessionSummary(detail),
            appState.user
                ? actionButton("Discordアカウントで参加", () => joinAccount(shareId), "primary")
                : actionButton("Discordでログインして参加", () => loginWithDiscord(), "primary"),
            guestJoinForm(shareId),
            textButton("My Sessionsへ戻る", () => {
                location.hash = "";
                appState.route = {
                    type: "home",
                    shareId: ""
                };
                refresh();
            })
        ])
    );
}

function renderSignedOut(){
    root.replaceChildren(
        sectionBlock("ACCOUNT REQUIRED", [
            el("p", {
                className: "v2-app-copy"
            }, "卓を管理するにはDiscordでログインしてください。ログイン状態はSupabase Authの通常Sessionとして保持されます。"),
            actionButton("Discordでログイン", () => loginWithDiscord(), "primary")
        ])
    );
}

function renderDashboard(){
    const dashboard = appState.dashboard;
    const hasSessions = dashboard.sessions.length > 0;
    const primary = [
        actionRequiredBlock(dashboard.actionRequired, dashboard.preparationActionRequired),
        nextSessionBlock(dashboard.nextSession, dashboard.nextSessionEntry?.session),
        schedulingBlock(dashboard.scheduling),
        preparingBlock(dashboard.preparing)
    ].filter(Boolean);
    const secondary = [
        upcomingBlock(dashboard.upcoming),
        recentBlock(dashboard.recent)
    ].filter(Boolean);

    root.replaceChildren(
        accountBar(),
        ...(appState.dashboardFeedback ? [feedbackMessage(appState.dashboardFeedback)] : []),
        hasSessions
            ? el("div", { className: "v2-dashboard-layout" }, [
                el("div", { className: "v2-dashboard-layout__primary" }, primary),
                secondary.length
                    ? el("div", { className: "v2-dashboard-layout__secondary" }, secondary)
                    : null
            ])
            : emptyDashboardBlock(),
        createSessionForm()
    );
}

function renderDetail(){
    const detail = appState.activeDetail;

    if(!detail){
        renderDashboard();
        return;
    }

    ensureCandidateComposer(detail);
    ensurePreparationState(detail);

    const blocks = [
        detailHeader(detail),
        nextRoundSessionBlock(detail),
        overviewBlock(detail),
        preparationBlock(detail),
        scheduleBlock(detail),
        sessionHistoryBlock(detail),
        membersBlock(detail),
        moreBlock(detail)
    ];

    root.replaceChildren(...blocks);
}

function accountBar(){
    return el("div", {
        className: "v2-account-strip"
    }, [
        el("div", {
            className: "v2-account-row"
        }, [
            el("div", {}, [
                el("strong", {}, appState.accountDisplayName || userDisplayName(appState.user)),
                el("small", {}, "DISCORD / SIGNED IN")
            ]),
            actionButton("自分の予定", () => {
                appState.screen = "availability";
                appState.availabilityEditor = createPersonalAvailabilityModel(appState.personalAvailability);
                appState.availabilityFeedback = null;
                renderAvailability();
            }),
            actionButton("Logout", () => logout())
        ]),
        el("details", {
            className: "v2-account-name"
        }, [
            el("summary", {}, "アカウント表示名を変更"),
            el("form", {
                className: "v2-session-name-form",
                onSubmit(event){
                    event.preventDefault();
                    updateAccountDisplayName(event.currentTarget);
                }
            }, [
                field("アカウント表示名", "displayName", "text", {
                    required: true,
                    maxLength: 80,
                    value: appState.accountDisplayName || userDisplayName(appState.user),
                    placeholder: "千景"
                }),
                el("button", { className: "v2-command", type: "submit" }, "アカウント表示名を保存")
            ])
        ])
    ]);
}

function createSessionForm(){
    const form = el("form", {
        className: "v2-form",
        onSubmit(event){
            event.preventDefault();
            createSession(event.currentTarget);
        }
    }, [
        field("卓名", "title", "text", {
            required: true,
            maxLength: 120,
            placeholder: "VOID"
        }),
        durationFields(),
        textareaField("Memo", "memo", "PL / HO / 補足"),
        el("button", {
            className: "v2-command v2-command--primary",
            type: "submit"
        }, "卓を作成")
    ]);

    return sectionBlock("START A SESSION", [
        el("details", {
            className: "v2-create-session"
        }, [
            el("summary", {}, [
                el("span", {}, "＋ 卓を作る"),
                el("small", {}, "卓名と時間だけで始められます")
            ]),
            form
        ])
    ], "v2-app-block--create");
}

function durationFields(){
    return el("fieldset", {
        className: "v2-duration-fields"
    }, [
        el("legend", {}, "想定プレイ時間"),
        el("div", {
            className: "v2-duration-fields__inputs"
        }, [
            field("時間", "totalHours", "number", {
                min: 0,
                max: 30,
                step: 1,
                value: "4",
                inputMode: "numeric",
                required: true
            }),
            field("分", "totalMinutes", "number", {
                min: 0,
                max: 59,
                step: 5,
                value: "0",
                inputMode: "numeric",
                required: true
            })
        ])
    ]);
}

function actionRequiredBlock(items, preparationItems = []){
    if(!items.length && !preparationItems.length){
        return null;
    }

    const responseRows = items.map(item => {
        const isStale = item.staleResponseCount > 0;
        return el("button", {
            className: "v2-dashboard-action",
            type: "button",
            onClick(){
                openDetail(item);
            }
        }, [
            el("span", { className: "v2-dashboard-action__status" }, isStale ? "再回答が必要" : "日程回答が必要"),
            el("span", { className: "v2-dashboard-action__body" }, [
                el("strong", {}, item.title),
                el("small", {}, `${item.roundLabel} / ${item.unansweredCount}件未回答`)
            ]),
            el("span", { className: "v2-dashboard-action__command" }, "回答する")
        ]);
    });
    const preparationRows = preparationItems.map(item => el("button", {
        className: "v2-dashboard-action",
        type: "button",
        onClick(){
            openDetail(item).then(() => {
                appState.preparationOpen = true;
                renderDetail();
            });
        }
    }, [
        el("span", { className: "v2-dashboard-action__status" }, "準備が必要"),
        el("span", { className: "v2-dashboard-action__body" }, [
            el("strong", {}, item.title),
            el("small", {}, `あなたの準備 ${item.preparation.ownPendingCount}件`)
        ]),
        el("span", { className: "v2-dashboard-action__command" }, "準備する")
    ]));
    return sectionBlock("要対応", [...responseRows, ...preparationRows], "v2-app-block--required");
}

function nextSessionBlock(item, session = null){
    if(!item){
        return sectionBlock("NEXT SESSION", [
            emptyState("確定済みの次回日程はまだありません。")
        ], "v2-app-block--next");
    }

    const target = session ?? item.nextConfirmed;
    const lockup = formatDateLockup(target);
    const node = el("button", {
        className: "v2-live-next",
        type: "button",
        onClick(){
            openDetail(item);
        }
    }, [
        el("span", {
            className: "v2-live-date"
        }, [
            el("span", {}, lockup.month),
            el("strong", {}, lockup.day),
            el("span", {}, lockup.weekday)
        ]),
        el("span", {}, [
            el("small", {}, `${item.roundLabel} / ${item.role}`),
            el("strong", {}, item.title),
            el("em", {}, formatTimeRange(target))
        ])
    ]);

    return sectionBlock("次の卓", [node], "v2-app-block--next");
}

function schedulingBlock(items){
    if(!items.length){
        return null;
    }

    return sectionBlock("日程調整中", items.map(item => {
        const progress = item.responseProgress;
        const ownState = item.unansweredCount > 0
            ? item.staleResponseCount > 0 ? "再回答が必要" : "回答が必要"
            : "回答済み";
        return dashboardRow(item, [
            item.roundLabel,
            `${progress.answered} / ${progress.total} 回答済み`,
            ownState
        ].join(" / "));
    }), "v2-app-block--scheduling");
}

function preparingBlock(items){
    if(!items.length){
        return null;
    }

    return sectionBlock("PREPARING", items.map(item => dashboardRow(item, [
        `準備 ${item.preparation.done} / ${item.preparation.total}`,
        item.preparation.pending ? `残り ${item.preparation.pending}件` : "準備完了",
        item.nextConfirmed ? `次回 ${formatDateLockup(item.nextConfirmed).month} ${formatDateLockup(item.nextConfirmed).day}` : "次回未定"
    ].join(" / "))), "v2-app-block--preparing");
}

function upcomingBlock(entries){
    if(!entries.length){
        return null;
    }

    return sectionBlock("この先の予定", [
        el("div", { className: "v2-dashboard-list" }, entries.map(entry => sessionRow(entry))),
        dashboardLink("すべて見る", calendarHref())
    ], "v2-app-block--upcoming");
}

function recentBlock(entries){
    if(!entries.length){
        return null;
    }

    return sectionBlock("最近のSession", entries.map(entry => sessionRow(entry, "完了")), "v2-app-block--recent");
}

function dashboardRow(item, meta){
    return el("button", {
        className: "v2-dashboard-row",
        type: "button",
        onClick(){
            openDetail(item);
        }
    }, [
        el("span", { className: "v2-dashboard-row__body" }, [
            el("strong", {}, item.title),
            el("small", {}, meta)
        ]),
        el("span", { className: "v2-dashboard-row__arrow", "aria-hidden": "true" }, "→")
    ]);
}

function sessionRow(entry, status = "予定"){
    const lockup = formatDateLockup(entry.session);
    return el("button", {
        className: "v2-dashboard-session",
        type: "button",
        onClick(){
            openDetail(entry.item);
        }
    }, [
        el("span", { className: "v2-dashboard-session__date" }, [
            el("strong", {}, `${lockup.month} ${lockup.day}`),
            el("small", {}, lockup.weekday)
        ]),
        el("span", { className: "v2-dashboard-session__body" }, [
            el("strong", {}, entry.item.title),
            el("small", {}, `${entry.item.roundLabel} / ${formatTimeRange(entry.session)} / ${status}`)
        ])
    ]);
}

function emptyDashboardBlock(){
    return sectionBlock("TRPG", [
        el("div", { className: "v2-dashboard-empty" }, [
            el("strong", {}, "まだ卓はありません。"),
            el("p", {}, "卓を作るか、次に遊ぶシナリオを探すところから始められます。"),
            el("div", { className: "v2-dashboard-empty__actions" }, [
                dashboardLink("Scenario Libraryを見る", libraryHref()),
                dashboardLink("Calendarを見る", calendarHref())
            ])
        ])
    ], "v2-app-block--empty");
}

function dashboardLink(label, href){
    return el("a", {
        className: "v2-dashboard-link",
        href
    }, label);
}

function calendarHref(){
    return root.closest(".cx-scheduler-v2-page") ? "../calendar/" : "./calendar/";
}

function libraryHref(){
    return root.closest(".cx-scheduler-v2-page") ? "../scenarios/" : "./scenarios/";
}

function detailHeader(detail){
    return sectionBlock("SESSION DETAIL", [
        el("div", {
            className: "v2-detail-title"
        }, [
            el("button", {
                className: "v2-text-button",
                type: "button",
                onClick(){
                    appState.activeDetail = null;
                    appState.activeGuest = null;
                    appState.screen = "dashboard";
                    appState.route = {
                        type: "home",
                        shareId: ""
                    };
                    history.replaceState(null, "", location.pathname);
                    if(appState.user){
                        renderDashboard();
                    }else{
                        location.hash = "";
                        renderSignedOut();
                    }
                }
            }, "← MY SESSIONS"),
            el("h3", {}, detail.title),
            el("p", {}, `${detail.statusLabel} / ${detail.roleLabel}`)
        ])
    ]);
}

function nextRoundSessionBlock(detail){
    const item = detail.nextConfirmed;
    if(!item){
        return sectionBlock("NEXT SESSION", [emptyState("次に確定している回はありません。")], "v2-round-next");
    }

    return sectionBlock("NEXT SESSION", [
        el("div", { className: "v2-round-next__row" }, [
            el("strong", {}, `#${Number(item.sequence ?? 0) || "-"}`),
            el("div", {}, [
                el("strong", {}, formatDateLine(item)),
                el("small", {}, `${formatTimeRange(item)} / ${sessionStatusLabel(item.status)}`)
            ])
        ])
    ], "v2-round-next");
}

function roundSummary(roundItem){
    const label = roundItem.status === "draft" ? "下書き" : "調整中";
    const title = roundItem.title ? `#${roundItem.sequence} ${roundItem.title}` : `ROUND ${roundItem.sequence}`;
    const detail = [label, roundItem.purpose, roundItem.target_minutes ? `想定 ${formatDurationMinutes(roundItem.target_minutes)}` : ""].filter(Boolean).join(" / ");

    return el("div", { className: "v2-round-summary" }, [
        el("strong", {}, title),
        el("small", {}, detail)
    ]);
}

function roundCreateBlock(detail){
    const suggested = Number(detail.schedule.total_minutes ?? detail.schedule.totalMinutes ?? detail.schedule.session_minutes ?? 180);
    const hours = Math.floor(suggested / 60);
    const minutes = suggested % 60;

    return el("details", {
        className: "v2-round-create",
        open: appState.roundCreateOpen,
        onToggle(event){
            appState.roundCreateOpen = event.currentTarget.open;
        }
    }, [
        el("summary", {}, "＋ 次の日程を調整"),
        el("form", {
            className: "v2-form v2-round-create__form",
            onSubmit(event){
                event.preventDefault();
                createRound(detail, event.currentTarget);
            }
        }, [
            field("Round名（任意）", "title", "text", { maxLength: 120, placeholder: "第2回" }),
            el("label", {}, [
                el("span", {}, "目的（任意）"),
                el("textarea", { name: "purpose", rows: 2, maxLength: 400, placeholder: "次回の調整" })
            ]),
            el("div", { className: "v2-duration-fields" }, [
                field("想定プレイ時間（時間）", "targetHours", "number", { min: 0, max: 30, step: 1, required: true, value: String(hours), inputMode: "numeric" }),
                field("分", "targetMinutes", "number", { min: 0, max: 55, step: 5, required: true, value: String(minutes), inputMode: "numeric" })
            ]),
            el("button", { className: "v2-command v2-command--primary", type: "submit" }, "このRoundを始める")
        ])
    ]);
}

function sessionHistoryBlock(detail){
    const sessions = detail.sessions ?? [];
    const completedRounds = (detail.rounds ?? []).filter(roundItem => !detail.activeRound || roundItem.id !== detail.activeRound.id);
    const rows = sessions.length
        ? sessions.map(sessionItem => sessionHistoryRow(detail, sessionItem))
        : [emptyState("確定済みのSessionはまだありません。")];

    if(completedRounds.length){
        rows.push(el("details", { className: "v2-round-history" }, [
            el("summary", {}, `過去のRound (${completedRounds.length})`),
            el("div", { className: "v2-round-history__list" }, completedRounds.map(roundItem => el("div", { className: "v2-round-history__row" }, [
                el("strong", {}, roundItem.title ? `#${roundItem.sequence} ${roundItem.title}` : `ROUND ${roundItem.sequence}`),
                el("small", {}, `${roundStatusLabel(roundItem.status)}${roundItem.purpose ? ` / ${roundItem.purpose}` : ""}`)
            ])))
        ]));
    }

    return sectionBlock("SESSION HISTORY", rows, "v2-session-history");
}

function sessionHistoryRow(detail, sessionItem){
    const content = [
        el("strong", {}, `#${sessionItem.sequence} ${formatDateLine(sessionItem)}`),
        el("small", {}, `${formatTimeRange(sessionItem)} / ${sessionStatusLabel(sessionItem.status)}${sessionItem.memo ? ` / ${sessionItem.memo}` : ""}`)
    ];

    if(detail.isOwner && sessionItem.status === "scheduled"){
        content.push(el("details", { className: "v2-session-history__manage" }, [
            el("summary", {}, "状態を更新"),
            el("form", {
                className: "v2-form",
                onSubmit(event){
                    event.preventDefault();
                    updateSessionStatus(detail, sessionItem, event.currentTarget);
                }
            }, [
                el("label", {}, [
                    el("span", {}, "状態"),
                    el("select", { name: "status" }, [
                        el("option", { value: "completed" }, "完了"),
                        el("option", { value: "cancelled" }, "中止"),
                        el("option", { value: "scheduled" }, "予定のまま")
                    ])
                ]),
                field("メモ（任意）", "memo", "text", { maxLength: 400, value: sessionItem.memo ?? "" }),
                el("button", { className: "v2-command", type: "submit" }, "Sessionを更新")
            ])
        ]));
    }

    return el("div", { className: "v2-session-history__row" }, content);
}

function overviewBlock(detail){
    const inviteUrl = createInviteUrl(detail.shareId);
    const items = [
        el("p", {
            className: "v2-app-copy"
        }, detail.nextConfirmed ? `確定日程: ${formatDateLine(detail.nextConfirmed)}` : "まだ日程は確定していません。")
    ];

    if(detail.isOwner){
        items.push(el("div", {
            className: "v2-invite-line"
        }, [
            el("input", {
                readOnly: true,
                value: inviteUrl,
                "aria-label": "招待URL"
            }),
            actionButton("Copy", () => copyText(inviteUrl))
        ]));
    }

    return sectionBlock("OVERVIEW", items);
}

function preparationBlock(detail){
    if(appState.activeGuest){
        return null;
    }

    const preparation = detail.preparation ?? { total: 0, done: 0, pending: 0, ownPending: [] };
    const isOpen = appState.preparationOpen;
    const items = sortPreparationItems(detail.preparationItems);
    const pending = items.filter(item => item.status === "pending");
    const done = items.filter(item => item.status === "done");
    const ownPending = preparation.ownPending ?? [];
    const summary = preparation.total
        ? `${preparation.done} / ${preparation.total} 完了${preparation.pending ? ` / 残り${preparation.pending}件` : ""}`
        : "まだ準備項目はありません。";
    const children = [
        el("div", { className: "v2-preparation-summary" }, [
            el("div", {}, [
                el("strong", {}, preparation.total ? `${preparation.done} / ${preparation.total} 完了` : "準備はまだありません"),
                el("small", {}, detail.isOwner
                    ? preparation.pending ? `残り ${preparation.pending} 件` : "すべて完了しています"
                    : ownPending.length ? `あなたの準備 ${ownPending.length} 件` : summary)
            ]),
            actionButton(isOpen ? "閉じる" : "準備を見る", () => {
                appState.preparationOpen = !isOpen;
                renderDetail();
            }, isOpen ? "" : "primary")
        ])
    ];

    if(!isOpen){
        return sectionBlock("PREPARATION", children, "v2-preparation-block");
    }

    if(appState.preparationFeedback){
        children.push(feedbackMessage(appState.preparationFeedback));
    }

    if(!items.length){
        children.push(emptyState(detail.isOwner ? "まだ準備項目はありません。最初の準備を追加できます。" : "現在必要な準備はありません。"));
    }else{
        children.push(el("div", { className: "v2-preparation-list", "aria-label": "未完了の準備" }, pending.map(item => preparationItemRow(detail, item))));
        if(done.length){
            children.push(el("details", { className: "v2-preparation-done" }, [
                el("summary", {}, `完了済み ${done.length}件`),
                el("div", { className: "v2-preparation-list" }, done.map(item => preparationItemRow(detail, item)))
            ]));
        }
    }

    if(detail.isOwner){
        children.push(preparationManagement(detail));
    }

    return sectionBlock("PREPARATION", children, "v2-preparation-block");
}

function preparationItemRow(detail, item){
    const isEditing = detail.isOwner && appState.preparationEditItemId === item.id;
    const relation = item.session_sequence
        ? `第${item.session_sequence}回`
        : item.round_id ? "次の日程調整" : "卓全体";
    const meta = [
        preparationCategoryLabel(item.category),
        item.assignee_display_name || (detail.isOwner ? "担当なし" : "共有"),
        relation
    ].filter(Boolean).join(" / ");
    const actions = [];
    if(item.can_complete || detail.isOwner){
        actions.push(actionButton(item.status === "done" ? "未完了に戻す" : "完了にする", () => setPreparationStatus(detail, item, item.status !== "done"), item.status === "done" ? "" : "primary"));
    }
    if(detail.isOwner){
        actions.push(actionButton(isEditing ? "編集を閉じる" : "編集", () => {
            appState.preparationEditItemId = isEditing ? "" : item.id;
            renderDetail();
        }));
    }

    return el("article", { className: `v2-preparation-item is-${item.status}` }, [
        el("div", { className: "v2-preparation-item__main" }, [
            el("span", { className: "v2-preparation-item__state", "aria-label": item.status === "done" ? "完了" : "未完了" }, item.status === "done" ? "✓" : "□"),
            el("div", {}, [
                el("strong", {}, item.title),
                el("small", {}, meta),
                item.note ? el("p", {}, item.note) : null
            ])
        ]),
        actions.length ? el("div", { className: "v2-preparation-item__actions" }, actions) : null,
        isEditing ? preparationEditForm(detail, item) : null
    ]);
}

function preparationManagement(detail){
    const items = sortPreparationItems(detail.preparationItems);
    return el("div", { className: "v2-preparation-manage" }, [
        actionButton(appState.preparationAddOpen ? "追加を閉じる" : "＋ 項目を追加", () => {
            appState.preparationAddOpen = !appState.preparationAddOpen;
            renderDetail();
        }, appState.preparationAddOpen ? "" : "primary"),
        appState.preparationAddOpen ? preparationEditForm(detail) : null,
        items.length > 1 ? el("div", { className: "v2-preparation-reorder" }, items.map((item, index) => el("div", {}, [
            el("small", {}, item.title),
            actionButton("↑", () => reorderPreparation(detail, item.id, -1), ""),
            actionButton("↓", () => reorderPreparation(detail, item.id, 1), "")
        ]))) : null
    ]);
}

function preparationEditForm(detail, item = null){
    const participants = detail.participants.filter(participant => participant.user_id && ["owner", "participant"].includes(participant.role));
    const roundId = item?.round_id ?? "";
    const sessionId = item?.session_id ?? "";
    return el("form", {
        className: "v2-preparation-form",
        onSubmit(event){
            event.preventDefault();
            savePreparationItem(detail, event.currentTarget, item);
        }
    }, [
        field("タイトル", "title", "text", { required: true, maxLength: 120, value: item?.title ?? "", placeholder: "HO確認" }),
        el("label", {}, [
            el("span", {}, "カテゴリ"),
            el("select", { name: "category", value: item?.category ?? "other" }, PREPARATION_CATEGORIES.map(([value, label]) => el("option", { value, selected: value === (item?.category ?? "other") }, label)))
        ]),
        el("label", {}, [
            el("span", {}, "担当"),
            el("select", { name: "assigneeParticipantId" }, [
                el("option", { value: "", selected: !item?.assignee_participant_id }, "卓全体 / 担当なし"),
                ...participants.map(participant => el("option", { value: participant.id, selected: participant.id === item?.assignee_participant_id }, participant.display_name ?? "参加者"))
            ])
        ]),
        el("label", {}, [
            el("span", {}, "関連する日程調整"),
            el("select", { name: "roundId" }, [
                el("option", { value: "", selected: !roundId }, "卓全体"),
                ...detail.rounds.map(roundItem => el("option", { value: roundItem.id, selected: roundItem.id === roundId }, `第${roundItem.sequence}回 ${roundStatusLabel(roundItem.status)}`))
            ])
        ]),
        el("label", {}, [
            el("span", {}, "関連するSession"),
            el("select", { name: "sessionId" }, [
                el("option", { value: "", selected: !sessionId }, "指定しない"),
                ...detail.sessions.filter(sessionItem => !roundId || sessionItem.round_id === roundId).map(sessionItem => el("option", { value: sessionItem.id, selected: sessionItem.id === sessionId }, `第${sessionItem.sequence}回 ${sessionStatusLabel(sessionItem.status)}`))
            ])
        ]),
        el("label", {}, [
            el("span", {}, "メモ（任意）"),
            el("textarea", { name: "note", rows: 3, maxLength: 400, placeholder: "透過PNG", value: item?.note ?? "" })
        ]),
        el("div", { className: "v2-preparation-form__actions" }, [
            el("button", { className: "v2-command v2-command--primary", type: "submit" }, item ? "更新" : "追加"),
            item ? actionButton("項目を取り除く", () => archivePreparationItem(detail, item), "") : null
        ])
    ]);
}

function scheduleBlock(detail){
    const items = [];

    if(detail.activeRound){
        items.push(roundSummary(detail.activeRound));
    }

    if(detail.isOwner && detail.activeRound){
        items.push(el("details", {
            className: "v2-schedule-manage",
            open: appState.candidateEditorOpen,
            onToggle(event){
                appState.candidateEditorOpen = event.currentTarget.open;
            }
        }, [
            el("summary", {}, "＋ 日程を編集"),
            candidateForm(detail)
        ]));
    }

    if(detail.isOwner && !detail.activeRound){
        items.push(roundCreateBlock(detail));
    }

    if(appState.roundFeedback){
        items.push(feedbackMessage(appState.roundFeedback));
    }

    if(appState.responseFeedback){
        items.push(feedbackMessage(appState.responseFeedback));
    }

    if(!detail.activeRound){
        items.push(emptyState(detail.isOwner ? "次のRoundを作成すると、候補日を追加できます。" : "次の日程調整が始まるまでお待ちください。"));
    }else if(detail.slots.length === 0){
        items.push(emptyState(detail.isOwner ? "候補日を追加してください。" : "KPが候補日を準備中です。"));
    }else{
        if(detail.isOwner){
            items.push(recommendationBlock(detail));
        }
        items.push(el("div", { className: "v2-schedule-toolbar" }, [
            el("div", {}, [
                el("strong", {}, appState.voteMode ? "回答を編集" : "回答一覧"),
                el("small", {}, appState.voteMode ? "自分の回答だけを変更できます" : `${detail.slots.length}件の候補日`)
            ]),
            actionButton(appState.voteMode ? "投票を終える" : "投票する", () => {
                appState.voteMode = !appState.voteMode;
                renderDetail();
            }, appState.voteMode ? "" : "primary")
        ]));
        items.push(appState.voteMode ? voteEditor(detail) : compactScheduleTable(detail));
    }

    return sectionBlock("SCHEDULE", items);
}

function recommendationBlock(detail){
    const targetMinutes = Number(detail.activeRound?.target_minutes ?? detail.schedule.total_minutes ?? detail.schedule.totalMinutes ?? 0);
    const recommendation = recommendSchedule({
        slots: detail.slots,
        participants: detail.participants,
        responses: detail.responses,
        preferredMinutes: targetMinutes
    });
    const plan = recommendMultiDayPlan({
        slots: detail.slots,
        participants: detail.participants,
        responses: detail.responses,
        preferredMinutes: targetMinutes
    });
    const summary = plan.primary.length
        ? `本番 ${plan.primary.map(item => formatCompactDate(item.item.slot)).join("・")} | 計${formatDurationMinutes(plan.totalMinutes)}`
        : "全員の回答が揃うとプランを作成します。";
    const reserve = plan.reserve.length
        ? `予備 ${plan.reserve.map(item => formatCompactDate(item.item.slot)).join("・")}`
        : "予備日なし";
    const canConfirm = plan.meetsPreferred && plan.allRequiredConfirmed;
    const children = [
        el("div", { className: "v2-recommendation-plan" }, [
            el("div", {}, [el("strong", {}, "おすすめ"), el("small", {}, summary)]),
            el("small", {}, reserve),
            canConfirm ? actionButton("このプランで確定", () => {
                appState.confirmRecommendation = {
                    plan,
                    snapshotAt: recommendationSnapshotForConfirmation(detail)
                };
                renderDetail();
            }, "primary") : null
        ]),
        appState.confirmRecommendation?.plan ? recommendationPlanConfirmPanel(detail, plan) : null,
        el("details", { className: "v2-recommendation-more" }, [
            el("summary", {}, `候補の根拠を見る (${recommendation.recommendations.length})`),
            el("div", { className: "v2-recommendation-list" }, recommendation.recommendations.map(item => recommendationCard(detail, item)))
        ])
    ];
    return sectionBlock("RECOMMENDED", children, "v2-recommendation-block");
}

function recommendationPlanConfirmPanel(detail, plan){
    return el("div", { className: "v2-confirm-panel", role: "region", "aria-label": "複数日プランの確定確認" }, [
        el("strong", {}, "この本番日程で確定しますか？"),
        el("small", {}, `本番 ${plan.primary.map(item => `${formatCompactDate(item.item.slot)} ${formatRecommendationRange(item)}`).join(" / ")}`),
        el("div", { className: "v2-confirm-panel__actions" }, [
            actionButton("戻る", () => { appState.confirmRecommendation = null; renderDetail(); }),
            actionButton("確定する", () => confirmRecommendationPlan(detail, plan), "primary")
        ])
    ]);
}

function recommendationCard(detail, recommendation){
    const slot = recommendation.slot;
    const lockup = formatDateLockup(slot);
    const bestRange = recommendation.commonRanges
        .slice()
        .sort((left, right) => (right.endMinute - right.startMinute) - (left.endMinute - left.startMinute))[0] ?? null;
    const canConfirm = recommendation.allRequiredConfirmed && bestRange && recommendation.counts.no === 0 && recommendation.counts.stale === 0;
    const status = recommendation.classification === "recommended" ? "◎ 全員OK"
        : recommendation.classification === "usable" ? "○ 成立可能"
            : recommendation.classification === "short" ? "△ 時間が短い"
                : recommendation.classification === "blocked" ? "× 成立不可"
                    : recommendation.classification === "stale" ? "再回答が必要" : "要確認";
    const children = [
        el("div", {
            className: "v2-recommendation-card__head"
        }, [
            el("span", {
                className: "v2-live-date"
            }, [el("span", {}, lockup.month), el("strong", {}, lockup.day), el("span", {}, lockup.weekday)]),
            el("div", {}, [
                el("strong", {}, formatTimeRange(slot)),
                el("small", {}, status)
            ]),
            el("strong", {
                className: "v2-recommendation-card__duration"
            }, recommendation.continuousMinutes ? formatDurationMinutes(recommendation.continuousMinutes) : "--")
        ]),
        el("div", {
            className: "v2-common-window"
        }, [
            el("small", {}, "全員共通"),
            el("strong", {}, formatRecommendationRange(bestRange))
        ]),
        el("ul", {
            className: "v2-recommendation-card__reasons"
        }, recommendation.reasons.slice(0, 4).map(reason => el("li", {}, reason))),
        el("details", {
            className: "v2-slot-aggregate"
        }, [
            el("summary", {}, "回答状況を見る"),
            slotAggregate(detail, slot)
        ])
    ];

    if(canConfirm){
        children.push(actionButton("この日で確定", () => {
            appState.confirmRecommendation = {
                slotId: slot.id,
                startMinute: bestRange.startMinute,
                endMinute: bestRange.endMinute,
                snapshotAt: recommendationSnapshotForConfirmation(detail)
            };
            renderDetail();
        }, "primary"));
    }

    if(appState.confirmRecommendation?.slotId === slot.id){
        children.push(recommendationConfirmPanel(detail, recommendation, bestRange));
    }

    return el("article", {
        className: `v2-recommendation-card is-${recommendation.classification}`
    }, children);
}

function recommendationConfirmPanel(detail, recommendation, range){
    if(!range){
        return null;
    }

    return el("div", {
        className: "v2-confirm-panel",
        role: "region",
        "aria-label": "日程確定の確認"
    }, [
        el("strong", {}, "この時間で確定しますか？"),
        el("small", {}, `${formatRecommendationRange(range)} / ${recommendation.requiredCount}/${recommendation.requiredCount}人が参加可能`),
        el("div", {
            className: "v2-confirm-panel__actions"
        }, [
            actionButton("戻る", () => {
                appState.confirmRecommendation = null;
                renderDetail();
            }),
            actionButton("確定する", () => confirmRecommendation(detail, recommendation, range), "primary")
        ])
    ]);
}

function membersBlock(detail){
    const rows = detail.participants.map((participant, index) => {
        const role = participant.role === "owner" ? "KP" : participant.role === "guest" ? "GUEST" : "PL";
        return el("div", {
            className: "v2-member-row"
        }, [
            el("span", {}, String(index + 1).padStart(2, "0")),
            el("strong", {}, participant.display_name ?? participant.displayName ?? "参加者"),
            el("small", {}, role)
        ]);
    });

    const ownParticipant = detail.participants.find(participant => participant.id === detail.ownParticipantId);
    const children = rows.length ? rows : [emptyState("参加者はまだいません。")];

    if(ownParticipant){
        children.push(sessionDisplayNameForm(detail, ownParticipant));
    }

    return sectionBlock("MEMBERS", children);
}

function sessionDisplayNameForm(detail, participant){
    return el("form", {
        className: "v2-session-name-form",
        onSubmit(event){
            event.preventDefault();
            updateSessionDisplayName(detail, event.currentTarget);
        }
    }, [
        field("この卓だけ別名を使う", "displayName", "text", {
            required: false,
            maxLength: 80,
            value: participant.display_name ?? participant.displayName ?? userDisplayName(appState.user),
            placeholder: "千景"
        }),
        el("small", {}, "空欄で保存すると、アカウント表示名に戻ります。"),
        el("button", {
            className: "v2-command",
            type: "submit"
        }, "この卓の表示名を保存")
    ]);
}

function moreBlock(detail){
    const items = [];

    if(detail.isOwner){
        const accountMembers = detail.participants.filter(participant => {
            return participant.user_id && participant.user_id !== appState.user?.id;
        });

        if(accountMembers.length > 0){
            items.push(kpTransferForm(detail, accountMembers));
        }else{
            items.push(emptyState("KP移譲は、ログイン済み参加者が増えると使えます。"));
        }
    }else{
        items.push(emptyState("KP操作は現在のKPだけが実行できます。"));
    }

    return sectionBlock("MORE", items);
}

function candidateForm(detail){
    const composer = appState.candidateComposer;
    const selectedEntries = Object.entries(composer.selections).sort(([left], [right]) => left.localeCompare(right));
    const selectedCount = selectedEntries.reduce((total, [, windows]) => total + windows.length, 0);
    const expectedDuration = Number(detail.activeRound?.target_minutes ?? detail.schedule.total_minutes ?? detail.schedule.totalMinutes ?? 0);

    return el("form", {
        className: "v2-candidate-composer",
        onSubmit(event){
            event.preventDefault();
            addCandidateBatch(detail);
        }
    }, [
        el("div", {
            className: "v2-candidate-composer__head"
        }, [
            el("div", {}, [
                el("strong", {}, "候補日を選ぶ"),
                el("small", {}, "日付を選択してから、時間をまとめて整えます")
            ]),
            el("small", {}, `想定 ${formatDurationMinutes(expectedDuration)}`)
        ]),
        candidateManager(detail),
        candidateCalendar(composer),
        bulkTimeEditor(composer),
        el("div", {
            className: "v2-candidate-composer__selected"
        }, [
            el("div", {
                className: "v2-candidate-composer__selected-head"
            }, [
                el("strong", {}, "選択した日付"),
                el("small", {}, selectedCount ? `${selectedCount}件` : "まだ選択されていません")
            ]),
            selectedEntries.length
                ? el("div", {
                    className: "v2-candidate-composer__date-list"
                }, selectedEntries.map(([dateKey, windows]) => candidateDateEditor(dateKey, windows, expectedDuration)))
                : emptyState("カレンダーから候補日を選択してください。")
        ]),
        appState.candidateFeedback ? feedbackMessage(appState.candidateFeedback) : null,
        el("button", {
            className: "v2-command v2-command--primary",
            type: "submit",
            disabled: selectedCount === 0
        }, selectedCount ? `${selectedCount}件の候補日を追加` : "候補日を選択")
    ]);
}

function candidateManager(detail){
    const active = detail.slots.filter(isActiveCandidate);
    const retired = detail.slots.filter(slot => !isActiveCandidate(slot));
    const confirmedIds = new Set(detail.confirmedSlots.map(item => String(item.slot_id ?? item.slotId ?? "")));
    const selectable = active.filter(slot => !confirmedIds.has(String(slot.id)));
    const selectedIds = appState.candidateBulkSlotIds.filter(slotId => selectable.some(slot => String(slot.id) === String(slotId)));
    const rows = active.map(slot => candidateManagementRow(detail, slot, confirmedIds.has(String(slot.id)), selectedIds));

    return el("section", {
        className: "v2-candidate-manager",
        "aria-label": "既存候補日の管理"
    }, [
        el("div", { className: "v2-candidate-manager__head" }, [
            el("div", {}, [
                el("strong", {}, "既存候補日"),
                el("small", {}, `${active.length}件 / 編集は候補を選んだ時だけ開きます`)
            ]),
            el("div", { className: "v2-candidate-manager__tools" }, [
                selectedIds.length ? actionButton(`${selectedIds.length}件の時刻を変更`, () => openCandidateBulkEditor(detail, selectedIds)) : null,
                retired.length ? el("small", {}, `退役 ${retired.length}件`) : null
            ])
        ]),
        appState.candidateBulkDraft ? candidateBulkEditPanel(detail, active, selectedIds) : null,
        rows.length ? el("div", { className: "v2-candidate-manager__list" }, rows) : emptyState("まだ候補日はありません。"),
        retired.length ? el("details", { className: "v2-candidate-manager__history" }, [
            el("summary", {}, `除外した候補 (${retired.length})`),
            el("div", { className: "v2-candidate-manager__list" }, retired.map(slot => candidateRetiredRow(detail, slot)))
        ]) : null
    ]);
}

function candidateManagementRow(detail, slot, confirmed, selectedIds){
    const responseCount = candidateResponseCount(detail, slot.id);
    const staleCount = candidateStaleResponseCount(detail, slot.id);
    const editing = appState.candidateEditDraft?.slotId === slot.id;
    const confirmingRetire = appState.candidateRetireSlotId === slot.id;
    const status = confirmed
        ? "確定済み"
        : staleCount > 0
            ? `再回答 ${staleCount}人`
            : responseCount > 0 ? `回答 ${responseCount}件` : "未回答";

    return el("article", { className: "v2-candidate-manage-row" }, [
        el("div", { className: "v2-candidate-manage-row__summary" }, [
            !confirmed ? el("label", { className: "v2-candidate-manage-row__select" }, [
                el("input", {
                    type: "checkbox",
                    checked: selectedIds.some(slotId => String(slotId) === String(slot.id)),
                    "aria-label": `${formatCompactDate(slot)}を一括変更に選択`,
                    onChange(event){
                        toggleBulkCandidateSelection(slot.id, event.currentTarget.checked);
                        renderDetail();
                    }
                })
            ]) : null,
            el("div", {}, [
                el("strong", {}, `${formatCompactDate(slot)} ${formatTimeRange(slot)}`),
                el("small", {}, status)
            ]),
            confirmed
                ? el("small", { className: "v2-candidate-manage-row__locked" }, "確定済みの日程です")
                : actionButton(editing ? "閉じる" : "編集", () => {
                    appState.candidateRetireSlotId = "";
                    appState.candidateEditDraft = editing ? null : candidateEditDraft(slot);
                    renderDetail();
                })
        ]),
        editing ? candidateEditPanel(detail, slot, responseCount) : null,
        !confirmed && !editing && !confirmingRetire
            ? textButton("候補を削除", () => {
                appState.candidateRetireSlotId = slot.id;
                renderDetail();
            })
            : null,
        confirmingRetire ? candidateRetirePanel(detail, slot, responseCount) : null
    ]);
}

function openCandidateBulkEditor(detail, selectedIds){
    const selectedSlots = detail.slots.filter(slot => selectedIds.some(slotId => String(slotId) === String(slot.id)));
    const first = selectedSlots[0];
    appState.candidateEditDraft = null;
    appState.candidateRetireSlotId = "";
    appState.candidateBulkDraft = {
        selection: {
            startTime: minuteTime(first?.start_minute ?? first?.startMinute ?? 1200),
            endTime: minuteTime((first?.end_minute ?? first?.endMinute ?? 1440) % (24 * 60)),
            endsNextDay: Number(first?.end_minute ?? first?.endMinute ?? 0) >= 24 * 60
        }
    };
    renderDetail();
}

function candidateBulkEditPanel(detail, active, selectedIds){
    const selectedSlots = active.filter(slot => selectedIds.some(slotId => String(slotId) === String(slot.id)));
    const responseCount = selectedSlots.reduce((count, slot) => count + candidateResponseCount(detail, slot.id), 0);

    if(selectedSlots.length === 0){
        appState.candidateBulkDraft = null;
        return null;
    }

    return el("div", { className: "v2-candidate-edit-panel" }, [
        el("p", {}, `${selectedSlots.length}件を同じ時間に変更します。${responseCount ? `${responseCount}件の回答が再回答対象になります。` : ""}`),
        timeEditorFields("candidate-bulk", appState.candidateBulkDraft.selection, fields => {
            appState.candidateBulkDraft = {
                selection: {
                    ...appState.candidateBulkDraft.selection,
                    ...fields
                }
            };
        }),
        el("div", { className: "v2-candidate-edit-panel__actions" }, [
            actionButton("キャンセル", () => {
                appState.candidateBulkDraft = null;
                renderDetail();
            }),
            actionButton("選択日に適用", () => saveCandidateBulkTimes(detail, selectedIds), "primary")
        ])
    ]);
}

function candidateRetiredRow(detail, slot){
    return el("div", { className: "v2-candidate-manage-row is-retired" }, [
        el("div", { className: "v2-candidate-manage-row__summary" }, [
            el("div", {}, [
                el("strong", {}, `${formatCompactDate(slot)} ${formatTimeRange(slot)}`),
                el("small", {}, `履歴として保持 / 回答 ${candidateResponseCount(detail, slot.id)}件`)
            ]),
            actionButton("元に戻す", () => restoreCandidate(detail, slot))
        ])
    ]);
}

function candidateEditPanel(detail, slot, responseCount){
    const draft = appState.candidateEditDraft;
    const warning = responseCount > 0
        ? `この候補には${responseCount}件の回答があります。保存すると再回答が必要になります。`
        : "回答はまだありません。";

    return el("div", { className: "v2-candidate-edit-panel" }, [
        el("p", {}, warning),
        el("label", { className: "v2-candidate-edit-panel__date" }, [
            el("span", {}, "日付"),
            el("input", {
                type: "date",
                value: draft.dateKey,
                onChange(event){
                    appState.candidateEditDraft = {
                        ...appState.candidateEditDraft,
                        dateKey: event.currentTarget.value
                    };
                }
            })
        ]),
        timeEditorFields(`candidate-edit-${slot.id}`, draft.selection, fields => {
            appState.candidateEditDraft = {
                ...appState.candidateEditDraft,
                selection: {
                    ...appState.candidateEditDraft.selection,
                    ...fields,
                    isOverridden: true
                }
            };
        }),
        el("div", { className: "v2-candidate-edit-panel__actions" }, [
            actionButton("キャンセル", () => {
                appState.candidateEditDraft = null;
                renderDetail();
            }),
            actionButton("候補を更新", () => saveExistingCandidate(detail, slot), "primary")
        ])
    ]);
}

function candidateRetirePanel(detail, slot, responseCount){
    return el("div", { className: "v2-candidate-retire-panel", role: "alert" }, [
        el("strong", {}, "この候補を日程調整から除外しますか？"),
        el("small", {}, responseCount > 0
            ? `この候補には${responseCount}件の回答があります。回答履歴は保持され、候補表とおすすめからは除外されます。`
            : "未回答の候補です。候補表とおすすめから除外されます。"),
        el("div", { className: "v2-candidate-edit-panel__actions" }, [
            actionButton("キャンセル", () => {
                appState.candidateRetireSlotId = "";
                renderDetail();
            }),
            actionButton("削除する", () => retireCandidate(detail, slot), "primary")
        ])
    ]);
}

function toggleBulkCandidateSelection(slotId, selected){
    const current = appState.candidateBulkSlotIds.filter(id => String(id) !== String(slotId));
    appState.candidateBulkSlotIds = selected ? [...current, slotId] : current;
    if(appState.candidateBulkSlotIds.length === 0){
        appState.candidateBulkDraft = null;
    }
}

function candidateCalendar(composer){
    const monthLabel = formatComposerMonth(composer.month);
    const dayButtons = createMonthDays(composer.month).map(day => {
        if(!day){
            return el("span", {
                className: "v2-calendar__blank",
                "aria-hidden": "true"
            });
        }

        const selected = Boolean(composer.selections[day.dateKey]);
        return el("button", {
            className: selected ? "v2-calendar__day is-selected" : "v2-calendar__day",
            type: "button",
            "aria-pressed": String(selected),
            "aria-label": `${formatJapaneseDate(day.dateKey)}${selected ? "を選択解除" : "を選択"}`,
            onClick(){
                appState.candidateComposer = toggleComposerDate(appState.candidateComposer, day.dateKey);
                appState.candidateFeedback = null;
                renderDetail();
            }
        }, String(day.day));
    });

    return el("section", {
        className: "v2-calendar",
        "aria-label": "候補日カレンダー"
    }, [
        el("div", {
            className: "v2-calendar__head"
        }, [
            actionButton("前の月", () => {
                appState.candidateComposer = shiftComposerMonth(appState.candidateComposer, -1);
                renderDetail();
            }),
            el("strong", {}, monthLabel),
            actionButton("次の月", () => {
                appState.candidateComposer = shiftComposerMonth(appState.candidateComposer, 1);
                renderDetail();
            })
        ]),
        el("div", {
            className: "v2-calendar__weekdays",
            "aria-hidden": "true"
        }, ["日", "月", "火", "水", "木", "金", "土"].map(label => el("span", {}, label))),
        el("div", {
            className: "v2-calendar__days"
        }, dayButtons)
    ]);
}

function bulkTimeEditor(composer){
    return el("section", {
        className: "v2-bulk-time"
    }, [
        el("div", {
            className: "v2-bulk-time__head"
        }, [
            el("strong", {}, "すべての選択日に適用"),
            el("small", {}, "個別設定はあとから変更できます")
        ]),
        timeEditorFields("bulk", composer.bulk, fields => {
            appState.candidateComposer = updateComposerBulk(appState.candidateComposer, fields);
        }),
        el("label", {
            className: "v2-bulk-time__scope"
        }, [
            el("span", {}, "適用先"),
            el("select", {
                value: composer.bulk.applyMode,
                onChange(event){
                    appState.candidateComposer = updateComposerBulk(appState.candidateComposer, {
                        applyMode: event.currentTarget.value
                    });
                }
            }, [
                el("option", { value: "unmodified" }, "個別変更していない日だけ"),
                el("option", { value: "all" }, "すべての選択日"
                )
            ])
        ]),
        actionButton("時間を適用", () => {
            appState.candidateComposer = applyComposerBulk(appState.candidateComposer);
            appState.candidateFeedback = null;
            renderDetail();
        })
    ]);
}

function candidateDateEditor(dateKey, windows, expectedDuration){
    const candidateWindows = Array.isArray(windows) ? windows : [];
    const rows = candidateWindows.map((selection, index) => candidateWindowEditor(dateKey, selection, index, expectedDuration));

    if(candidateWindows.length < MAX_CANDIDATES_PER_BATCH){
        rows.push(textButton("＋ 時間帯を追加", () => {
            appState.candidateComposer = addComposerWindow(appState.candidateComposer, dateKey);
            appState.candidateFeedback = null;
            renderDetail();
        }));
    }

    return el("article", {
        className: "v2-candidate-date"
    }, [
        el("div", {
            className: "v2-candidate-date__head"
        }, [
            el("strong", {}, formatJapaneseDate(dateKey)),
            el("small", {}, `${candidateWindows.length}件の候補`)
        ]),
        el("div", { className: "v2-candidate-date__windows" }, rows)
    ]);
}

function candidateWindowEditor(dateKey, selection, index, expectedDuration){
    const candidate = inspectCandidateSelection(dateKey, selection);
    const duration = candidate.ok ? candidate.durationMinutes : 0;
    const isShort = candidate.ok && expectedDuration > 0 && duration < expectedDuration;
    const meta = candidate.ok
        ? `${formatCandidateTime(selection)} / ${formatDurationMinutes(duration)}${selection.isOverridden ? " / 個別設定" : ""}${isShort ? " / 想定より短い" : ""}`
        : candidate.error;

    return el("div", {
        className: candidate.ok ? "v2-candidate-window" : "v2-candidate-window is-invalid"
    }, [
        el("small", {}, meta),
        timeEditorFields(`${dateKey}-${index}`, selection, fields => {
            appState.candidateComposer = updateComposerWindow(appState.candidateComposer, dateKey, index, fields);
        }),
        actionButton("削除", () => {
            appState.candidateComposer = removeComposerWindow(appState.candidateComposer, dateKey, index);
            appState.candidateFeedback = null;
            renderDetail();
        })
    ]);
}

function timeEditorFields(scope, selection, onChange){
    return el("div", {
        className: "v2-time-editor"
    }, [
        el("label", {}, [
            el("span", {}, "開始"),
            el("input", {
                name: `${scope}-start`,
                type: "time",
                value: selection.startTime,
                required: true,
                onChange(event){
                    onChange({
                        startTime: event.currentTarget.value
                    });
                }
            })
        ]),
        el("label", {}, [
            el("span", {}, "終了"),
            el("input", {
                name: `${scope}-end`,
                type: "time",
                value: selection.endTime,
                required: true,
                onChange(event){
                    onChange({
                        endTime: event.currentTarget.value
                    });
                }
            })
        ]),
        el("label", {
            className: "v2-next-day-toggle"
        }, [
            el("input", {
                name: `${scope}-next-day`,
                type: "checkbox",
                checked: selection.endsNextDay,
                onChange(event){
                    onChange({
                        endsNextDay: event.currentTarget.checked
                    });
                }
            }),
            el("span", {}, "翌日終了")
        ])
    ]);
}

function timeRangeEditor({
    scope,
    startMinute,
    endMinute,
    onChange,
    onRemove = null
}){
    const current = normalizeMinuteRange({ startMinute, endMinute });
    const fields = {
        startTime: formatMinuteTime(current.startMinute),
        endTime: formatMinuteTime(current.endMinute),
        endsNextDay: current.endMinute >= 1440
    };
    const emit = changes => onChange({
        ...fields,
        ...changes
    });

    return el("div", {
        className: "v2-time-range"
    }, [
        el("label", {}, [
            el("span", {}, "開始"),
            el("input", {
                name: `${scope}-start`,
                type: "time",
                value: fields.startTime,
                required: true,
                onChange(event){
                    emit({ startTime: event.currentTarget.value });
                }
            })
        ]),
        el("label", {}, [
            el("span", {}, "終了"),
            el("input", {
                name: `${scope}-end`,
                type: "time",
                value: fields.endTime,
                required: true,
                onChange(event){
                    emit({ endTime: event.currentTarget.value });
                }
            })
        ]),
        el("label", {
            className: "v2-next-day-toggle"
        }, [
            el("input", {
                name: `${scope}-next-day`,
                type: "checkbox",
                checked: fields.endsNextDay,
                onChange(event){
                    emit({ endsNextDay: event.currentTarget.checked });
                }
            }),
            el("span", {}, "翌日終了")
        ]),
        onRemove ? actionButton("削除", onRemove) : null
    ]);
}

function compactScheduleTable(detail){
    const header = el("div", { className: "v2-schedule-table__desktop-head" }, [
        el("strong", {}, "日付・時間"),
        ...detail.participants.map(participant => el("span", {}, compactParticipantName(participant)))
    ]);
    const rows = detail.slots
        .filter(isActiveCandidate)
        .map(slot => compactScheduleRow(detail, slot));
    return el("div", {
        className: "v2-schedule-table",
        style: `--participant-count:${Math.max(1, detail.participants.length)}`
    }, [header, ...rows]);
}

function compactScheduleRow(detail, slot){
    const summary = summarizeSlotResponses(slot.id, detail.participants, detail.responses);
    const staleCount = candidateStaleResponseCount(detail, slot.id);
    const cells = detail.participants.map(participant => {
        const response = findResponseForParticipant(detail.responses, participant.id, slot.id);
        const answer = response?.stale ? "unknown" : response?.answer ?? "unknown";
        return el("span", {
            className: `v2-schedule-table__answer is-${response?.stale ? "stale" : answer}`,
            title: `${compactParticipantName(participant)}: ${response?.stale ? "再回答が必要" : ANSWER_LABELS[answer]}`
        }, response?.stale ? "再" : ANSWER_LABELS[answer]);
    });
    return el("details", { className: "v2-schedule-table__row" }, [
        el("summary", {}, [
            el("span", { className: "v2-schedule-table__date" }, [
                el("strong", {}, formatCompactDate(slot)),
                el("small", {}, formatTimeRange(slot))
            ]),
            el("span", { className: "v2-schedule-table__summary" }, `${summary.yes}○ ${summary.maybe}△ ${summary.no}× 未${summary.unknown}${staleCount ? ` / 再${staleCount}` : ""}`),
            el("span", { className: "v2-schedule-table__desktop-cells" }, cells),
            el("span", { className: "v2-schedule-table__open", "aria-hidden": "true" }, "›")
        ]),
        el("div", { className: "v2-schedule-table__detail" }, [slotAggregate(detail, slot)])
    ]);
}

function voteEditor(detail){
    return el("div", { className: "v2-vote-editor" }, detail.slots.filter(isActiveCandidate).map(slot => slotCard(detail, slot)));
}

function slotCard(detail, slot){
    const summary = summarizeSlotResponses(slot.id, detail.participants, detail.responses);
    const savedResponse = findResponseForParticipant(detail.responses, detail.ownParticipantId, slot.id);
    const ownResponse = savedResponse?.stale ? null : savedResponse;
    const lockup = formatDateLockup(slot);
    const availabilityDraft = getAvailabilityDraft(detail, slot, ownResponse);
    const actions = ["yes", "maybe", "no"].map(answer => {
        const selected = ownResponse?.answer === answer;
        return el("button", {
            className: selected ? "v2-answer is-selected" : "v2-answer",
            type: "button",
            "aria-pressed": String(selected),
            onClick(){
                if(answer === "maybe"){
                    appState.partialResponseDrafts[slot.id] = {
                        ranges: Array.isArray(ownResponse?.ranges) ? ownResponse.ranges.map(normalizeMinuteRange) : []
                    };
                    renderDetail();
                    return;
                }
                answerSlot(detail, slot, answer, [], String(ownResponse?.note ?? ""));
            }
        }, [
            el("strong", {}, ANSWER_LABELS[answer]),
            el("span", {
                className: "sr-only"
            }, answer === "yes" ? "参加できる" : answer === "maybe" ? "未確定または時間が限られる" : "参加できない")
        ]);
    });

    const children = [
        el("div", {
            className: "v2-slot-row"
        }, [
            el("span", {
                className: "v2-live-date"
            }, [
                el("span", {}, lockup.month),
                el("strong", {}, lockup.day),
                el("span", {}, lockup.weekday)
            ]),
            el("div", {}, [
                el("strong", {}, formatTimeRange(slot)),
                el("small", {}, `${summary.yes}○ / ${summary.maybe}△ / ${summary.no}× / 未 ${summary.unknown}`)
            ]),
            el("div", {
                className: "v2-answer-grid"
            }, actions)
        ])
    ];

    if(!ownResponse && availabilityDraft.answer !== "unknown"){
        children.push(availabilityDraftNotice(detail, slot, availabilityDraft));
    }

    if(savedResponse?.stale){
        children.push(el("div", { className: "v2-stale-response", role: "status" }, [
            el("strong", {}, "この候補は更新されました"),
            el("small", {}, "以前の回答は集計とおすすめに使われません。もう一度回答してください。")
        ]));
    }

    if(ownResponse?.answer === "maybe" || appState.partialResponseDrafts[slot.id]){
        children.push(partialResponseEditor(detail, slot, ownResponse, availabilityDraft));
    }

    if(ownResponse){
        children.push(responseMemoEditor(detail, slot, ownResponse));
    }

    if(detail.isOwner){
        children.push(el("details", {
            className: "v2-slot-aggregate"
        }, [
            el("summary", {}, "回答状況を見る"),
            slotAggregate(detail, slot)
        ]));
    }

    return el("article", {
        className: "v2-slot-card"
    }, children);
}

function responseMemoEditor(detail, slot, response){
    return el("form", {
        className: "v2-response-memo",
        onSubmit(event){
            event.preventDefault();
            const note = String(new FormData(event.currentTarget).get("note") ?? "").trim();
            if(note.length > 120){
                appState.responseFeedback = { kind: "error", text: "ひとことメモは120文字以内で入力してください。" };
                renderDetail();
                return;
            }
            answerSlot(detail, slot, response.answer, Array.isArray(response.ranges) ? response.ranges : [], note);
        }
    }, [
        el("label", {}, [
            el("span", {}, "この日のひとことメモ（任意）"),
            el("textarea", { name: "note", maxLength: 120, rows: 2, placeholder: "22時からなら確実", value: response.note ?? "" })
        ]),
        el("button", { className: "v2-command", type: "submit" }, "メモを保存")
    ]);
}

function getAvailabilityDraft(detail, slot, ownResponse){
    if(appState.activeGuest || ownResponse){
        return {
            answer: "unknown",
            ranges: [],
            source: "manual",
            conflicts: []
        };
    }

    return evaluateAvailabilityForSlot({
        availability: appState.personalAvailability,
        slot,
        confirmedSlots: appState.dashboardBundle?.confirmedSlots ?? [],
        scheduleId: detail.scheduleId
    });
}

function availabilityDraftNotice(detail, slot, draft){
    const label = draft.answer === "yes" ? "○ 参加できる" : draft.answer === "maybe" ? "△ 時間が限られる" : "× 参加できない";
    const source = draft.source === "exception"
        ? "特定日の予定"
        : draft.source === "weekly"
            ? "通常の予定"
            : "確定済みの別卓";

    return el("div", {
        className: "v2-availability-draft",
        role: "status"
    }, [
        el("span", {}, `あなたの予定から仮入力: ${label}`),
        el("small", {}, draft.conflicts.length ? "別の確定卓と重複しています" : source),
        draft.answer === "maybe"
            ? actionButton("仮入力を確認", () => {
                appState.partialResponseDrafts[slot.id] = {
                    ranges: draft.ranges.map(range => ({ ...range }))
                };
                renderDetail();
            })
            : actionButton(`${label}として回答`, () => answerSlot(detail, slot, draft.answer))
    ]);
}

function partialResponseEditor(detail, slot, response, draft){
    const localDraft = appState.partialResponseDrafts[slot.id];
    const responseRanges = Array.isArray(response?.ranges) ? response.ranges : [];
    const ranges = localDraft?.ranges ?? responseRanges;
    const usesPartialTimes = ranges.length > 0 || Boolean(localDraft);

    if(!usesPartialTimes){
        return el("div", {
            className: "v2-partial-response"
        }, [
            el("small", {}, "△ は予定が未確定、または参加できる時間が限られる場合に使います。"),
            actionButton("時間が限られる", () => {
                appState.partialResponseDrafts[slot.id] = {
                    ranges: draft.answer === "maybe" && draft.ranges.length
                        ? draft.ranges.map(range => ({ ...range }))
                        : [{
                            startMinute: Number(slot.start_minute ?? slot.startMinute),
                            endMinute: Number(slot.end_minute ?? slot.endMinute)
                        }]
                };
                renderDetail();
            }),
            actionButton("予定が未確定として回答", () => answerSlot(detail, slot, "maybe"))
        ]);
    }

    const rangeRows = ranges.map((range, index) => timeRangeEditor({
        scope: `response-${slot.id}-${index}`,
        startMinute: range.startMinute ?? range.start_minute,
        endMinute: range.endMinute ?? range.end_minute,
        onChange(fields){
            const nextRange = minutesFromTimeFields(fields, range);
            if(!nextRange){
                return;
            }
            appState.partialResponseDrafts[slot.id] = {
                ranges: ranges.map((item, itemIndex) => itemIndex === index ? nextRange : normalizeMinuteRange(item))
            };
        },
        onRemove: ranges.length > 1 ? () => {
            appState.partialResponseDrafts[slot.id] = {
                ranges: ranges.filter((_, indexToKeep) => indexToKeep !== index).map(normalizeMinuteRange)
            };
            renderDetail();
        } : null
    }));

    const actions = [
        actionButton("この内容で回答", () => {
            const validation = validatePartialRanges(slot, ranges);
            if(!validation.ok){
                appState.responseFeedback = {
                    kind: "error",
                    text: validation.error
                };
                renderDetail();
                return;
            }
            answerSlot(detail, slot, "maybe", validation.ranges, String(response?.note ?? ""));
        }, "primary"),
        actionButton("未確定に戻す", () => answerSlot(detail, slot, "maybe", [], String(response?.note ?? "")))
    ];

    if(ranges.length < MAX_AVAILABILITY_RANGES){
        actions.unshift(textButton("＋ 時間帯を追加", () => {
            appState.partialResponseDrafts[slot.id] = {
                ranges: [
                    ...ranges.map(normalizeMinuteRange),
                    {
                        startMinute: Number(slot.start_minute ?? slot.startMinute),
                        endMinute: Number(slot.end_minute ?? slot.endMinute)
                    }
                ]
            };
            renderDetail();
        }));
    }

    return el("div", {
        className: "v2-partial-response"
    }, [
        el("small", {}, "参加できる時間を候補時間の範囲内で入力してください。"),
        el("div", { className: "v2-partial-response__ranges" }, rangeRows),
        el("div", { className: "v2-partial-response__actions" }, actions)
    ]);
}

function slotAggregate(detail, slot){
    const rows = detail.participants.map(participant => {
        const response = findResponseForParticipant(detail.responses, participant.id, slot.id);
        const ranges = Array.isArray(response?.ranges) ? response.ranges : [];
        const responseLabel = response?.stale
            ? "再回答が必要"
            : response?.answer === "maybe" && ranges.length
            ? ranges.map(range => formatRecommendationRange({
                startMinute: Number(range.startMinute ?? range.start_minute),
                endMinute: Number(range.endMinute ?? range.end_minute)
            })).join(", ")
            : response?.answer === "maybe" ? "未確定" : "";
        return el("div", {
            className: "v2-aggregate-row"
        }, [
            el("span", { className: response?.stale ? "is-stale" : "" }, response?.stale ? "再" : ANSWER_LABELS[response?.answer ?? "unknown"]),
            el("strong", {}, participant.display_name ?? participant.displayName ?? "参加者"),
            el("small", {}, `${responseLabel}${response?.note ? `${responseLabel ? " / " : ""}${response.note}` : ""}`)
        ]);
    });

    return el("div", {
        className: "v2-aggregate"
    }, rows);
}

function kpTransferForm(detail, members){
    return el("form", {
        className: "v2-form",
        onSubmit(event){
            event.preventDefault();
            transferKp(detail, event.currentTarget);
        }
    }, [
        el("label", {}, [
            el("span", {}, "KP移譲"),
            el("select", {
                name: "newOwnerUserId",
                required: true
            }, members.map(member => el("option", {
                value: member.user_id
            }, member.display_name ?? "参加者")))
        ]),
        el("button", {
            className: "v2-command",
            type: "submit"
        }, "KPを移譲")
    ]);
}

function guestJoinForm(shareId){
    return el("form", {
        className: "v2-form",
        onSubmit(event){
            event.preventDefault();
            joinGuest(shareId, event.currentTarget);
        }
    }, [
        field("Guest名", "displayName", "text", {
            required: true,
            maxLength: 80,
            placeholder: "千景"
        }),
        el("button", {
            className: "v2-command",
            type: "submit"
        }, "Guestとして参加")
    ]);
}

function sessionSummary(detail){
    return el("div", {
        className: "v2-session-summary"
    }, [
        el("strong", {}, detail.title),
        el("small", {}, `${detail.participants.length} members / ${detail.slots.length} candidates`)
    ]);
}

function renderLoading(message){
    root.replaceChildren(sectionBlock("LOADING", [
        emptyState(message)
    ]));
}

function renderConfigMissing(){
    root.replaceChildren(sectionBlock("SCHEDULER", [
        emptyState("いまは卓の同期を利用できません。"),
        el("p", {
            className: "v2-app-copy"
        }, "認証設定を取得できないため、現在はログインできません。時間をおいてもう一度お試しください。")
    ]));
}

function bindShellLogin(){
    shellLoginButton?.addEventListener("click", async () => {
        if(!appState.config?.enabled || !appState.config.scheduleEnabled || !appState.repository){
            renderConfigMissing();
            return;
        }

        try{
            await loginWithDiscord();
        }catch(error){
            renderError(toUserMessage(error));
        }
    });
}

function renderShellAuth(){
    if(!shellLoginButton){
        return;
    }

    const configured = Boolean(appState.config?.enabled && appState.config.scheduleEnabled && appState.repository);
    shellLoginButton.hidden = Boolean(appState.user);
    shellLoginButton.disabled = !configured;
    shellLoginButton.title = configured ? "Discordアカウントでログイン" : "認証設定を確認できません";
}

function renderError(message){
    root.replaceChildren(sectionBlock("ERROR", [
        emptyState(message),
        textButton("再読み込み", () => refresh())
    ]));
}

function actionButton(label, onClick, variant = ""){
    return el("button", {
        className: variant === "primary" ? "v2-command v2-command--primary" : "v2-command",
        type: "button",
        onClick(event){
            if(appState.busy){
                event.preventDefault();
                return;
            }

            onClick(event);
        }
    }, label);
}

function textButton(label, onClick){
    return el("button", {
        className: "v2-text-button",
        type: "button",
        onClick
    }, label);
}

function rememberAuthIntent(){
    const route = readRoute();

    if(route.type !== "join"){
        return;
    }

    try{
        sessionStorage.setItem(AUTH_INTENT_KEY, JSON.stringify({
            path: location.pathname,
            shareId: route.shareId,
            createdAt: Date.now()
        }));
    }catch{
        // OAuth can still proceed; query redirect preserves the invite on modern browsers.
    }
}

function restoreAuthIntent(){
    if(!appState.user || appState.route.type !== "home"){
        return;
    }

    try{
        const parsed = JSON.parse(sessionStorage.getItem(AUTH_INTENT_KEY) || "null");
        const shareId = String(parsed?.shareId ?? "");
        const isFresh = Number.isFinite(parsed?.createdAt) && Date.now() - parsed.createdAt < 10 * 60 * 1000;

        sessionStorage.removeItem(AUTH_INTENT_KEY);

        if(isFresh && /^[A-Za-z0-9_-]{16,}$/.test(shareId)){
            appState.route = {
                type: "join",
                shareId
            };
            history.replaceState(null, "", `${location.pathname}#/join/${shareId}`);
        }
    }catch{
        sessionStorage.removeItem(AUTH_INTENT_KEY);
    }
}

function createAuthRedirectUrl(){
    const url = new URL(location.href);

    if(appState.route.type === "join"){
        url.hash = "";
        url.searchParams.set("invite", appState.route.shareId);
    }

    return url.toString();
}

function setBusy(value){
    appState.busy = Boolean(value);
}

function userDisplayName(user){
    return resolveDiscordDisplayName(user?.user_metadata);
}

function ensureCandidateComposer(detail){
    if(appState.candidateScheduleId === detail.scheduleId){
        return;
    }

    appState.candidateScheduleId = detail.scheduleId;
    appState.candidateComposer = createCandidateComposer();
    appState.candidateEditorOpen = false;
    appState.candidateFeedback = null;
}

function ensurePreparationState(detail){
    if(appState.preparationScheduleId === detail.scheduleId){
        return;
    }

    appState.preparationScheduleId = detail.scheduleId;
    appState.preparationOpen = false;
    appState.preparationAddOpen = false;
    appState.preparationEditItemId = "";
    appState.preparationFeedback = null;
}

async function reloadActiveDetail(detail){
    if(appState.activeGuest){
        const view = await appState.repository.loadGuestView(
            appState.activeGuest.shareId,
            appState.activeGuest.participantId,
            appState.activeGuest.guestToken
        );
        appState.activeDetail = createScheduleBundleViewModel(view);
        return;
    }

    if(detail.isOwner){
        const bundle = await appState.repository.loadSchedule(detail.scheduleId);
        appState.activeDetail = createScheduleBundleViewModel(bundle, appState.user?.id ?? "");
        return;
    }

    const view = await appState.repository.loadAccountView(detail.shareId);
    const preparation = await appState.repository.loadTrpgV12Preparation(detail.scheduleId);
    appState.activeDetail = createScheduleBundleViewModel({ ...view, preparation }, appState.user?.id ?? "");
}
