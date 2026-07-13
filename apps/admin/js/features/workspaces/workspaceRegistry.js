export const WORKSPACE_STATUSES = Object.freeze({
    active: "Active",
    planned: "Planned",
    unavailable: "Unavailable"
});

export const WORKSPACE_TYPES = Object.freeze({
    brand: "Brand",
    creator: "Creator Site",
    module: "Internal Module",
    publish: "Publish Center"
});

const WORKSPACES = Object.freeze([
    {
        id: "workspace-brand",
        type: "brand",
        title: "Brand",
        description: "RELMUA brand-wide management area.",
        ownerCreatorId: "",
        adminPath: "#workspace-brand",
        status: "active",
        order: 1
    },
    {
        id: "workspace-creator-chikage",
        type: "creator",
        title: "千景",
        description: "Independent creator site for 千景.",
        ownerCreatorId: "creator-chikage",
        adminPath: "../creators/",
        status: "active",
        order: 2
    },
    {
        id: "workspace-module-trpg",
        type: "module",
        title: "TRPG",
        description: "Internal registry entry for 千景 TRPG features. Terminal UI renders this under the creator site.",
        ownerCreatorId: "creator-chikage",
        adminPath: "../trpg/",
        status: "active",
        order: 3
    },
    {
        id: "workspace-publish-center",
        type: "publish",
        title: "Publish Center",
        description: "Future publishing and delivery management area.",
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
