export function createPreparationActions(context){
    const {
        appState,
        setBusy,
        reloadActiveDetail,
        loadDashboard,
        renderDetail,
        reportSchedulerError,
        preparationErrorMessage,
        movePreparationItem,
        sortPreparationItems
    } = context;

    async function savePreparationItem(detail, form, item = null){
        if(appState.busy){
            return;
        }

        const data = new FormData(form);
        const payload = {
            scheduleId: detail.scheduleId,
            title: data.get("title"),
            category: data.get("category"),
            assigneeParticipantId: data.get("assigneeParticipantId") || null,
            roundId: data.get("roundId") || null,
            sessionId: data.get("sessionId") || null,
            note: data.get("note")
        };

        setBusy(true);
        try{
            if(item){
                await appState.repository.updateTrpgV12PreparationItem({ ...payload, itemId: item.id });
                appState.preparationFeedback = { kind: "success", text: "準備項目を更新しました。" };
                appState.preparationEditItemId = "";
            }else{
                await appState.repository.createTrpgV12PreparationItem(payload);
                appState.preparationFeedback = { kind: "success", text: "準備項目を追加しました。" };
                appState.preparationAddOpen = false;
            }
            await reloadActiveDetail(detail);
            await loadDashboard();
            renderDetail();
        }catch(error){
            reportSchedulerError("save-preparation-item", error);
            appState.preparationFeedback = { kind: "error", text: preparationErrorMessage(error) };
            renderDetail();
        }finally{
            setBusy(false);
        }
    }

    async function setPreparationStatus(detail, item, done){
        if(appState.busy){
            return;
        }

        setBusy(true);
        try{
            await appState.repository.setTrpgV12PreparationStatus({
                scheduleId: detail.scheduleId,
                itemId: item.id,
                done
            });
            appState.preparationFeedback = { kind: "success", text: done ? "準備を完了にしました。" : "準備を未完了に戻しました。" };
            await reloadActiveDetail(detail);
            await loadDashboard();
            renderDetail();
        }catch(error){
            reportSchedulerError("set-preparation-status", error);
            appState.preparationFeedback = { kind: "error", text: preparationErrorMessage(error) };
            renderDetail();
        }finally{
            setBusy(false);
        }
    }

    async function archivePreparationItem(detail, item){
        if(appState.busy){
            return;
        }

        setBusy(true);
        try{
            await appState.repository.archiveTrpgV12PreparationItem({ scheduleId: detail.scheduleId, itemId: item.id });
            appState.preparationFeedback = { kind: "success", text: "準備項目を一覧から取り除きました。" };
            appState.preparationEditItemId = "";
            await reloadActiveDetail(detail);
            await loadDashboard();
            renderDetail();
        }catch(error){
            reportSchedulerError("archive-preparation-item", error);
            appState.preparationFeedback = { kind: "error", text: preparationErrorMessage(error) };
            renderDetail();
        }finally{
            setBusy(false);
        }
    }

    async function reorderPreparation(detail, itemId, direction){
        if(appState.busy){
            return;
        }

        const ordered = movePreparationItem(detail.preparationItems, itemId, direction);
        if(ordered.map(item => item.id).join(":") === sortPreparationItems(detail.preparationItems).map(item => item.id).join(":")){
            return;
        }

        setBusy(true);
        try{
            await appState.repository.reorderTrpgV12PreparationItems({
                scheduleId: detail.scheduleId,
                itemIds: ordered.map(item => item.id)
            });
            await reloadActiveDetail(detail);
            await loadDashboard();
            renderDetail();
        }catch(error){
            reportSchedulerError("reorder-preparation-items", error);
            appState.preparationFeedback = { kind: "error", text: preparationErrorMessage(error) };
            renderDetail();
        }finally{
            setBusy(false);
        }
    }

    return {
        savePreparationItem,
        setPreparationStatus,
        archivePreparationItem,
        reorderPreparation
    };
}
