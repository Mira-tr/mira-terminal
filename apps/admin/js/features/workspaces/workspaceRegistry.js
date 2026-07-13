export const WORKSPACE_STATUSES = Object.freeze({
    active: "Active",
    planned: "Planned",
    unavailable: "Unavailable"
});

export const WORKSPACE_TYPES = Object.freeze({
    brand: "Brand Workspace",
    creator: "Creator Workspace",
    module: "Module Workspace",
    publish: "Publish Center"
});

const WORKSPACES = Object.freeze([
    {
        id: "workspace-brand",
        type: "brand",
        title: "Brand Workspace",
        description: "RELMUAのブランド情報、公開方針、サイト全体の管理領域です。",
        ownerCreatorId: "",
        adminPath: "",
        status: "planned",
        order: 1
    },
    {
        id: "workspace-creator-chikage",
        type: "creator",
        title: "Creator Workspace / 千景",
        description: "活動者プロフィールと公開リンクを管理するWorkspaceです。",
        ownerCreatorId: "creator-chikage",
        adminPath: "../creators/",
        status: "active",
        order: 2
    },
    {
        id: "workspace-module-trpg",
        type: "module",
        title: "Module Workspace / TRPG",
        description: "千景のTRPG活動を扱うWorkspaceです。既存のScenario LibraryとHouse Rulesへ接続します。",
        ownerCreatorId: "creator-chikage",
        adminPath: "../trpg/",
        status: "active",
        order: 3
    },
    {
        id: "workspace-publish-center",
        type: "publish",
        title: "Publish Center",
        description: "Public Export、公開前確認、配信管理をまとめる将来のWorkspaceです。",
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
