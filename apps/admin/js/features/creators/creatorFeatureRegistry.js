export const CREATOR_FEATURE_GROUPS = Object.freeze({
    overview:Object.freeze({id:"overview",label:"OVERVIEW",order:0}),
    web:Object.freeze({id:"web",label:"WEB",order:10}),
    trpg:Object.freeze({id:"trpg",label:"TRPG",order:20}),
    manage:Object.freeze({id:"manage",label:"MANAGE",order:30})
});

const CREATOR_WORKSPACES = Object.freeze([
    Object.freeze({
        creatorId:"creator-chikage",
        slug:"chikage",
        displayName:"千景",
        theme:"chikage",
        order:1,
        adminPath:"./creators/chikage/",
        publicPath:"../web/creators/chikage/",
        features:Object.freeze([
            feature("overview","Overview","overview","./creators/chikage/#workspace-overview",null,0),
            feature("web-home","Home","web","./creators/chikage/#site-home","../web/creators/chikage/",10),
            feature("web-works","Works","web","./creators/chikage/#site-works","../web/creators/chikage/works/",20),
            feature("web-profile","Profile","web","./creators/chikage/#site-profile","../web/creators/chikage/profile/",30),
            feature("web-contact","Contact","web","./creators/chikage/#site-contact","../web/creators/chikage/contact/",40),
            feature("trpg-overview","Overview","trpg","./creators/chikage/#site-trpg","../web/creators/chikage/trpg/",10),
            feature("trpg-scenarios","Scenarios","trpg","./trpg/","../web/creators/chikage/trpg/scenarios/",20,{editable:true}),
            feature("trpg-rules","House Rules","trpg","./trpg/rules/","../web/creators/chikage/trpg/rules/",30,{editable:true}),
            feature("trpg-scheduler","Scheduler","trpg","./creators/chikage/#trpg-scheduler","../web/creators/chikage/trpg/scheduler/",40,{operational:true}),
            feature("trpg-calendar","Calendar","trpg","./creators/chikage/#trpg-calendar","../web/creators/chikage/trpg/calendar/",50,{operational:true}),
            feature("navigation","Navigation","manage","./creators/chikage/#site-navigation",null,10),
            feature("design","Design","manage","./creators/chikage/#site-design",null,20),
            feature("integrations","Integrations","manage","./creators/chikage/#site-integrations",null,30),
            feature("publish","Publish","manage","./creators/chikage/#site-publish",null,40)
        ])
    })
]);

export function getCreatorWorkspaces(){
    return CREATOR_WORKSPACES
        .map(workspace=>({
            ...workspace,
            features:[...workspace.features].sort(sortFeatures)
        }))
        .sort((a,b)=>a.order-b.order);
}

export function getCreatorWorkspace(creatorIdOrSlug){
    const key=String(creatorIdOrSlug||"").trim().toLowerCase();
    if(!key){return null;}
    const workspace=CREATOR_WORKSPACES.find(item=>item.creatorId.toLowerCase()===key||item.slug.toLowerCase()===key);
    return workspace?{...workspace,features:[...workspace.features].sort(sortFeatures)}:null;
}

export function getCreatorFeature(creatorIdOrSlug,featureId){
    const workspace=getCreatorWorkspace(creatorIdOrSlug);
    if(!workspace){return null;}
    return workspace.features.find(item=>item.id===featureId)||null;
}

export function getCreatorFeatureGroups(creatorIdOrSlug){
    const workspace=getCreatorWorkspace(creatorIdOrSlug);
    if(!workspace){return [];}
    return Object.values(CREATOR_FEATURE_GROUPS)
        .sort((a,b)=>a.order-b.order)
        .map(group=>({
            ...group,
            features:workspace.features.filter(item=>item.group===group.id).sort((a,b)=>a.order-b.order)
        }))
        .filter(group=>group.features.length>0);
}

export function resolveCreatorAdminHref(creatorIdOrSlug,featureId,locationLike=globalThis.location){
    const featureEntry=getCreatorFeature(creatorIdOrSlug,featureId);
    return resolveAdminRelativePath(featureEntry?.adminPath,locationLike);
}

export function resolveCreatorPublicHref(creatorIdOrSlug,featureId,locationLike=globalThis.location){
    const featureEntry=getCreatorFeature(creatorIdOrSlug,featureId);
    return resolveAdminRelativePath(featureEntry?.publicPath,locationLike);
}

export function resolveAdminRelativePath(path,locationLike=globalThis.location){
    if(!path){return "";}
    const currentUrl=toUrl(locationLike);
    if(!currentUrl){return path;}
    const marker="/admin/";
    const markerIndex=currentUrl.pathname.indexOf(marker);
    if(markerIndex<0){return new URL(path,currentUrl).href;}
    const adminRootPath=currentUrl.pathname.slice(0,markerIndex+marker.length);
    return new URL(path,`${currentUrl.origin}${adminRootPath}`).href;
}

function feature(id,label,group,adminPath,publicPath,order,capabilities={}){
    return Object.freeze({
        id,
        label,
        group,
        adminPath,
        publicPath,
        order,
        capabilities:Object.freeze({
            editable:Boolean(capabilities.editable),
            operational:Boolean(capabilities.operational)
        })
    });
}

function sortFeatures(a,b){
    const groupA=CREATOR_FEATURE_GROUPS[a.group]?.order??999;
    const groupB=CREATOR_FEATURE_GROUPS[b.group]?.order??999;
    return groupA-groupB||a.order-b.order;
}

function toUrl(locationLike){
    try{
        if(locationLike instanceof URL){return locationLike;}
        if(typeof locationLike==="string"){return new URL(locationLike);}
        if(locationLike?.href){return new URL(locationLike.href);}
    }catch{}
    return null;
}
