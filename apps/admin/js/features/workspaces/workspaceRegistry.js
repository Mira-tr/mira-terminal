export const WORKSPACE_STATUSES = Object.freeze({
    active: "Active",
    planned: "Planned",
    unavailable: "Unavailable"
});

export const WORKSPACE_TYPES = Object.freeze({
    relmua: "RELMUA",
    creatorCollection: "Creators",
    creator: "Creator",
    system: "System"
});

const ROOT_WORKSPACES = Object.freeze([
    {
        id: "workspace-relmua",
        type: "relmua",
        title: "RELMUA",
        description: "Public site structure and brand-owned content: Home, Projects, Tools, Notes, About, Contact, Creators and navigation.",
        ownerCreatorId: "",
        parentId: "",
        adminPath: "#workspace-relmua",
        status: "active",
        order: 1
    },
    {
        id: "workspace-creators",
        type: "creatorCollection",
        title: "Creators",
        description: "Creator sites live below this workspace. Personal features belong to each creator, not to RELMUA itself.",
        ownerCreatorId: "",
        parentId: "",
        adminPath: "#workspace-creators",
        status: "active",
        order: 2
    },
    {
        id: "workspace-system",
        type: "system",
        title: "System",
        description: "Database, validation, snapshots, backup, import, publish, activity log and runtime operations.",
        ownerCreatorId: "",
        parentId: "",
        adminPath: "#workspace-system",
        status: "active",
        order: 3
    }
]);

const CREATOR_WORKSPACES = Object.freeze([
    {
        id: "workspace-creator-chikage",
        type: "creator",
        title: "千景",
        description: "千景のProfile / Works / Contactと、専用機能であるTRPGを管理します。",
        ownerCreatorId: "creator-chikage",
        parentId: "workspace-creators",
        adminPath: "#creator-site-creator-chikage",
        status: "active",
        order: 1
    }
]);

export function getWorkspaces(){
    return cloneAndSort(ROOT_WORKSPACES);
}

export function getCreatorWorkspaces(){
    return cloneAndSort(CREATOR_WORKSPACES);
}

export function getAllWorkspaces(){
    return [
        ...getWorkspaces(),
        ...getCreatorWorkspaces()
    ];
}

export function getWorkspaceChildren(workspaceId){
    return getCreatorWorkspaces().filter(workspace => workspace.parentId === workspaceId);
}

export function getWorkspaceStatusLabel(status){
    return WORKSPACE_STATUSES[status] || WORKSPACE_STATUSES.unavailable;
}

export function getWorkspaceTypeLabel(type){
    return WORKSPACE_TYPES[type] || type;
}

function cloneAndSort(workspaces){
    return workspaces
        .map(workspace => ({ ...workspace }))
        .sort((a, b) => a.order - b.order);
}
