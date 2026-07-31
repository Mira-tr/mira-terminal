import {
    getCreatorPublicationIssue
} from "./creatorPublication.js";

export function createCreatorWorkspaces(collection, registeredSites){
    const sitesByCreatorId = new Map(
        (Array.isArray(registeredSites) ? registeredSites : [])
            .map(site => [site.creatorId, site])
    );
    const creators = Array.isArray(collection?.creators)
        ? collection.creators
        : [];

    return creators
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(creator => {
            const registered = sitesByCreatorId.get(creator.id);
            if(registered){
                return {
                    ...registered,
                    slug: creator.slug,
                    title: creator.displayName
                };
            }

            const editPath = `./?creator=${encodeURIComponent(creator.id)}#formTitle`;
            const publicationIssue = getCreatorPublicationIssue(creator, registeredSites);
            return {
                creatorId: creator.id,
                slug: creator.slug,
                title: creator.displayName,
                description: `${creator.displayName}の活動者情報を管理します。個人サイトの管理先はまだ登録されていません。`,
                adminPath: editPath,
                desktopPath: `../admin/creators/?creator=${encodeURIComponent(creator.id)}#formTitle`,
                publicPath: "",
                status: "planned",
                order: creator.order,
                features: [],
                sections: [
                    {
                        id: `${creator.id}-profile`,
                        title: "活動者情報",
                        description: `${creator.displayName}の表示名、紹介、公開リンクを編集します。`,
                        adminPath: editPath,
                        status: "active",
                        order: 1
                    },
                    {
                        id: `${creator.id}-site`,
                        title: publicationIssue
                            ? "公開不可（個人サイト未登録）"
                            : "個人サイト",
                        description: "静的な個人サイトの管理先はまだ登録されていません。",
                        adminPath: "",
                        status: publicationIssue ? "unavailable" : "planned",
                        order: 2
                    }
                ]
            };
        });
}
