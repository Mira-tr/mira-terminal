export const WORKSPACE_STATUSES = Object.freeze({
    active: "稼働中",
    planned: "計画中",
    unavailable: "未使用"
});

export const WORKSPACE_TYPES = Object.freeze({
    brand: "Brand",
    creator: "活動者サイト",
    module: "Internal Module",
    publish: "Publish Center"
});

const WORKSPACES = Object.freeze([
    {
        id: "workspace-brand",
        type: "brand",
        title: "Brand",
        description: "RELMUAブランド全体を管理する領域です。",
        ownerCreatorId: "",
        adminPath: "#workspace-brand",
        status: "active",
        order: 1
    },
    {
        id: "workspace-creator-chikage",
        type: "creator",
        title: "千景",
        description: "千景の独立した活動者サイトです。",
        ownerCreatorId: "creator-chikage",
        adminPath: "../creators/",
        status: "active",
        order: 2
    },
    {
        id: "workspace-module-trpg",
        type: "module",
        title: "TRPG",
        description: "千景TRPG機能の内部Registryです。Terminal UIでは活動者サイト配下に表示します。",
        ownerCreatorId: "creator-chikage",
        adminPath: "../trpg/",
        status: "active",
        order: 3
    },
    {
        id: "workspace-publish-center",
        type: "publish",
        title: "Publish Center",
        description: "将来の公開配信管理領域です。",
        ownerCreatorId: "",
        adminPath: "",
        status: "planned",
        order: 4
    }
]);

export function getWorkspaces(){
    return [...WORKSPACES].sort((a, b) => a.order - b.order);
}

export function getWorkspaceStatusLabel(status){
    return WORKSPACE_STATUSES[status] || WORKSPACE_STATUSES.unavailable;
}

export function getWorkspaceTypeLabel(type){
    return WORKSPACE_TYPES[type] || type;
}
