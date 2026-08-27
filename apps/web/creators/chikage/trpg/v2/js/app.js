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
    createRecommendationSnapshot,
    formatRecommendationRange,
    recommendSchedule
} from "./recommendationEngine.js";

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
    candidateFeedback: null,
    dashboardFeedback: null,
    responseFeedback: null,
    partialResponseDrafts: {},
    confirmRecommendation: null,
    route: {
        type: "home",
        shareId: ""
    },
    busy: false
};

const AUTH_INTENT_KEY = "relmua_trpg_v2_auth_intent_v1";
const root = document.querySelector("[data-trpg-v2-app]");

if(root){
    init();
}

async function init(){
    renderLoading("卓の記録を確認しています。");

    try{
        appState.route = readRoute();
        appState.config = await loadSupabasePublicConfig();

        if(!appState.config.enabled || !appState.config.scheduleEnabled){
            renderConfigMissing();
            return;
        }

        const client = await createSupabaseBrowserClient(appState.config);
        appState.repository = new SupabaseScheduleRepository(client);
        appState.user = await appState.repository.getCurrentUser();
        restoreAuthIntent();

        appState.repository.onAuthStateChange(async user => {
            appState.user = user;
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
            await appState.repository.ensureTrpgV2Profile();
        }

        if(appState.route.type === "join"){
            await renderJoin(appState.route.shareId);
            return;
        }

        if(appState.user){
            await loadDashboard();
            if(appState.screen === "availability"){
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

    const blocks = [
        accountBar(),
        ...(appState.dashboardFeedback ? [feedbackMessage(appState.dashboardFeedback)] : []),
        nextSessionBlock(dashboard.nextSession),
        listBlock("ACTION REQUIRED", dashboard.actionRequired, "未回答の候補日はありません", item => openDetail(item)),
        createSessionForm(),
        listBlock("MY SESSIONS", [
            ...dashboard.hosting,
            ...dashboard.playing
        ], "まだ参加している卓はありません", item => openDetail(item), "v2-app-block--sessions")
    ];

    root.replaceChildren(...blocks);
}

function renderAvailability(){
    const model = appState.availabilityEditor;
    const weeklyRows = WEEKDAY_LABELS.map((label, weekday) => availabilityWeekdayRow(model, weekday, label));
    const exceptions = Object.entries(model.exceptions).sort(([left], [right]) => left.localeCompare(right));

    root.replaceChildren(
        sectionBlock("MY AVAILABILITY", [
            textButton("← MY SESSIONS", () => {
                appState.screen = "dashboard";
                appState.availabilityFeedback = null;
                renderDashboard();
            }),
            el("p", {
                className: "v2-app-copy"
            }, "通常の参加可能時間を保存すると、候補日への回答を仮入力できます。確定済みの別卓と重なる時間は候補ごとに知らせます。"),
            el("div", {
                className: "v2-availability-list"
            }, weeklyRows),
            el("div", {
                className: "v2-availability-exceptions"
            }, [
                el("div", {
                    className: "v2-availability-exceptions__head"
                }, [
                    el("strong", {}, "特定日の例外"),
                    el("small", {}, "通常の週間予定より優先されます")
                ]),
                el("div", {
                    className: "v2-availability-add-date"
                }, [
                    el("input", {
                        type: "date",
                        value: appState.availabilityNewDate,
                        "aria-label": "例外を追加する日付",
                        onChange(event){
                            appState.availabilityNewDate = event.currentTarget.value;
                        }
                    }),
                    actionButton("日付を追加", () => {
                        const dateKey = String(appState.availabilityNewDate ?? "");
                        if(!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)){
                            appState.availabilityFeedback = {
                                kind: "error",
                                text: "例外を設定する日付を入力してください。"
                            };
                            renderAvailability();
                            return;
                        }

                        appState.availabilityEditor = updateExceptionState(model, dateKey, "available");
                        appState.availabilityFeedback = null;
                        renderAvailability();
                    })
                ]),
                exceptions.length
                    ? el("div", { className: "v2-availability-exception-list" }, exceptions.map(([dateKey, entry]) => availabilityExceptionRow(model, dateKey, entry)))
                    : emptyState("特定日の例外はまだありません。")
            ]),
            appState.availabilityFeedback ? feedbackMessage(appState.availabilityFeedback) : null,
            actionButton("予定を保存", () => savePersonalAvailability(), "primary")
        ])
    );
}

function availabilityWeekdayRow(model, weekday, label){
    const entry = availabilityEntry(model, "weekly", weekday);
    return el("article", {
        className: "v2-availability-row"
    }, [
        el("strong", {}, label),
        availabilityStateSelect(entry.state, nextState => {
            appState.availabilityEditor = updateWeeklyState(model, weekday, nextState);
            appState.availabilityFeedback = null;
            renderAvailability();
        }),
        entry.state === "available"
            ? availabilityRangesEditor(model, "weekly", weekday, entry)
            : el("small", {}, entry.state === "unavailable" ? "参加不可" : "未設定")
    ]);
}

function availabilityExceptionRow(model, dateKey, entry){
    return el("article", {
        className: "v2-availability-exception"
    }, [
        el("div", {
            className: "v2-availability-exception__head"
        }, [
            el("strong", {}, formatJapaneseDate(dateKey)),
            textButton("削除", () => {
                appState.availabilityEditor = removeException(model, dateKey);
                appState.availabilityFeedback = null;
                renderAvailability();
            })
        ]),
        availabilityStateSelect(entry.state, nextState => {
            appState.availabilityEditor = updateExceptionState(model, dateKey, nextState);
            appState.availabilityFeedback = null;
            renderAvailability();
        }, false),
        entry.state === "available"
            ? availabilityRangesEditor(model, "exception", dateKey, entry)
            : el("small", {}, "この日は参加不可")
    ]);
}

function availabilityStateSelect(value, onChange, allowUnset = true){
    return el("label", {
        className: "v2-availability-state"
    }, [
        el("span", {}, "予定"),
        el("select", {
            value,
            onChange(event){
                onChange(event.currentTarget.value);
            }
        }, [
            ...(allowUnset ? [el("option", { value: "unset" }, "未設定")] : []),
            el("option", { value: "available" }, "参加できる"),
            el("option", { value: "unavailable" }, "参加できない")
        ])
    ]);
}

function availabilityRangesEditor(model, scope, key, entry){
    const rows = entry.ranges.map((range, index) => timeRangeEditor({
        scope: `availability-${scope}-${key}-${index}`,
        startMinute: range.startMinute,
        endMinute: range.endMinute,
        onChange(fields){
            const nextRange = minutesFromTimeFields(fields, range);
            if(!nextRange){
                return;
            }
            appState.availabilityEditor = updateAvailabilityRange(model, scope, key, index, nextRange);
            appState.availabilityFeedback = null;
            renderAvailability();
        },
        onRemove: entry.ranges.length > 1 ? () => {
            appState.availabilityEditor = removeAvailabilityRange(model, scope, key, index);
            appState.availabilityFeedback = null;
            renderAvailability();
        } : null
    }));

    if(entry.ranges.length < MAX_AVAILABILITY_RANGES){
        rows.push(textButton("＋ 時間帯を追加", () => {
            appState.availabilityEditor = addAvailabilityRange(model, scope, key);
            appState.availabilityFeedback = null;
            renderAvailability();
        }));
    }

    return el("div", {
        className: "v2-availability-ranges"
    }, rows);
}

async function savePersonalAvailability(){
    if(appState.busy){
        return;
    }

    const validation = validateAvailabilityPayload(appState.availabilityEditor);
    if(!validation.ok){
        appState.availabilityFeedback = {
            kind: "error",
            text: validation.errors[0]
        };
        renderAvailability();
        return;
    }

    setBusy(true);

    try{
        const saved = await appState.repository.saveTrpgV31PersonalAvailability(validation.payload);
        appState.personalAvailability = createPersonalAvailabilityModel(saved);
        appState.availabilityEditor = createPersonalAvailabilityModel(saved);
        appState.availabilityFeedback = {
            kind: "success",
            text: "自分の予定を保存しました。"
        };
        renderAvailability();
    }catch(error){
        reportSchedulerError("save-personal-availability", error);
        appState.availabilityFeedback = {
            kind: "error",
            text: "予定の保存に失敗しました。時間をおいてもう一度お試しください。"
        };
        renderAvailability();
    }finally{
        setBusy(false);
    }
}

function renderDetail(){
    const detail = appState.activeDetail;

    if(!detail){
        renderDashboard();
        return;
    }

    ensureCandidateComposer(detail);

    const blocks = [
        detailHeader(detail),
        overviewBlock(detail),
        scheduleBlock(detail),
        membersBlock(detail),
        moreBlock(detail)
    ];

    root.replaceChildren(...blocks);
}

async function openDetail(item){
    renderLoading("卓を開いています。");

    try{
        if(item.isOwner){
            const bundle = await appState.repository.loadSchedule(item.schedule.id);
            appState.activeDetail = createScheduleBundleViewModel({
                ...bundle,
                confirmedSlots: bundle.confirmedSlots
            }, appState.user?.id ?? "");
        }else{
            const view = await appState.repository.loadAccountView(item.shareId);
            appState.activeDetail = createScheduleBundleViewModel(view, appState.user?.id ?? "");
        }

        renderDetail();
    }catch(error){
        renderError(toUserMessage(error));
    }
}

async function loginWithDiscord(){
    rememberAuthIntent();
    await appState.repository.signInWithDiscord(createAuthRedirectUrl());
}

async function logout(){
    await appState.repository.signOut();
    appState.user = null;
    appState.dashboard = null;
    appState.dashboardBundle = null;
    appState.activeDetail = null;
    renderSignedOut();
}

async function createSession(form){
    if(appState.busy){
        return;
    }

    const data = new FormData(form);
    const totalMinutes = combineDurationMinutes(data.get("totalHours"), data.get("totalMinutes"));

    if(totalMinutes === null){
        appState.dashboardFeedback = {
            kind: "error",
            text: "想定プレイ時間は30分から30時間までで入力してください。"
        };
        renderDashboard();
        return;
    }

    setBusy(true);

    try{
        const view = await appState.repository.createTrpgV2Session({
            title: data.get("title"),
            totalMinutes,
            memo: data.get("memo")
        });

        appState.dashboardFeedback = null;
        await loadDashboard();
        appState.activeDetail = createScheduleBundleViewModel(view, appState.user?.id ?? "");
        renderDetail();
    }catch(error){
        reportSchedulerError("create-session", error);
        appState.dashboardFeedback = {
            kind: "error",
            text: toUserMessage(error)
        };
        renderDashboard();
    }finally{
        setBusy(false);
    }
}

async function joinAccount(shareId){
    setBusy(true);

    try{
        const name = userDisplayName(appState.user);
        const view = await appState.repository.joinAccount(shareId, name);
        appState.activeDetail = createScheduleBundleViewModel(view, appState.user?.id ?? "");
        renderDetail();
    }catch(error){
        renderError(toUserMessage(error));
    }finally{
        setBusy(false);
    }
}

async function joinGuest(shareId, form){
    const data = new FormData(form);
    setBusy(true);

    try{
        const credential = await appState.repository.joinGuest(shareId, data.get("displayName"));
        appState.guestTokens.remember(shareId, credential);
        appState.activeGuest = {
            shareId,
            participantId: credential.participantId,
            guestToken: credential.guestToken
        };
        appState.activeDetail = createScheduleBundleViewModel(credential.view);
        renderDetail();
    }catch(error){
        renderError(toUserMessage(error));
    }finally{
        setBusy(false);
    }
}

async function addCandidateBatch(detail){
    if(appState.busy){
        return;
    }

    const draft = buildCandidateBatch(
        appState.candidateComposer,
        detail.schedule.total_minutes ?? detail.schedule.totalMinutes
    );

    if(!draft.ok){
        appState.candidateFeedback = {
            kind: "error",
            text: draft.errors[0]
        };
        renderDetail();
        return;
    }

    setBusy(true);

    try{
        await appState.repository.addTrpgV2Candidates({
            scheduleId: detail.scheduleId,
            candidates: draft.candidates
        });
        appState.candidateComposer = createCandidateComposer();
        appState.candidateScheduleId = detail.scheduleId;
        appState.candidateFeedback = {
            kind: "success",
            text: `${draft.candidates.length}件の候補日を追加しました。`
        };
        await reloadActiveDetail(detail);
        await loadDashboard();
        renderDetail();
    }catch(error){
        reportSchedulerError("add-candidates", error);
        appState.candidateFeedback = {
            kind: "error",
            text: candidateErrorMessage(error)
        };
        renderDetail();
    }finally{
        setBusy(false);
    }
}

async function updateSessionDisplayName(detail, form){
    if(appState.busy){
        return;
    }

    const displayName = String(new FormData(form).get("displayName") ?? "").trim();

    if(!displayName){
        appState.candidateFeedback = {
            kind: "error",
            text: "この卓での表示名を入力してください。"
        };
        renderDetail();
        return;
    }

    setBusy(true);

    try{
        if(appState.activeGuest){
            await appState.repository.updateGuestName(
                appState.activeGuest.shareId,
                appState.activeGuest.participantId,
                appState.activeGuest.guestToken,
                displayName
            );
        }else{
            await appState.repository.updateTrpgV2SessionDisplayName({
                scheduleId: detail.scheduleId,
                displayName
            });
        }

        appState.candidateFeedback = {
            kind: "success",
            text: "この卓での表示名を更新しました。"
        };
        await reloadActiveDetail(detail);
        if(appState.user){
            await loadDashboard();
        }
        renderDetail();
    }catch(error){
        reportSchedulerError("update-session-display-name", error);
        appState.candidateFeedback = {
            kind: "error",
            text: toUserMessage(error)
        };
        renderDetail();
    }finally{
        setBusy(false);
    }
}

async function answerSlot(detail, slot, answer, ranges = []){
    setBusy(true);

    try{
        let view;

        if(appState.activeGuest){
            view = await appState.repository.upsertResponse({
                shareId: appState.activeGuest.shareId,
                participantId: appState.activeGuest.participantId,
                guestToken: appState.activeGuest.guestToken,
                slotId: slot.id,
                answer,
                ranges
            });
        }else{
            view = await appState.repository.upsertAccountResponse({
                shareId: detail.shareId,
                slotId: slot.id,
                answer,
                ranges
            });
        }

        delete appState.partialResponseDrafts[slot.id];
        appState.responseFeedback = null;
        appState.activeDetail = createScheduleBundleViewModel(view, appState.user?.id ?? "");
        if(appState.user){
            await loadDashboard();
        }
        renderDetail();
    }catch(error){
        renderError(toUserMessage(error));
    }finally{
        setBusy(false);
    }
}

async function confirmRecommendation(detail, recommendation, range){
    setBusy(true);

    try{
        await appState.repository.confirmTrpgV32Recommendation({
            scheduleId: detail.scheduleId,
            slotId: recommendation.slot.id,
            startMinute: range.startMinute,
            endMinute: range.endMinute,
            snapshotAt: appState.confirmRecommendation?.snapshotAt ?? createRecommendationSnapshot(detail)
        });
        const bundle = await appState.repository.loadSchedule(detail.scheduleId);
        appState.activeDetail = createScheduleBundleViewModel(bundle, appState.user?.id ?? "");
        appState.confirmRecommendation = null;
        await loadDashboard();
        renderDetail();
    }catch(error){
        reportSchedulerError("confirm-recommendation", error);
        appState.responseFeedback = {
            kind: "error",
            text: recommendationErrorMessage(error)
        };
        renderDetail();
    }finally{
        setBusy(false);
    }
}

async function transferKp(detail, form){
    const data = new FormData(form);
    const newOwnerUserId = String(data.get("newOwnerUserId") ?? "");

    if(!newOwnerUserId){
        return;
    }

    setBusy(true);

    try{
        const view = await appState.repository.transferTrpgV2Kp(detail.scheduleId, newOwnerUserId);
        appState.activeDetail = createScheduleBundleViewModel(view, appState.user?.id ?? "");
        await loadDashboard();
        renderDetail();
    }catch(error){
        renderError(toUserMessage(error));
    }finally{
        setBusy(false);
    }
}

function accountBar(){
    return el("div", {
        className: "v2-account-strip"
    }, [
        el("div", {
            className: "v2-account-row"
        }, [
            el("div", {}, [
                el("strong", {}, userDisplayName(appState.user)),
                el("small", {}, "DISCORD / SIGNED IN")
            ]),
            actionButton("自分の予定", () => {
                appState.screen = "availability";
                appState.availabilityEditor = createPersonalAvailabilityModel(appState.personalAvailability);
                appState.availabilityFeedback = null;
                renderAvailability();
            }),
            actionButton("Logout", () => logout())
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

function nextSessionBlock(item){
    if(!item){
        return sectionBlock("NEXT SESSION", [
            emptyState("確定済みの次回日程はまだありません。")
        ]);
    }

    const lockup = formatDateLockup(item.nextConfirmed);
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
            el("small", {}, `NEXT / ${item.role}`),
            el("strong", {}, item.title),
            el("em", {}, formatTimeRange(item.nextConfirmed))
        ])
    ]);

    return sectionBlock("NEXT SESSION", [node], "v2-app-block--next");
}

function listBlock(label, items, emptyText, onOpen, extraClassName = ""){
    const rows = items.map((item, index) => {
        const meta = item.unansweredCount > 0
            ? `${item.unansweredCount}件未回答 / ${item.statusLabel}`
            : `${item.role} / ${item.statusLabel}`;

        return el("button", {
            className: "v2-live-row",
            type: "button",
            onClick(){
                onOpen(item);
            }
        }, [
            el("span", {}, String(index + 1).padStart(2, "0")),
            el("strong", {}, item.title),
            el("small", {}, meta)
        ]);
    });

    return sectionBlock(label, rows.length ? rows : [emptyState(emptyText)], extraClassName || (label === "ACTION REQUIRED" ? "v2-app-block--required" : ""));
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

function scheduleBlock(detail){
    const items = [];

    if(detail.isOwner){
        items.push(candidateForm(detail));
    }

    if(appState.responseFeedback){
        items.push(feedbackMessage(appState.responseFeedback));
    }

    if(detail.slots.length === 0){
        items.push(emptyState(detail.isOwner ? "候補日を追加してください。" : "KPが候補日を準備中です。"));
    }else{
        if(detail.isOwner){
            items.push(recommendationBlock(detail));
        }
        detail.slots.forEach(slot => {
            items.push(slotCard(detail, slot));
        });
    }

    return sectionBlock("SCHEDULE", items);
}

function recommendationBlock(detail){
    const recommendation = recommendSchedule({
        slots: detail.slots,
        participants: detail.participants,
        responses: detail.responses,
        preferredMinutes: Number(detail.schedule.total_minutes ?? detail.schedule.totalMinutes ?? 0)
    });
    const primary = recommendation.recommended.slice(0, 2);
    const other = recommendation.other;
    const children = [
        el("p", {
            className: "v2-app-copy"
        }, "回答済みの参加可能時間だけを重ねて、候補を並べています。")
    ];

    if(primary.length){
        children.push(el("div", {
            className: "v2-recommendation-list"
        }, primary.map(item => recommendationCard(detail, item))));
    }

    if(other.length){
        children.push(el("details", {
            className: "v2-recommendation-more"
        }, [
            el("summary", {}, `その他の候補 ${other.length}件`),
            el("div", {
                className: "v2-recommendation-list"
            }, other.map(item => recommendationCard(detail, item)))]));
    }

    return sectionBlock("RECOMMENDED", children, "v2-recommendation-block");
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
                snapshotAt: createRecommendationSnapshot(detail)
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
        field("この卓での表示名", "displayName", "text", {
            required: true,
            maxLength: 80,
            value: participant.display_name ?? participant.displayName ?? userDisplayName(appState.user),
            placeholder: "千景"
        }),
        el("button", {
            className: "v2-command",
            type: "submit"
        }, "表示名を更新")
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
    const expectedDuration = Number(detail.schedule.total_minutes ?? detail.schedule.totalMinutes ?? 0);

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
            renderDetail();
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

function minutesFromTimeFields(fields, fallback){
    const startMinute = timeToMinute(fields.startTime ?? formatMinuteTime(fallback?.startMinute));
    const endBase = timeToMinute(fields.endTime ?? formatMinuteTime(fallback?.endMinute));
    const endsNextDay = Boolean(fields.endsNextDay ?? Number(fallback?.endMinute) >= 1440);

    if(startMinute === null || endBase === null){
        return null;
    }

    return {
        startMinute,
        endMinute: endBase + (endsNextDay ? 1440 : 0)
    };
}

function normalizeMinuteRange(range){
    return {
        startMinute: Number(range?.startMinute ?? range?.start_minute ?? 0),
        endMinute: Number(range?.endMinute ?? range?.end_minute ?? 0)
    };
}

function validatePartialRanges(slot, ranges){
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

function slotCard(detail, slot){
    const summary = summarizeSlotResponses(slot.id, detail.participants, detail.responses);
    const ownResponse = findResponseForParticipant(detail.responses, detail.ownParticipantId, slot.id);
    const lockup = formatDateLockup(slot);
    const availabilityDraft = getAvailabilityDraft(detail, slot, ownResponse);
    const actions = ["yes", "maybe", "no"].map(answer => {
        const selected = ownResponse?.answer === answer;
        return el("button", {
            className: selected ? "v2-answer is-selected" : "v2-answer",
            type: "button",
            "aria-pressed": String(selected),
            onClick(){
                answerSlot(detail, slot, answer);
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

    if(ownResponse?.answer === "maybe" || appState.partialResponseDrafts[slot.id]){
        children.push(partialResponseEditor(detail, slot, ownResponse, availabilityDraft));
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
            renderDetail();
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
            answerSlot(detail, slot, "maybe", validation.ranges);
        }, "primary"),
        actionButton("未確定に戻す", () => answerSlot(detail, slot, "maybe"))
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
        const responseLabel = response?.answer === "maybe" && ranges.length
            ? ranges.map(range => formatRecommendationRange({
                startMinute: Number(range.startMinute ?? range.start_minute),
                endMinute: Number(range.endMinute ?? range.end_minute)
            })).join(", ")
            : response?.answer === "maybe" ? "未確定" : "";
        return el("div", {
            className: "v2-aggregate-row"
        }, [
            el("span", {}, ANSWER_LABELS[response?.answer ?? "unknown"]),
            el("strong", {}, participant.display_name ?? participant.displayName ?? "参加者"),
            el("small", {}, responseLabel)
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

function sectionBlock(label, children, extraClassName = ""){
    return el("section", {
        className: `v2-app-block ${extraClassName}`.trim()
    }, [
        el("p", {
            className: "v2-row-label"
        }, label),
        ...children
    ]);
}

function emptyState(message){
    return el("p", {
        className: "v2-empty-state"
    }, message);
}

function feedbackMessage(feedback){
    return el("p", {
        className: `v2-form-feedback v2-form-feedback--${feedback.kind === "success" ? "success" : "error"}`,
        role: feedback.kind === "error" ? "alert" : "status"
    }, feedback.text);
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
        }, "時間をおいてもう一度お試しください。")
    ]));
}

function renderError(message){
    root.replaceChildren(sectionBlock("ERROR", [
        emptyState(message),
        textButton("再読み込み", () => refresh())
    ]));
}

function field(label, name, type, attrs = {}){
    return el("label", {}, [
        el("span", {}, label),
        el("input", {
            name,
            type,
            ...attrs
        })
    ]);
}

function textareaField(label, name, placeholder){
    return el("label", {}, [
        el("span", {}, label),
        el("textarea", {
            name,
            rows: 3,
            maxLength: 2000,
            placeholder
        })
    ]);
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

function el(tagName, attrs = {}, children = []){
    const node = document.createElement(tagName);

    Object.entries(attrs).forEach(([key, value]) => {
        if(value === null || value === undefined || value === false){
            return;
        }

        if(key === "className"){
            node.className = value;
            return;
        }

        if(key === "onClick"){
            node.addEventListener("click", value);
            return;
        }

        if(key === "onSubmit"){
            node.addEventListener("submit", value);
            return;
        }

        if(key === "onChange"){
            node.addEventListener("change", value);
            return;
        }

        if(key in node){
            node[key] = value;
            return;
        }

        node.setAttribute(key, String(value));
    });

    const items = Array.isArray(children) ? children : [children];
    items.forEach(child => {
        if(child === null || child === undefined){
            return;
        }

        node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });

    return node;
}

function readRoute(){
    const match = location.hash.match(/^#\/join\/([A-Za-z0-9_-]{16,})$/);

    if(match){
        return {
            type: "join",
            shareId: match[1]
        };
    }

    const url = new URL(location.href);
    const invite = url.searchParams.get("invite");
    if(invite && /^[A-Za-z0-9_-]{16,}$/.test(invite)){
        return {
            type: "join",
            shareId: invite
        };
    }

    return {
        type: "home",
        shareId: ""
    };
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

function createInviteUrl(shareId){
    return `${location.origin}${location.pathname}#/join/${shareId}`;
}

async function copyText(value){
    try{
        await navigator.clipboard.writeText(value);
    }catch{
        window.prompt("招待URL", value);
    }
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
    appState.candidateFeedback = null;
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
    appState.activeDetail = createScheduleBundleViewModel(view, appState.user?.id ?? "");
}

function formatComposerMonth(monthKey){
    const [year, month] = String(monthKey ?? "").split("-").map(Number);
    return Number.isInteger(year) && Number.isInteger(month) ? `${year}年${month}月` : "候補日";
}

function todayInJapan(){
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date()).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatDateLine(slot){
    const lockup = formatDateLockup(slot);
    return `${lockup.month} ${lockup.day} ${lockup.weekday} / ${formatTimeRange(slot)}`;
}

function toUserMessage(error){
    const message = String(error?.message ?? "");

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

function candidateErrorMessage(error){
    const message = String(error?.message ?? "");

    if(/candidate duration|30 hours|invalid candidate time|schedule_slots_minute_check/i.test(message)){
        return "候補日の時間を確認してください。日付をまたぐ場合は「翌日終了」を選び、1候補は30時間以内にしてください。";
    }

    return "候補日の追加に失敗しました。再読み込みしても続く場合は、もう一度お試しください。";
}

function recommendationErrorMessage(error){
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

function reportSchedulerError(scope, error){
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
