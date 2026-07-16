export function createScenarioDraftRepository({
    listDrafts,
    createDraft,
    updateDraft,
    validateDraft
}){
    const repository = {
        kind: "ScenarioDraftRepository",
        listDrafts(){
            return listDrafts();
        },
        loadDraft(id){
            return listDrafts().find(draft => draft.id === id) || null;
        },
        validateDraft(data){
            return validateDraft(data);
        },
        saveDraft(data, {
            editingId = ""
        } = {}){
            const saved = editingId
                ? updateDraft(data)
                : createDraft(data);

            return {
                ok: Boolean(saved),
                draft: saved ? data : null
            };
        }
    };

    assertScenarioDraftRepository(repository);
    return repository;
}

export function assertScenarioDraftRepository(repository){
    [
        "listDrafts",
        "loadDraft",
        "validateDraft",
        "saveDraft"
    ].forEach(method => {
        if(!repository || typeof repository[method] !== "function"){
            throw new TypeError(`ScenarioDraftRepository requires ${method}()`);
        }
    });
}
