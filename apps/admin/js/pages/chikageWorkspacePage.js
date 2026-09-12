import { getCreators, normalizeCreatorSite } from "../features/creators/creatorStore.js";
import { hydrateCreatorsFromCms, updateCreatorCanonical } from "../features/creators/creatorCmsStore.js";
import { createPublicCreatorPreview } from "../features/creators/creatorPublicExport.js";
import { resolveCreatorPublicHref, resolveCreatorWorkspacePublicHref } from "../features/creators/creatorFeatureRegistry.js";
import { getOwnerScenarios, hydrateScenariosFromCms } from "../features/trpg/scenarios/scenarioCmsStore.js";
import { buildChikageWorkspaceSummary, CHIKAGE_CREATOR_ID, formatChikageWorkspaceTimestamp } from "../features/creators/chikageWorkspace.js";
import { initToastService, showToast } from "../features/common/toastService.js";

let workspaceCreator = null;

initToastService();
initWorkspace();

async function initWorkspace(){
    setLoading(true);
    const [creatorResult, scenarioResult] = await Promise.allSettled([hydrateCreatorsFromCms(), hydrateScenariosFromCms(CHIKAGE_CREATOR_ID)]);
    if(creatorResult.status === "rejected") showToast(creatorResult.reason?.message || "千景をDBから読み込めませんでした。cacheを表示します。", "warning");
    const creator = getCreators().creators.find(item => item.id === CHIKAGE_CREATOR_ID);
    if(!creator){renderMissingCreator();setLoading(false);return;}
    workspaceCreator = creator;
    const summary = buildChikageWorkspaceSummary(creator, getOwnerScenarios(CHIKAGE_CREATOR_ID));
    renderHero(summary, creator);
    populateEditor(creator);
    renderPublication(summary);
    renderDataSourceState(creatorResult, scenarioResult);
    registerPreviewProvider();
    wireEditor();
    setLoading(false);
}

function renderHero(summary, creator){
    setText("chikageWorkspaceTitle", summary.displayName);
    setText("chikageWorkspaceBio", summary.bio || "Bioはまだ設定されていません。");
    setText("chikageWorkspaceUpdated", `最終更新 ${formatChikageWorkspaceTimestamp(summary.updatedAt)}`);
    const status = document.getElementById("chikageWorkspaceStatus");
    status.textContent = statusLabel(summary.status);status.className = `status-badge is-${summary.status}`;
    const metrics = [["作品",summary.works.total],["Links",summary.links.total],["Scenarios",summary.scenarios.total]];
    document.getElementById("chikageWorkspaceMetrics").replaceChildren(...metrics.map(([label,value])=>{
        const item=document.createElement("div");
        const labelNode=document.createElement("span");
        const valueNode=document.createElement("strong");
        item.className="creator-workspace-metric";
        labelNode.textContent=label;
        valueNode.textContent=String(value);
        item.append(labelNode,valueNode);
        return item;
    }));
    document.getElementById("chikagePublicSiteLink").href = resolveCreatorWorkspacePublicHref(CHIKAGE_CREATOR_ID);
    document.getElementById("trpgPublicLink").href = resolveCreatorPublicHref(CHIKAGE_CREATOR_ID,"trpg-overview");
    const schedulerLink=document.querySelector('a[href*="creators/chikage/trpg/scheduler/"]');
    const calendarLink=document.querySelector('a[href*="creators/chikage/trpg/calendar/"]');
    if(schedulerLink) schedulerLink.href=resolveCreatorPublicHref(CHIKAGE_CREATOR_ID,"trpg-scheduler");
    if(calendarLink) calendarLink.href=resolveCreatorPublicHref(CHIKAGE_CREATOR_ID,"trpg-calendar");
    applyCreatorWorld(creator.site?.theme);
}

