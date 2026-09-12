import {
    getCreatorFeatureGroups,
    getCreatorWorkspace,
    resolveAdminRelativePath
} from "./creatorFeatureRegistry.js";

export function mountCreatorWorkspaceChrome(options={}){
    const body=options.body||document.body;
    const main=options.main||document.querySelector(".admin-main");
    const creatorId=options.creatorId||body?.dataset.creatorId;
    const activeFeatureId=options.featureId||body?.dataset.creatorFeature;
    const workspace=getCreatorWorkspace(creatorId);

    if(!body||!main||!workspace||main.querySelector("[data-creator-workspace-chrome]")){
        return null;
    }

    body.classList.add("creator-admin",`creator-admin--${workspace.theme}`,"creator-feature-page");

    const breadcrumb=main.querySelector(":scope > .admin-breadcrumb");
    const content=document.createElement("div");
    content.className="creator-feature-content";

    [...main.children].forEach(child=>{
        if(child!==breadcrumb){content.append(child);}
    });

    const shell=document.createElement("div");
    shell.className="creator-feature-shell";
    shell.dataset.creatorWorkspaceChrome="";

    const aside=document.createElement("aside");
    aside.className="creator-feature-rail";
    aside.setAttribute("aria-label",`${workspace.displayName} Creator Workspace`);

    const home=document.createElement("a");
    home.className="creator-feature-identity";
    home.href=resolveAdminRelativePath(workspace.adminPath);
    home.append(
        createText("span","CREATOR"),
        createText("strong",workspace.displayName),
        createText("small","RELMUA / Creators")
    );
    aside.append(home);

    getCreatorFeatureGroups(workspace.creatorId).forEach(group=>{
        const section=document.createElement("section");
        section.className="creator-feature-nav-group";
        section.append(createText("p",group.label));
        const nav=document.createElement("nav");
        nav.setAttribute("aria-label",`${group.label} navigation`);
        group.features.forEach(feature=>{
            const link=document.createElement("a");
            link.href=resolveAdminRelativePath(feature.adminPath);
            link.textContent=feature.label;
            link.dataset.creatorFeatureLink=feature.id;
            if(feature.id===activeFeatureId){
                link.classList.add("is-active");
                link.setAttribute("aria-current","page");
            }
            nav.append(link);
        });
        section.append(nav);
        aside.append(section);
    });

    const publicLink=document.createElement("a");
    publicLink.className="creator-feature-public-link";
    publicLink.href=resolveAdminRelativePath(workspace.publicPath);
    publicLink.target="_blank";
    publicLink.rel="noopener";
    publicLink.textContent="公開サイトを確認 ↗";
    aside.append(publicLink);

    shell.append(aside,content);
    main.append(shell);
    return shell;
}

function createText(tag,text){
    const element=document.createElement(tag);
    element.textContent=text;
    return element;
}

if(typeof document!=="undefined"){
    const run=()=>mountCreatorWorkspaceChrome();
    if(document.readyState==="loading"){
        document.addEventListener("DOMContentLoaded",run,{once:true});
    }else{
        run();
    }
}
