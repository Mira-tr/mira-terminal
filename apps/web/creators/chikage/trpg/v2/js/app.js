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
    datetimeLocalToIso,
    findResponseForParticipant,
    formatDateLockup,
    formatTimeRange,
    summarizeSlotResponses
} from "./sessionViewModel.js";

const appState = {
    config: null,
    repository: null,
    guestTokens: createGuestTokenStore(),
    user: null,
    dashboardBundle: null,
    dashboard: null,
    activeDetail: null,
    activeGuest: null,
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
            renderConfigMissing(appState.config.message);
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
            renderDashboard();
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

    root.replaceChildren(
        accountBar(),
        createSessionForm(),
        nextSessionBlock(dashboard.nextSession),
        listBlock("ACTION REQUIRED", dashboard.actionRequired, "未回答の候補日はありません", item => openDetail(item)),
        listBlock("HOSTING", dashboard.hosting, "KPとして管理している卓", item => openDetail(item)),
        listBlock("PLAYING", dashboard.playing, "PLとして参加している卓", item => openDetail(item))
    );
}

function renderDetail(){
    const detail = appState.activeDetail;

    if(!detail){
        renderDashboard();
        return;
    }

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
    const data = new FormData(form);
    setBusy(true);

    try{
        const view = await appState.repository.createTrpgV2Session({
            title: data.get("title"),
            totalMinutes: Number(data.get("totalMinutes")),
            memo: data.get("memo")
        });

        await loadDashboard();
        appState.activeDetail = createScheduleBundleViewModel(view, appState.user?.id ?? "");
        renderDetail();
    }catch(error){
        renderError(toUserMessage(error));
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

async function addCandidate(detail, form){
    const data = new FormData(form);
    const startsAt = datetimeLocalToIso(data.get("startsAt"));
    const endsAt = datetimeLocalToIso(data.get("endsAt"));

    if(!startsAt || !endsAt){
        renderError("候補日の日時を確認してください。");
        return;
    }

    setBusy(true);

    try{
        const view = await appState.repository.addTrpgV2Candidate({
            scheduleId: detail.scheduleId,
            startsAt,
            endsAt,
            label: data.get("label")
        });
        appState.activeDetail = createScheduleBundleViewModel(view, appState.user?.id ?? "");
        await loadDashboard();
        renderDetail();
    }catch(error){
        renderError(toUserMessage(error));
    }finally{
        setBusy(false);
    }
}

async function answerSlot(detail, slot, answer){
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
                ranges: []
            });
        }else{
            view = await appState.repository.upsertAccountResponse({
                shareId: detail.shareId,
                slotId: slot.id,
                answer,
                ranges: []
            });
        }

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

async function confirmSlot(detail, slot){
    setBusy(true);

    try{
        await appState.repository.confirmSlots(detail.scheduleId, [{
            slotId: slot.id,
            status: "confirmed"
        }]);
        const bundle = await appState.repository.loadSchedule(detail.scheduleId);
        appState.activeDetail = createScheduleBundleViewModel(bundle, appState.user?.id ?? "");
        await loadDashboard();
        renderDetail();
    }catch(error){
        renderError(toUserMessage(error));
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
    return sectionBlock("ME", [
        el("div", {
            className: "v2-account-row"
        }, [
            el("div", {}, [
                el("strong", {}, userDisplayName(appState.user)),
                el("small", {}, "Discord Login / Session preserved")
            ]),
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
        field("想定総時間", "totalMinutes", "number", {
            min: 30,
            max: 1800,
            step: 30,
            value: "240"
        }),
        textareaField("Memo", "memo", "PL / HO / 補足"),
        el("button", {
            className: "v2-command v2-command--primary",
            type: "submit"
        }, "卓を作成")
    ]);

    return sectionBlock("CREATE SESSION", [form]);
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

    return sectionBlock("NEXT SESSION", [node]);
}

function listBlock(label, items, emptyText, onOpen){
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

    return sectionBlock(label, rows.length ? rows : [emptyState(emptyText)]);
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

    if(detail.slots.length === 0){
        items.push(emptyState(detail.isOwner ? "候補日を追加してください。" : "KPが候補日を準備中です。"));
    }else{
        detail.slots.forEach(slot => {
            items.push(slotCard(detail, slot));
        });
    }

    return sectionBlock("SCHEDULE", items);
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

    return sectionBlock("MEMBERS", rows.length ? rows : [emptyState("参加者はまだいません。")]);
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
    return el("form", {
        className: "v2-form v2-form--inline",
        onSubmit(event){
            event.preventDefault();
            addCandidate(detail, event.currentTarget);
        }
    }, [
        field("開始", "startsAt", "datetime-local", {
            required: true
        }),
        field("終了", "endsAt", "datetime-local", {
            required: true
        }),
        field("Label", "label", "text", {
            maxLength: 120,
            placeholder: "夜卓"
        }),
        el("button", {
            className: "v2-command v2-command--primary",
            type: "submit"
        }, "候補日を追加")
    ]);
}

function slotCard(detail, slot){
    const summary = summarizeSlotResponses(slot.id, detail.participants, detail.responses);
    const ownResponse = findResponseForParticipant(detail.responses, detail.ownParticipantId, slot.id);
    const lockup = formatDateLockup(slot);
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
            el("small", {}, answer === "yes" ? "参加できる" : answer === "maybe" ? "未確定" : "参加できない")
        ]);
    });

    const children = [
        el("div", {
            className: "v2-slot-head"
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
            ])
        ]),
        el("div", {
            className: "v2-answer-grid"
        }, actions)
    ];

    if(detail.isOwner){
        children.push(slotAggregate(detail, slot));
        children.push(actionButton("この日程で確定", () => confirmSlot(detail, slot), "primary"));
    }

    return el("article", {
        className: "v2-slot-card"
    }, children);
}

function slotAggregate(detail, slot){
    const rows = detail.participants.map(participant => {
        const response = findResponseForParticipant(detail.responses, participant.id, slot.id);
        return el("div", {
            className: "v2-aggregate-row"
        }, [
            el("span", {}, ANSWER_LABELS[response?.answer ?? "unknown"]),
            el("strong", {}, participant.display_name ?? participant.displayName ?? "参加者")
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
            placeholder: "朝霧"
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

function sectionBlock(label, children){
    return el("section", {
        className: "v2-app-block"
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

function renderLoading(message){
    root.replaceChildren(sectionBlock("LOADING", [
        emptyState(message)
    ]));
}

function renderConfigMissing(message){
    root.replaceChildren(sectionBlock("DATABASE", [
        emptyState(message || "Supabase public config is not enabled."),
        el("p", {
            className: "v2-app-copy"
        }, "Static buildは壊さず表示できますが、実データの卓機能にはSupabase設定が必要です。")
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
    const metadata = user?.user_metadata ?? {};
    return String(
        metadata.global_name ||
        metadata.full_name ||
        metadata.name ||
        metadata.user_name ||
        metadata.preferred_username ||
        "RELMUA User"
    ).slice(0, 80);
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