function populateEditor(creator){
    const site = normalizeCreatorSite(creator.site, creator);
    setValue("siteDisplayName",creator.displayName);setValue("siteStatus",creator.status);setValue("siteBio",creator.bio);setValue("siteActivities",creator.activities.join("\n"));
    setPage("home",site.home,["Eyebrow","Role","Lead","SectionTitle","SectionLead","Focus"]);
    setValue("homeFocus",site.home.focus.join("\n"));
    setPage("profile",site.profile,["Eyebrow","Title","Lead","Principles"]);setValue("profilePrinciples",site.profile.principles.join("\n"));
    setPage("works",site.works,["Eyebrow","Title","Lead"]);setPage("trpg",site.trpg,["Eyebrow","Title","Lead"]);setPage("contact",site.contact,["Eyebrow","Title","Lead","LinksLead"]);
    setValue("siteNavigation",site.navigation.map(item=>`${item.id} | ${item.label} | ${item.visible ? "on" : "off"}`).join("\n"));
    setValue("themeCanvas",site.theme.canvas);setValue("themeSurface",site.theme.surface);setValue("themeAccent",site.theme.accent);setValue("themeText",site.theme.text);setValue("themeMuted",site.theme.muted);
}

function setPage(prefix,page,keys){keys.forEach(key=>{const prop=key.charAt(0).toLowerCase()+key.slice(1);if(Array.isArray(page[prop])) return;setValue(`${prefix}${key}`,page[prop]||"");});}

function registerPreviewProvider(){
    window.RELMUA_ADMIN_PREVIEW_PROVIDER = {
        getPayload(surfaceId){
            if(!String(surfaceId || "").startsWith("creator-chikage-")) return null;
            return {kind: "creator",creator: createPublicCreatorPreview(collectDraftCreator())};
        },
        getCreator(surfaceId){
            if(!String(surfaceId || "").startsWith("creator-chikage-")) return null;
            return collectDraftCreator();
        }
    };
    window.dispatchEvent(new Event("relmua-admin-preview-dirty"));
}

function wireEditor(){
    const form = document.getElementById("chikageSiteForm");
    form.addEventListener("input",()=>{
        setText("chikageSiteSaveState","未保存の変更があります。");
        window.dispatchEvent(new Event("relmua-admin-preview-dirty"));
    });
    form.addEventListener("submit",async event=>{
        event.preventDefault();
        const button=document.getElementById("chikageSiteSave");button.disabled=true;button.setAttribute("aria-busy","true");
        try{
            const current=getCreators().creators.find(item=>item.id===CHIKAGE_CREATOR_ID);
            if(!current) throw new Error("千景のCreatorデータがありません");
            const site=collectSite(current);
            await updateCreatorCanonical(CHIKAGE_CREATOR_ID,{displayName:value("siteDisplayName"),status:value("siteStatus"),bio:value("siteBio"),activities:lines("siteActivities"),site});
            workspaceCreator=getCreators().creators.find(item=>item.id===CHIKAGE_CREATOR_ID)||collectDraftCreator();
            setText("chikageSiteSaveState","CMSへ保存しました。Public Snapshotを更新すると公開側へ反映できます。");
            showToast("千景サイトを保存しました", "success");
            applyCreatorWorld(site.theme);
            window.dispatchEvent(new Event("relmua-admin-saved"));
        }catch(error){console.error(error);setText("chikageSiteSaveState",error.message||"保存に失敗しました");showToast(error.message||"保存に失敗しました","error");}
        finally{button.disabled=false;button.removeAttribute("aria-busy");}
    });
}

function collectDraftCreator(){
    const current=workspaceCreator||getCreators().creators.find(item=>item.id===CHIKAGE_CREATOR_ID);
    if(!current) throw new Error("千景のCreatorデータがありません");
    return {...current,displayName:value("siteDisplayName")||current.displayName,status:value("siteStatus")||current.status,bio:value("siteBio"),activities:lines("siteActivities"),site:collectSite(current)};
}

