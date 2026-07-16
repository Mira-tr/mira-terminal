export function createScenarioPreviewAdapter({
    repository,
    previewPath
}){
    return {
        kind: "PreviewAdapter",
        previewDraft(data = null){
            const latest = data || repository.listDrafts()[0] || null;

            return {
                ok: Boolean(latest),
                type: "draft-preview",
                title: latest?.title || "",
                scenarioId: latest?.id || "",
                previewUrl: latest?.id
                    ? `${previewPath}?previewScenario=${encodeURIComponent(latest.id)}`
                    : previewPath,
                source: "Draft saved in Browser Admin localStorage. Public JSON is not updated until Public Export."
            };
        }
    };
}
