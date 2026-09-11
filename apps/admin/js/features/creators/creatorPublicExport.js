import { getCreators, normalizeCreatorsCollection, validateCreatorsCollection } from "./creatorStore.js";
import { isSafeHttpUrl } from "../../utils.js";
import { showToast } from "../common/toastService.js";
import { recordPublicExport } from "../common/operationMeta.js";
import { APP_NAME } from "../../appIdentity.js";
import { getCreatorSites } from "./creatorSiteRegistry.js";
import { validateCreatorPublications } from "./creatorPublication.js";

const BRAND_NAME = "RELMUA";
const MODULE_NAME = "creators";
const EXPORT_TYPE = "public-creators";
const EXPORT_VERSION = "3.0.0";
const SCHEMA_VERSION = 3;
const PUBLIC_EXPORT_FILENAME = "public-creators.json";
const PUBLIC_EXPORT_DESTINATION = "apps/web/data/public-creators.json";

export function createPublicCreatorsPayload(collection = getCreators()){
    const normalized = normalizeCreatorsCollection(collection);
    const warnings = [];
    validateCreatorsCollection(normalized);
    validatePublicExportRules(normalized);
    validateCreatorPublications(normalized, getCreatorSites());
    const publicCreators = normalized.creators.filter(creator => creator.status === "public").sort((a,b)=>a.order-b.order).map(creator => toPublicCreator(creator,warnings));
    return { app: APP_NAME, brand: BRAND_NAME, module: MODULE_NAME, exportType: EXPORT_TYPE, exportVersion: EXPORT_VERSION, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), primaryCreatorId: normalized.primaryCreatorId, creators: publicCreators, warnings };
}

export function exportPublicCreators(){
    const blob = new Blob([JSON.stringify(createPublicCreatorsPayload(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;a.download = PUBLIC_EXPORT_FILENAME;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),0);
    recordPublicExport(MODULE_NAME);
    showToast(`Public JSONを出力しました: ${PUBLIC_EXPORT_DESTINATION}`, "success");
}

export function getCreatorsPublicExportContract(){return { filename: PUBLIC_EXPORT_FILENAME, destination: PUBLIC_EXPORT_DESTINATION };}

function validatePublicExportRules(collection){
    const publicCreators = collection.creators.filter(creator => creator.status === "public");
    const primary = collection.creators.find(creator => creator.id === collection.primaryCreatorId);
    const publicSlugs = new Set();
    if(!collection.primaryCreatorId) throw new Error("Primary Creatorが設定されていません");
    if(publicCreators.length === 0) throw new Error("public Creatorが0件です");
    if(!primary) throw new Error("Primary Creatorが存在しません");
    if(primary.status !== "public") throw new Error("Primary Creatorがpublicではありません");
    publicCreators.forEach(creator => {if(publicSlugs.has(creator.slug)) throw new Error(`public Creator間でslugが重複しています: ${creator.slug}`);publicSlugs.add(creator.slug);});
}

function toPublicCreator(creator,warnings){
    return {
        id: creator.id,
        slug: creator.slug,
        displayName: creator.displayName,
        nameEn: creator.nameEn,
        bio: creator.bio,
        activities: creator.activities,
        works: creator.works.filter(work=>work.status==="public").map(work=>({id:work.id,title:work.title,summary:work.summary,url:work.url,order:work.order})).sort((a,b)=>a.order-b.order),
        links: creator.links.filter(link=>link.status==="public").filter(link=>{const valid=Boolean(link.label&&link.url&&isSafeHttpUrl(link.url));if(!valid)warnings.push(`Invalid public link skipped: ${creator.id}/${link.id}`);return valid;}).map(link=>({id:link.id,label:link.label,url:link.url,order:link.order})).sort((a,b)=>a.order-b.order),
        site: toPublicSite(creator.site),
        order: creator.order
    };
}

function toPublicSite(site){
    const source = site && typeof site === "object" ? site : {};
    const copyPage = key => ({
        eyebrow: String(source[key]?.eyebrow || ""),
        title: String(source[key]?.title || ""),
        lead: String(source[key]?.lead || "")
    });
    return {
        schemaVersion: 1,
        theme: {
            preset: String(source.theme?.preset || ""),
            canvas: String(source.theme?.canvas || ""),
            surface: String(source.theme?.surface || ""),
            accent: String(source.theme?.accent || ""),
            text: String(source.theme?.text || ""),
            muted: String(source.theme?.muted || "")
        },
        navigation: Array.isArray(source.navigation) ? source.navigation.map(({id,label,path,visible,order})=>({id,label,path,visible,order})) : [],
        home: { ...copyPage("home"), role:String(source.home?.role||""), sectionTitle:String(source.home?.sectionTitle||""), sectionLead:String(source.home?.sectionLead||""), focus:Array.isArray(source.home?.focus)?source.home.focus:[] },
        profile: { ...copyPage("profile"), principles:Array.isArray(source.profile?.principles)?source.profile.principles:[] },
        works: copyPage("works"),
        trpg: copyPage("trpg"),
        contact: { ...copyPage("contact"), linksLead:String(source.contact?.linksLead||"") },
        footer: { copyright:String(source.footer?.copyright||"") }
    };
}