function collectSite(current){
    return normalizeCreatorSite({
        ...(current.site||{}),
        theme:{...(current.site?.theme||{}),canvas:value("themeCanvas"),surface:value("themeSurface"),accent:value("themeAccent"),text:value("themeText"),muted:value("themeMuted")},
        navigation:parseNavigation(value("siteNavigation")),
        home:{eyebrow:value("homeEyebrow"),role:value("homeRole"),lead:value("homeLead"),sectionTitle:value("homeSectionTitle"),sectionLead:value("homeSectionLead"),focus:lines("homeFocus")},
        profile:{eyebrow:value("profileEyebrow"),title:value("profileTitle"),lead:value("profileLead"),principles:lines("profilePrinciples")},
        works:{eyebrow:value("worksEyebrow"),title:value("worksTitle"),lead:value("worksLead")},
        trpg:{eyebrow:value("trpgEyebrow"),title:value("trpgTitle"),lead:value("trpgLead")},
        contact:{eyebrow:value("contactEyebrow"),title:value("contactTitle"),lead:value("contactLead"),linksLead:value("contactLinksLead")},
        footer:{copyright:`© RELMUA / ${value("siteDisplayName")||current.displayName}`}
    },{slug:current.slug,displayName:value("siteDisplayName")||current.displayName});
}

function parseNavigation(text){return String(text||"").split(/\r?\n/).map((line,index)=>{const [id,label,state]=line.split("|").map(v=>v.trim());return {id,label,visible:!(["off","false","0","hide"].includes(String(state||"").toLowerCase())),order:index+1};}).filter(item=>item.id);}
function applyCreatorWorld(theme={}){const root=document.querySelector(".creator-admin--chikage");if(!root)return;[["--creator-world-canvas",theme.canvas],["--creator-world-surface",theme.surface],["--creator-world-accent",theme.accent],["--creator-world-text",theme.text],["--creator-world-muted",theme.muted]].forEach(([name,val])=>{if(val)root.style.setProperty(name,val);});}
function renderPublication(summary){const container=document.getElementById("chikagePublicationSummary");const state=document.createElement("strong");state.textContent=publicationStateLabel(summary.status);const detail=document.createElement("span");detail.textContent=`作品 ${summary.works.public}/${summary.works.total} ・ Links ${summary.links.public}/${summary.links.total} ・ Scenarios ${summary.scenarios.public}/${summary.scenarios.total}`;container.replaceChildren(state,detail);}
function renderDataSourceState(creatorResult,scenarioResult){const note=document.getElementById("chikageWorkspaceSource");const ok=[creatorResult,scenarioResult].filter(r=>r.status==="fulfilled").length===2;note.textContent=ok?"CMS同期済み":"一部CMS取得に失敗。互換cacheを含む表示です。";note.className=`creator-workspace-source ${ok?"is-ready":"has-warning"}`;}
function renderMissingCreator(){document.getElementById("chikageWorkspaceContent").hidden=true;const missing=document.getElementById("chikageWorkspaceMissing");missing.hidden=false;missing.querySelector("p").textContent="千景のCreatorデータが見つかりません。Creators管理から確認してください。";}
function setLoading(loading){document.getElementById("chikageWorkspaceLoading").hidden=!loading;document.getElementById("chikageWorkspaceContent").hidden=loading;}
function setValue(id,val){const node=document.getElementById(id);if(node)node.value=val??"";}function value(id){return document.getElementById(id)?.value?.trim()||"";}function lines(id){return value(id).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);}function setText(id,val){const node=document.getElementById(id);if(node)node.textContent=val;}
function statusLabel(status){return ({public:"Public",draft:"Draft",private:"Private"})[status]||"Draft";}function publicationStateLabel(status){return ({public:"千景サイトは公開対象",draft:"千景サイトはDraft",private:"千景サイトは非公開"})[status]||"千景サイトはDraft";}
