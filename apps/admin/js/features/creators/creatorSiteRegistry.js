export const CREATOR_SITE_STATUSES = Object.freeze({active:"編集可能",planned:"準備中",unavailable:"利用不可"});

const CREATOR_SITES = Object.freeze([{
    creatorId:"creator-chikage",
    slug:"chikage",
    title:"千景",
    description:"千景の公開サイト全体を管理します。ページ、作品、TRPG、連絡先、ナビ、デザイン、公開までがこのWorkspaceの範囲です。",
    publicPath:"../../web/creators/chikage/",
    adminPath:"./chikage/",
    desktopPath:"../admin/creators/chikage/",
    status:"active",
    order:1,
    features:Object.freeze([
        createFeature("chikage-home","Home","./chikage/#site-home","../admin/creators/chikage/#site-home",1),
        createFeature("chikage-profile","Profile","./chikage/#site-profile","../admin/creators/chikage/#site-profile",2),
        createFeature("chikage-works","Works","./chikage/#site-works","../admin/creators/chikage/#site-works",3),
        createFeature("chikage-trpg","TRPG","../trpg/","../admin/trpg/",4),
        createFeature("chikage-contact","Contact","./chikage/#site-contact","../admin/creators/chikage/#site-contact",5),
        createFeature("chikage-navigation","Navigation","./chikage/#site-navigation","../admin/creators/chikage/#site-navigation",6),
        createFeature("chikage-design","Design","./chikage/#site-design","../admin/creators/chikage/#site-design",7),
        createFeature("chikage-publish","Publish","./chikage/#site-publish","../admin/creators/chikage/#site-publish",8)
    ]),
    sections:Object.freeze([
        createSection("chikage-site","Site Console","公開サイト全体の文言・構造・デザインを編集します。","./chikage/","active",1),
        createSection("chikage-works-data","Works data","公開作品そのものを管理します。","./?creator=creator-chikage#creatorWorksSection","active",2),
        createSection("chikage-links-data","Contact links","公開リンクそのものを管理します。","./?creator=creator-chikage#creatorLinksSection","active",3),
        createSection("chikage-trpg-scenarios","TRPG scenarios","シナリオライブラリを管理します。","../trpg/","active",4),
        createSection("chikage-trpg-rules","House Rules","ハウスルールを管理します。","../trpg/rules/","active",5)
    ])
}]);

export function getCreatorSites(){return CREATOR_SITES.map(site=>({...site,features:[...site.features].sort((a,b)=>a.order-b.order),sections:[...site.sections].sort((a,b)=>a.order-b.order)})).sort((a,b)=>a.order-b.order);}
export function getCreatorSiteStatusLabel(status){return CREATOR_SITE_STATUSES[status]||CREATOR_SITE_STATUSES.unavailable;}
function createFeature(id,title,adminPath,desktopPath,order){return Object.freeze({id,title,adminPath,desktopPath,order});}
function createSection(id,title,description,adminPath,status,order){return Object.freeze({id,title,description,adminPath,status,order});}
