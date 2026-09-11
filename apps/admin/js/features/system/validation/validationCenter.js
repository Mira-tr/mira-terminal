import {
    getBrandSections
} from "../../brand/brandSectionRegistry.js";

import {
    getCreatorSites
} from "../../creators/creatorSiteRegistry.js";

import {
    normalizeCreatorsCollection
} from "../../creators/creatorStore.js";

import {
    getCreatorPublicationIssue
} from "../../creators/creatorPublication.js";

import {
    CREATORS_KEY
} from "../../../store.js";

import {
    getModules
} from "../../modules/moduleRegistry.js";

import {
    PUBLIC_ADMIN_SURFACES
} from "../../site/publicAdminRegistry.js";

import {
    getPublicExportTargets,
    getStorageTargets,
    summarizeStorageTarget
} from "../systemInventory.js";

export function runSystemValidation(storage = localStorage){
    const issues = [
        ...validateUniqueIds("Brand section", getBrandSections().map(item => item.id), "../../home/"),
        ...validateUniqueIds("Creator", getCreatorSites().map(item => item.creatorId), "../../creators/"),
        ...validateUniqueIds("Module", getModules().map(item => item.id), "../../"),
        ...validateUniqueIds("Public surface", PUBLIC_ADMIN_SURFACES.map(item => item.id), "../../brand/"),
        ...validateCreatorOwnership(),
        ...validateCreatorPublicRoutes(storage),
        ...validatePublicSurfaceContracts(),
        ...validateStorage(storage),
        ...validateExportTargets()
    ];

    return {
        status: issues.some(issue => issue.severity === "critical") ? "critical" : issues.some(issue => issue.severity === "high") ? "high" : "ok",
        issues
    };
}

function validateCreatorPublicRoutes(storage){
    const raw = storage.getItem(CREATORS_KEY);
    if(raw === null){
        return [];
    }

    try{
        const collection = normalizeCreatorsCollection(JSON.parse(raw));
        return collection.creators
            .map(creator => getCreatorPublicationIssue(creator, getCreatorSites()))
            .filter(Boolean)
            .map(summary => createIssue({
                severity: "high",
                title: "Public Creator route is unavailable",
                summary,
                href: "../../creators/"
            }));
    }catch{
        return [];
    }
}

export function groupIssuesBySeverity(issues){
    return issues.reduce((groups, issue) => {
        const key = issue.severity || "info";
        groups[key] = groups[key] || [];
        groups[key].push(issue);
        return groups;
    }, {});
}

function validateUniqueIds(label, values, href){
    const seen = new Set();
    const issues = [];

    values.forEach(value => {
        if(seen.has(value)){
            issues.push(createIssue({
                severity: "critical",
                title: `${label} ID is duplicated`,
                summary: `${value} appears more than once.`,
                href
            }));
        }
        seen.add(value);
    });

    return issues;
}

function validateCreatorOwnership(){
    const creators = new Set(getCreatorSites().map(site => site.creatorId));
    return getModules()
        .filter(module => !creators.has(module.ownerCreatorId))
        .map(module => createIssue({
            severity: "critical",
            title: "Module owner is invalid",
            summary: `${module.title} references ${module.ownerCreatorId}.`,
            href: "../../creators/"
        }));
}

function validatePublicSurfaceContracts(){
    const targets = new Set(getPublicExportTargets().map(target => target.id));
    const creatorIds = new Set(getCreatorSites().map(site => site.creatorId));
    const issues = [];

    PUBLIC_ADMIN_SURFACES.forEach(surface => {
        if(!surface.publicPath && surface.id !== "relmua-home"){
            issues.push(createIssue({
                severity: "critical",
                title: "Public surface path is missing",
                summary: `${surface.id} has no publicPath.`,
                href: "../../brand/"
            }));
        }
        if(!surface.adminPath){
            issues.push(createIssue({
                severity: "critical",
                title: "Public surface editor is missing",
                summary: `${surface.id} has no adminPath.`,
                href: "../../brand/"
            }));
        }
        surface.exportTargetIds.forEach(targetId => {
            if(!targets.has(targetId)){
                issues.push(createIssue({
                    severity: "critical",
                    title: "Public surface export target is invalid",
                    summary: `${surface.id} references ${targetId}.`,
                    href: "../../system/export/"
                }));
            }
        });
        if(surface.scope === "creator" && !creatorIds.has(surface.ownerId)){
            issues.push(createIssue({
                severity: "critical",
                title: "Public surface Creator owner is invalid",
                summary: `${surface.id} references ${surface.ownerId}.`,
                href: "../../creators/"
            }));
        }
        if(surface.scope === "brand" && surface.ownerId !== "relmua"){
            issues.push(createIssue({
                severity: "critical",
                title: "Brand surface owner is invalid",
                summary: `${surface.id} must belong to relmua.`,
                href: "../../brand/"
            }));
        }
    });

    return issues;
}

function validateStorage(storage){
    return getStorageTargets()
        .map(target => summarizeStorageTarget(target, storage))
        .filter(summary => !summary.validJson)
        .map(summary => createIssue({
            severity: "critical",
            title: "Broken local data",
            summary: `${summary.title} is not valid JSON in localStorage.`,
            href: "../system/backup/"
        }));
}

function validateExportTargets(){
    return getPublicExportTargets()
        .filter(target => !target.filename || !target.destination)
        .map(target => createIssue({
            severity: "critical",
            title: "Export target is incomplete",
            summary: `${target.title} is missing filename or destination.`,
            href: "../system/export/"
        }));
}

function createIssue({ severity, title, summary, href }){
    return {
        id: `${severity}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        severity,
        title,
        summary,
        href
    };
}
