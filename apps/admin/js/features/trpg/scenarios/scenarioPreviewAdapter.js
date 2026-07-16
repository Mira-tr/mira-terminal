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
                source: "下書きはブラウザの保存領域に保存されています。公開サイトへ反映するには、公開用データを作ってください。"
            };
        }
    };
}
