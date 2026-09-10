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
        reloadActiveDetail
    } = context;

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
                const preparation = await appState.repository.loadTrpgV12Preparation(item.schedule.id);
                appState.activeDetail = createScheduleBundleViewModel({ ...view, preparation }, appState.user?.id ?? "");
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
                    note,
                    ranges
                });
            }else{
                view = await appState.repository.upsertAccountResponse({
                    shareId: detail.shareId,
                    slotId: slot.id,
                    answer,
                    note,
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
        transferKp,
        updateAccountDisplayName,
        updateSessionStatus
    };
}
