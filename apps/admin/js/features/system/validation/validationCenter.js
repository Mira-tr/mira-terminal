import {
    getBrandSections
} from "../../brand/brandSectionRegistry.js";

import {
    getCreatorSites
} from "../../creators/creatorSiteRegistry.js";

import {
    getModules
} from "../../modules/moduleRegistry.js";

import {
    getPublicExportTargets,
    getStorageTargets,
    summarizeStorageTarget
} from "../systemInventory.js";

export function runSystemValidation(storage = localStorage){
    const issues = [
        ...validateUniqueIds("Brand section", getBrandSections().map(item => item.id), "../terminal/#workspace-brand"),
        ...validateUniqueIds("Creator", getCreatorSites().map(item => item.creatorId), "../terminal/#workspace-creators"),
        ...validateUniqueIds("Module", getModules().map(item => item.id), "../terminal/#workspace-creators"),
        ...validateCreatorOwnership(),
        ...validateStorage(storage),
        ...validateExportTargets()
    ];

    return {
        status: issues.some(issue => issue.severity === "critical") ? "critical" : issues.some(issue => issue.severity === "high") ? "high" : "ok",
        issues
    };
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
            href: "../terminal/#workspace-creators"
        }));
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
