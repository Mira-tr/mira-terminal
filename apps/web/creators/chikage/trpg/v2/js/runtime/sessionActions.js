import { withTimeout } from "./support.js?v=20260913-hang-guard";

export function createSessionActions(context){
    const {
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
        reloadActiveDetail,
        detailLoadTimeoutMs
    } = context;

    async function openDetail(item, options = {}){
        renderLoading("卓を開いています。");

        try{
            if(item.isOwner){
                const bundle = await withTimeout(
                    () => appState.repository.loadSchedule(item.schedule.id),
                    detailLoadTimeoutMs,
                    "Scheduler detail request timed out."
                );
                appState.activeDetail = createScheduleBundleViewModel({
                    ...bundle,
                    confirmedSlots: bundle.confirmedSlots
                }, appState.user?.id ?? "");
            }else{
                const [view, preparation] = await withTimeout(
                    () => Promise.all([
                        appState.repository.loadAccountView(item.shareId),
                        appState.repository.loadTrpgV12Preparation(item.schedule.id)
                    ]),
                    detailLoadTimeoutMs,
                    "Scheduler detail request timed out."
                );
                appState.activeDetail = createScheduleBundleViewModel({ ...view, preparation }, appState.user?.id ?? "");
            }

            if(options.answerMode === true){
                appState.voteMode = true;
            }
            renderDetail();
        }catch(error){
            reportSchedulerError?.("open-detail", error);
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
            appState.voteMode = true;
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
            appState.voteMode = true;
            renderDetail();
        }catch(error){
            renderError(toUserMessage(error));
        }finally{
            setBusy(false);
        }
    }

    async function updateSessionDisplayName(detail, form){
        if(appState.busy){
            return;
        }

        const displayName = String(new FormData(form).get("displayName") ?? "").trim();

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

    async function answerSlot(detail, slot, answer, ranges = [], note = ""){
        if(appState.busy){
            return;
        }

        setBusy(true);
        emitResponseEvent("saving", {
            slotId: slot.id,
            answer
        });

        try{
            const view = await persistResponse(detail, slot, answer, ranges, note);

            delete appState.partialResponseDrafts[slot.id];
            appState.responseFeedback = null;
            appState.activeDetail = createScheduleBundleViewModel(view, appState.user?.id ?? "");
            if(appState.user){
                await loadDashboard();
            }
            emitResponseEvent("saved", {
                slotId: slot.id,
                answer
            });
            renderDetail();
        }catch(error){
            reportSchedulerError("answer-slot", error);
            appState.responseFeedback = {
                kind: "error",
                text: `回答を保存できませんでした。${toUserMessage(error)}`
            };
            emitResponseEvent("error", {
                slotId: slot.id,
                answer,
                message: toUserMessage(error)
            });
            renderDetail();
        }finally{
            setBusy(false);
        }
    }

    async function answerSlots(detail, answer){
        if(appState.busy || !detail){
            return;
        }

        const slots = (detail.slots ?? []).filter(slot => String(slot.status ?? "active") !== "retired");
        if(!slots.length){
            return;
        }

        setBusy(true);
        emitResponseEvent("saving", {
            bulk: true,
            answer,
            count: slots.length
        });

        try{
            let latestView = null;
            for(const slot of slots){
                const current = ownResponseFor(detail, slot.id);
                const ranges = answer === "maybe" && current?.answer === "maybe" && Array.isArray(current.ranges)
                    ? current.ranges
                    : [];
                const note = String(current?.note ?? "");
                latestView = await persistResponse(detail, slot, answer, ranges, note);
                delete appState.partialResponseDrafts[slot.id];
            }

            if(latestView){
                appState.activeDetail = createScheduleBundleViewModel(latestView, appState.user?.id ?? "");
            }
            appState.responseFeedback = null;
            if(appState.user){
                await loadDashboard();
            }
            emitResponseEvent("saved", {
                bulk: true,
                answer,
                count: slots.length
            });
            renderDetail();
        }catch(error){
            reportSchedulerError("answer-slots", error);
            appState.responseFeedback = {
                kind: "error",
                text: `一括回答を最後まで保存できませんでした。保存済みの候補を確認してください。${toUserMessage(error)}`
            };
            emitResponseEvent("error", {
                bulk: true,
                answer,
                message: toUserMessage(error)
            });
            renderDetail();
        }finally{
            setBusy(false);
        }
    }

    async function persistResponse(detail, slot, answer, ranges = [], note = ""){
        if(appState.activeGuest){
            return appState.repository.upsertResponse({
                shareId: appState.activeGuest.shareId,
                participantId: appState.activeGuest.participantId,
                guestToken: appState.activeGuest.guestToken,
                slotId: slot.id,
                answer,
                note,
                ranges
            });
        }

        return appState.repository.upsertAccountResponse({
            shareId: detail.shareId,
            slotId: slot.id,
            answer,
            note,
            ranges
        });
    }

    function ownResponseFor(detail, slotId){
        return (detail.responses ?? []).find(response => {
            const participantId = response.participant_id ?? response.participantId;
            const responseSlotId = response.slot_id ?? response.slotId;
            return String(participantId) === String(detail.ownParticipantId)
                && String(responseSlotId) === String(slotId)
                && !response.stale;
        }) ?? null;
    }

    async function answerFromEvent(event){
        const detail = appState.activeDetail;
        if(!detail || appState.busy){
            return;
        }

        const requestedIndex = Number(event?.detail?.slotIndex);
        const requestedId = String(event?.detail?.slotId ?? "");
        const activeSlots = (detail.slots ?? []).filter(slot => String(slot.status ?? "active") !== "retired");
        const slot = requestedId
            ? activeSlots.find(item => String(item.id) === requestedId)
            : activeSlots[requestedIndex];
        const answer = String(event?.detail?.answer ?? "");

        if(!slot || !["yes", "maybe", "no"].includes(answer)){
            return;
        }

        const current = ownResponseFor(detail, slot.id);
        const ranges = answer === "maybe" && current?.answer === "maybe" && Array.isArray(current.ranges)
            ? current.ranges
            : [];
        await answerSlot(detail, slot, answer, ranges, String(current?.note ?? ""));
    }

    async function bulkAnswerFromEvent(event){
        const answer = String(event?.detail?.answer ?? "");
        if(!["yes", "maybe", "no"].includes(answer)){
            return;
        }
        await answerSlots(appState.activeDetail, answer);
    }

    function installAnswerEventBridge(){
        if(typeof globalThis.addEventListener !== "function"){
            return;
        }
        globalThis.addEventListener("relmua:scheduler-answer", answerFromEvent);
        globalThis.addEventListener("relmua:scheduler-bulk-answer", bulkAnswerFromEvent);
    }

    function emitResponseEvent(state, detail = {}){
        if(typeof globalThis.dispatchEvent !== "function" || typeof globalThis.CustomEvent !== "function"){
            return;
        }
        globalThis.dispatchEvent(new CustomEvent("relmua:scheduler-response-state", {
            detail: {
                state,
                ...detail
            }
        }));
    }

    installAnswerEventBridge();

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

    async function updateAccountDisplayName(form){
        const displayName = String(new FormData(form).get("displayName") ?? "").trim();
        if(!displayName || appState.busy){
            return;
        }
        setBusy(true);
        try{
            const saved = await appState.repository.updateTrpgV4AccountDisplayName(displayName);
            appState.accountDisplayName = String(saved?.displayName ?? displayName);
            appState.dashboardFeedback = { kind: "success", text: "アカウント表示名を更新しました。" };
            await loadDashboard();
            renderDashboard();
        }catch(error){
            appState.dashboardFeedback = { kind: "error", text: toUserMessage(error) };
            renderDashboard();
        }finally{
            setBusy(false);
        }
    }

    async function updateSessionStatus(detail, sessionItem, form){
        if(appState.busy){
            return;
        }

        const data = new FormData(form);
        setBusy(true);
        try{
            await appState.repository.updateTrpgV6SessionStatus({
                scheduleId: detail.scheduleId,
                sessionId: sessionItem.id,
                status: data.get("status"),
                memo: data.get("memo")
            });
            await reloadActiveDetail(detail);
            await loadDashboard();
            renderDetail();
        }catch(error){
            reportSchedulerError("update-session-status", error);
            appState.responseFeedback = { kind: "error", text: toUserMessage(error) };
            renderDetail();
        }finally{
            setBusy(false);
        }
    }

    return {
        openDetail,
        loginWithDiscord,
        logout,
        createSession,
        joinAccount,
        joinGuest,
        updateSessionDisplayName,
        answerSlot,
        answerSlots,
        transferKp,
        updateAccountDisplayName,
        updateSessionStatus
    };
}
