export const STUDIO_COPY_AREAS = Object.freeze([
    Object.freeze({
        id: "brand-home",
        owner: "Brand",
        pageTitle: "ホーム",
        publicPath: "../web/",
        editPath: "../admin/home/",
        status: "active",
        summary: "Hero、注目作品、最近更新、次に見る場所を編集します。",
        visibleAreas: Object.freeze([
            "最初に見える言葉",
            "各セクションの見出し",
            "Home Configurationで管理する表示順"
        ])
    }),
    Object.freeze({
        id: "brand-projects",
        owner: "Brand",
        pageTitle: "作品",
        publicPath: "../web/projects/",
        editPath: "../admin/game/",
        status: "active",
        summary: "公開する作品のタイトル、概要、状態、タグを編集します。",
        visibleAreas: Object.freeze([
            "代表作品",
            "作品一覧",
            "作品がない時の余白"
        ])
    }),
    Object.freeze({
        id: "brand-tools",
        owner: "Brand",
        pageTitle: "道具",
        publicPath: "../web/tools/",
        editPath: "../admin/tools/",
        status: "active",
        summary: "ブランド共通で公開する道具だけを編集します。",
        visibleAreas: Object.freeze([
            "公開中の道具",
            "Launch導線",
            "道具がない時の説明"
        ])
    }),
    Object.freeze({
        id: "brand-notes",
        owner: "Brand",
        pageTitle: "記録",
        publicPath: "../web/notes/",
        editPath: "../admin/notes/",
        status: "active",
        summary: "制作記録のタイトル、概要、カテゴリを編集します。",
        visibleAreas: Object.freeze([
            "記録一覧",
            "読み始めるための概要",
            "HomeのLatest Note"
        ])
    }),
    Object.freeze({
        id: "brand-creators",
        owner: "Brand",
        pageTitle: "活動者",
        publicPath: "../web/creators/",
        editPath: "../admin/creators/",
        status: "active",
        summary: "千景、朝霧、今後追加するCreatorの公開情報を編集します。",
        visibleAreas: Object.freeze([
            "Creator名",
            "短い紹介",
            "Creatorサイトへの入口"
        ])
    }),
    Object.freeze({
        id: "brand-about",
        owner: "Brand",
        pageTitle: "ブランド",
        publicPath: "../web/about/",
        editPath: "../admin/home/",
        status: "planned",
        summary: "ブランドストーリー本文をStudioから編集できるようにします。",
        visibleAreas: Object.freeze([
            "RELMUAとは",
            "制作思想",
            "Public Areas"
        ])
    }),
    Object.freeze({
        id: "brand-contact",
        owner: "Brand",
        pageTitle: "連絡",
        publicPath: "../web/contact/",
        editPath: "../admin/home/",
        status: "planned",
        summary: "窓口案内とFAQをStudioから編集できるようにします。",
        visibleAreas: Object.freeze([
            "連絡先の選び方",
            "受付状況",
            "FAQ"
        ])
    }),
    Object.freeze({
        id: "creator-chikage-home",
        owner: "千景",
        pageTitle: "千景",
        publicPath: "../web/creators/chikage/",
        editPath: "../admin/creators/",
        status: "active",
        summary: "千景のプロフィール、活動領域、Creatorサイトの入口を編集します。",
        visibleAreas: Object.freeze([
            "千景のHero",
            "制作 / Web / Game / TRPG",
            "Profile、Works、Contact、TRPGへの導線"
        ])
    }),
    Object.freeze({
        id: "creator-chikage-trpg",
        owner: "千景",
        pageTitle: "千景 / TRPG",
        publicPath: "../web/creators/chikage/trpg/",
        editPath: "../admin/trpg/",
        status: "active",
        summary: "TRPGシナリオの内容を、既存Editorのまま編集します。",
        visibleAreas: Object.freeze([
            "Scenario Library",
            "検索、絞り込み、詳細",
            "Public Export後の公開一覧"
        ])
    }),
    Object.freeze({
        id: "creator-chikage-rules",
        owner: "千景",
        pageTitle: "千景 / House Rules",
        publicPath: "../web/creators/chikage/trpg/rules/",
        editPath: "../admin/trpg/rules/",
        status: "active",
        summary: "House Rules本文と目次を編集します。",
        visibleAreas: Object.freeze([
            "目次",
            "ルール本文",
            "注意書き"
        ])
    })
]);

export function getStudioCopyAreas(){
    return STUDIO_COPY_AREAS.map(area => ({
        ...area,
        visibleAreas: [...area.visibleAreas]
    }));
}
