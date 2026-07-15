export const WORKSPACE_STATUSES = Object.freeze({
    active: "Active",
    planned: "Planned",
    unavailable: "Unavailable"
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
        description: "Public RELMUA site structure: Home, Projects, Tools, Notes, Creators, About, Contact, and publish state.",
        ownerCreatorId: "",
        adminPath: "#workspace-brand",
        status: "active",
        order: 1
    },
    {
        id: "workspace-creators",
        type: "creator",
        title: "Creators",
        description: "Creator site workspaces. Each creator owns profile, works, contact, and personal features.",
        ownerCreatorId: "",
        adminPath: "#workspace-creators",
        status: "active",
        order: 2
    },
    {
        id: "workspace-creator-chikage",
        type: "creator",
        title: "千景",
        description: "Chikage creator site workspace, including the personal TRPG feature set.",
        ownerCreatorId: "creator-chikage",
        adminPath: "#creator-site-creator-chikage",
        status: "active",
        order: 3
    },
    {
        id: "workspace-creator-asagiri",
        type: "creator",
        title: "朝霧",
        description: "Asagiri creator site workspace. TRPG is not assigned to this creator.",
        ownerCreatorId: "creator-asagiri",
        adminPath: "#creator-site-creator-asagiri",
        status: "active",
        order: 4
    },
    {
        id: "workspace-system",
        type: "system",
        title: "System",
        description: "Backup, Import, Export, Settings, Publish, Activity Log, validation, and build visibility.",
        ownerCreatorId: "",
        adminPath: "#workspace-system",
        status: "active",
        order: 5
    },
    {
        id: "workspace-terminal",
        type: "terminal",
        title: "Terminal",
        description: "Production OS entry point connecting Brand, Creators, and System workspaces.",
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
