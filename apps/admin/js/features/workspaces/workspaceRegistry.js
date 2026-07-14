export const WORKSPACE_STATUSES = Object.freeze({
    active: "稼働中",
    planned: "計画中",
    unavailable: "未使用"
});

export const WORKSPACE_TYPES = Object.freeze({
    brand: "Brand",
    creator: "Creators",
    system: "System",
    terminal: "Terminal"
});

const WORKSPACES = Object.freeze([
    {
        id: "workspace-brand",
        type: "brand",
        title: "Brand",
        description: "RELMUAブランド全体の公開構成とコンテンツ入口です。",
        ownerCreatorId: "",
        adminPath: "#workspace-brand",
        status: "active",
        order: 1
    },
    {
        id: "workspace-creators",
        type: "creator",
        title: "Creators",
        description: "RELMUAに参加するCreatorごとのWorkspace入口です。",
        ownerCreatorId: "",
        adminPath: "#creator-workspaces",
        status: "active",
        order: 2
    },
    {
        id: "workspace-creator-chikage",
        type: "creator",
        title: "千景",
        description: "千景サイトと、千景が持つPersonal Moduleを管理します。",
        ownerCreatorId: "creator-chikage",
        adminPath: "../creators/",
        status: "active",
        order: 3
    },
    {
        id: "workspace-creator-asagiri",
        type: "creator",
        title: "朝霧",
        description: "朝霧サイトの公開情報と準備中のCreator領域を管理します。",
        ownerCreatorId: "creator-asagiri",
        adminPath: "../creators/",
        status: "active",
        order: 4
    },
    {
        id: "workspace-system",
        type: "system",
        title: "System",
        description: "Backup、Import、Export、Settings、Publish、Activity Logを扱う運用基盤です。",
        ownerCreatorId: "",
        adminPath: "#workspace-system",
        status: "active",
        order: 5
    },
    {
        id: "workspace-terminal",
        type: "terminal",
        title: "Terminal",
        description: "Brand、Creators、Systemを接続する管理アプリの入口です。",
        ownerCreatorId: "",
        adminPath: "./",
        status: "active",
        order: 6
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
