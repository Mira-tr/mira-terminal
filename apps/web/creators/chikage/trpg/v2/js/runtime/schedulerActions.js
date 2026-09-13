export function createSchedulerActions(context){
    const {
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
    } = context;

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
            await appState.repository.addTrpgV6Candidates({
                scheduleId: detail.scheduleId,
                roundId: detail.activeRound.id,
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

    async function createRound(detail, form){
        if(appState.busy){
            return;
        }

        const data = new FormData(form);
        const targetMinutes = combineDurationMinutes(data.get("targetHours"), data.get("targetMinutes"));

        if(targetMinutes === null){
            appState.roundFeedback = { kind: "error", text: "想定プレイ時間は30分から30時間までで入力してください。" };
            renderDetail();
            return;
        }

        setBusy(true);
        try{
            await appState.repository.createTrpgV6Round({
                scheduleId: detail.scheduleId,
                title: data.get("title"),
                purpose: data.get("purpose"),
                targetMinutes,
                open: true
            });
            appState.roundCreateOpen = false;
            appState.roundFeedback = { kind: "success", text: "次の日程調整を始めました。候補日を追加できます。" };
            await reloadActiveDetail(detail);
            await loadDashboard();
            renderDetail();
        }catch(error){
            reportSchedulerError("create-round", error);
            appState.roundFeedback = { kind: "error", text: toUserMessage(error) };
            renderDetail();
        }finally{
            setBusy(false);
        }
    }

    async function confirmRecommendation(detail, recommendation, range){
        setBusy(true);

        try{
            await appState.repository.confirmTrpgV6RecommendationPlan({
                scheduleId: detail.scheduleId,
                roundId: detail.activeRound.id,
                items: [{ slotId: recommendation.slot.id, startMinute: range.startMinute, endMinute: range.endMinute }],
                snapshotAt: appState.confirmRecommendation?.snapshotAt ?? recommendationSnapshotForConfirmation(detail)
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

    async function confirmRecommendationPlan(detail, plan){
        setBusy(true);
        try{
            await appState.repository.confirmTrpgV6RecommendationPlan({
                scheduleId: detail.scheduleId,
                roundId: detail.activeRound.id,
                items: plan.primary.map(item => ({ slotId: item.item.slot.id, startMinute: item.startMinute, endMinute: item.endMinute })),
                snapshotAt: appState.confirmRecommendation?.snapshotAt ?? recommendationSnapshotForConfirmation(detail)
            });
            await reloadActiveDetail(detail);
            await loadDashboard();
            appState.confirmRecommendation = null;
            renderDetail();
        }catch(error){
            reportSchedulerError("confirm-recommendation-plan", error);
            appState.responseFeedback = { kind: "error", text: recommendationErrorMessage(error) };
            renderDetail();
        }finally{
            setBusy(false);
        }
    }

    async function saveExistingCandidate(detail, slot){
        if(appState.busy || !appState.candidateEditDraft){
            return;
        }

        const draft = appState.candidateEditDraft;
        const candidate = buildCandidateBatch({
            month: String(draft.dateKey ?? "").slice(0, 7),
            selections: {
                [draft.dateKey]: [draft.selection]
            },
            bulk: draft.selection
        }, detail.schedule.total_minutes ?? detail.schedule.totalMinutes);

        if(!candidate.ok){
            appState.candidateFeedback = { kind: "error", text: candidate.errors[0] };
            renderDetail();
            return;
        }

        setBusy(true);
        try{
            const result = await appState.repository.updateTrpgV5Candidate({
                scheduleId: detail.scheduleId,
                slotId: slot.id,
                startsAt: candidate.candidates[0].startsAt,
                endsAt: candidate.candidates[0].endsAt,
                label: slot.label ?? ""
            });
            appState.candidateEditDraft = null;
            appState.candidateFeedback = {
                kind: "success",
                text: result.changed === false
                    ? "候補日に変更はありません。"
                    : result.dateChanged
                    ? `日付を変更したため、新しい候補を作成して旧候補を履歴へ移しました。${result.staleResponseCount ? `${result.staleResponseCount}件の回答は旧候補の履歴です。` : ""}`
                    : result.staleResponseCount
                        ? `候補を更新しました。${result.staleResponseCount}人の再回答が必要です。`
                        : "候補を更新しました。"
            };
            await reloadActiveDetail(detail);
            await loadDashboard();
            renderDetail();
        }catch(error){
            reportSchedulerError("update-candidate", error);
            appState.candidateFeedback = { kind: "error", text: candidateManagementError(error) };
            renderDetail();
        }finally{
            setBusy(false);
        }
    }

    async function saveCandidateBulkTimes(detail, selectedIds){
        if(appState.busy || !appState.candidateBulkDraft || selectedIds.length === 0){
            return;
        }

        const minutes = minutesFromTimeFields(appState.candidateBulkDraft.selection, {});
        if(!minutes || minutes.endMinute <= minutes.startMinute || minutes.endMinute > 30 * 60){
            appState.candidateFeedback = { kind: "error", text: "開始・終了時刻を確認してください。終了が開始より前なら翌日として扱われます。1候補は30時間以内です。" };
            renderDetail();
            return;
        }

        setBusy(true);
        try{
            const result = await appState.repository.updateTrpgV5CandidateTimes({
                scheduleId: detail.scheduleId,
                slotIds: selectedIds,
                startMinute: minutes.startMinute,
                endMinute: minutes.endMinute
            });
            appState.candidateBulkDraft = null;
            appState.candidateBulkSlotIds = [];
            appState.candidateFeedback = {
                kind: "success",
                text: result.changedCount
                    ? `${result.changedCount}件の候補を更新しました。${result.staleResponseCount ? `${result.staleResponseCount}件の回答は再回答が必要です。` : ""}`
                    : "候補日に変更はありません。"
            };
            await reloadActiveDetail(detail);
            await loadDashboard();
            renderDetail();
        }catch(error){
            reportSchedulerError("bulk-update-candidates", error);
            appState.candidateFeedback = { kind: "error", text: candidateManagementError(error) };
            renderDetail();
        }finally{
            setBusy(false);
        }
    }

    async function retireCandidate(detail, slot){
        setBusy(true);
        try{
            const result = await appState.repository.retireTrpgV5Candidate({
                scheduleId: detail.scheduleId,
                slotId: slot.id
            });
            appState.candidateRetireSlotId = "";
            appState.candidateFeedback = {
                kind: "success",
                text: result.responseCount ? "候補を削除しました。回答履歴は保持されています。" : "候補を削除しました。"
            };
            await reloadActiveDetail(detail);
            await loadDashboard();
            renderDetail();
        }catch(error){
            reportSchedulerError("retire-candidate", error);
            appState.candidateFeedback = { kind: "error", text: candidateManagementError(error) };
            renderDetail();
        }finally{
            setBusy(false);
        }
    }

    async function restoreCandidate(detail, slot){
        setBusy(true);
        try{
            await appState.repository.restoreTrpgV5Candidate({ scheduleId: detail.scheduleId, slotId: slot.id });
            appState.candidateFeedback = { kind: "success", text: "候補を復元しました。" };
            await reloadActiveDetail(detail);
            await loadDashboard();
            renderDetail();
        }catch(error){
            reportSchedulerError("restore-candidate", error);
            appState.candidateFeedback = { kind: "error", text: candidateManagementError(error) };
            renderDetail();
        }finally{
            setBusy(false);
        }
    }

    return {
        addCandidateBatch,
        createRound,
        confirmRecommendation,
        confirmRecommendationPlan,
        saveExistingCandidate,
        saveCandidateBulkTimes,
        retireCandidate,
        restoreCandidate
    };
}
