import { getCreatorWorkspace } from "./creatorFeatureRegistry.js";

export const CREATOR_SITE_STATUSES = Object.freeze({active:"編集可能",planned:"準備中",unavailable:"利用不可"});

const chikageWorkspace=getCreatorWorkspace("creator-chikage");

const CREATOR_SITES = Object.freeze([{
    creatorId:"creator-chikage",
    slug:"chikage",
    title:"千景",
    description:"RELMUA Creatorsの1人として、千景のWeb・TRPG・運用機能をCreator Workspaceから管理します。",
    publicPath:"../../web/creators/chikage/",
    adminPath:"./chikage/",
    desktopPath:"../admin/creators/chikage/",
    status:"active",
    order:1,
    features:Object.freeze((chikageWorkspace?.features||[]).map((item,index)=>createFeature(
        item.id,
        item.label,
        item.adminPath,
        item.publicPath,
        index+1,
        item.group,
        item.capabilities
    ))),
    sections:Object.freeze([
        createSection("chikage-site","Website","公開サイトの文言・構造・デザインを編集します。","./chikage/#site-home","active",1),
        createSection("chikage-works-data","Works data","公開作品そのものを管理します。","./?creator=creator-chikage#creatorWorksSection","active",2),
        createSection("chikage-links-data","Contact links","公開リンクそのものを管理します。","./?creator=creator-chikage#creatorLinksSection","active",3),
        createSection("chikage-trpg-scenarios","TRPG scenarios","シナリオライブラリを管理します。","../trpg/","active",4),
        createSection("chikage-trpg-rules","House Rules","ハウスルールを管理します。","../trpg/rules/","active",5),
        createSection("chikage-trpg-scheduler","Scheduler","卓作成・回答・確定を行う運用画面へ進みます。","./chikage/#trpg-scheduler","active",6),
        createSection("chikage-trpg-calendar","Calendar","確定済みセッションのカレンダーを確認します。","./chikage/#trpg-calendar","active",7),
        createSection("chikage-publish","Publish","千景に属するPublic surfaceを確認して公開へ進みます。","./chikage/#site-publish","active",8)
    ])
}]);

export function getCreatorSites(){
    return CREATOR_SITES
        .map(site=>({
            ...site,
            features:[...site.features].sort((a,b)=>a.order-b.order),
            sections:[...site.sections].sort((a,b)=>a.order-b.order)
        }))
        .sort((a,b)=>a.order-b.order);
}

export function getCreatorSiteStatusLabel(status){
    return CREATOR_SITE_STATUSES[status]||CREATOR_SITE_STATUSES.unavailable;
}

function createFeature(id,title,adminPath,publicPath,order,group="",capabilities={}){
    return Object.freeze({
        id,
        title,
        adminPath,
        desktopPath:toStudioAdminPath(adminPath),
        publicPath,
        order,
        group,
        capabilities:Object.freeze({...capabilities})
    });
}

function toStudioAdminPath(adminPath){
    const path=String(adminPath||"").trim();
    if(!path){return "../admin/creators/chikage/";}
    if(path.startsWith("./")){
        return `../admin/${path.slice(2)}`;
    }
    if(path.startsWith("../")){
        return `../admin/${path.replace(/^\.\.\//,"")}`;
    }
    return `../admin/${path.replace(/^\/+/,"")}`;
}

function createSection(id,title,description,adminPath,status,order){
    return Object.freeze({id,title,description,adminPath,status,order});
}
