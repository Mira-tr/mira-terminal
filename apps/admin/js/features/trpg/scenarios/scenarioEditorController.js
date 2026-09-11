import {
    recordActivity
} from "../../system/activityLog.js";

import {
    createScenarioDraftError
} from "./scenarioDraftValidation.js";

export function createScenarioEditorController({
    context,
    repository,
    previewAdapter,
    exportAdapter
}){
    return {
        kind: "ScenarioEditorController",
        context,
        hydrate(){
            return typeof repository.hydrate === "function"
                ? repository.hydrate()
                : Promise.resolve(repository.listDrafts());
        },
        loadDrafts(){
            return repository.listDrafts();
        },
        validateDraft(data){
            return repository.validateDraft(data);
        },
        saveDraft(data, {
            editingId = "",
            storage = localStorage
        } = {}){
            const validation = repository.validateDraft(data);

            if(!validation.ok){
                return {
                    ok: false,
                    saved: false,
                    errors: validation.errors,
                    nextAction: "入力内容を直してから、もう一度保存してください。"
                };
            }

            const result = repository.saveDraft(data, {
                editingId
            });

            if(isPromiseLike(result)){
                return Promise.resolve(result).then(saved => finalizeSave(saved, data, storage));
            }

            return finalizeSave(result, data, storage);
        },
        previewDraft(data = null){
            return previewAdapter.previewDraft(data);
        },
        exportPublicData(options = {}){
            return exportAdapter.exportPublicData(options);
        }
    };

    function finalizeSave(result, data, storage){
        if(!result.ok){
            return {
                ok: false,
                saved: false,
                errors: [
                    createScenarioDraftError(
                        "local-storage-failed",
                        "保存できませんでした。",
                        "管理データの保存に失敗しました。DB接続とブラウザの保存領域を確認してください。",
                        "入力内容は画面に残っている場合があります。ページを閉じる前に内容を控えてください。"
                    )
                ],
                nextAction: "保存できなかった原因を確認してください。"
            };
        }

        recordActivity({
            action: "save-draft",
            workspace: "creators",
            module: "trpg",
            creatorId: data.ownerCreatorId || context.ownerCreatorId,
            targetId: data.id,
            summary: `TRPGシナリオ「${data.title}」を保存しました。`,
            result: "success",
            severity: "info"
        }, storage);

        return {
            ok: true,
            saved: true,
            draft: result.draft,
            errors: [],
            nextAction: "次は表示を確認してください。",
            preview: previewAdapter.previewDraft(result.draft),
            status: {
                saved: true,
                publicSynced: false,
                previewAvailable: true,
                publicExportRequired: true
            }
        };
    }
}

function isPromiseLike(value){
    return Boolean(value && typeof value.then === "function");
}
