import {
    lstat,
    readFile,
    readdir
} from "node:fs/promises";

import {
    dirname,
    extname,
    join,
    relative,
    resolve,
    sep
} from "node:path";

import {
    fileURLToPath
} from "node:url";

import {
    APP_NAME,
    PRODUCT_VERSION
} from "../apps/admin/js/appIdentity.js";

import {
    getProfileCompatibilityIssues
} from "./public-readiness-rules.mjs";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const PUBLIC_ROOT = join(PROJECT_ROOT, "apps", "web");
const EDITORIAL_ASSET_ROOT = join(PUBLIC_ROOT, "assets", "editorial");
const MAX_EDITORIAL_IMAGE_BYTES = 750_000;
const PRIVATE_PUBLIC_FIELDS = new Set([
    "memo",
    "status",
    "createdAt",
    "updatedAt"
]);
const NON_INDEXED_ROUTES = Object.freeze([
    "tools/",
    "creators/asagiri/",
    "creators/asagiri/profile/",
    "creators/asagiri/works/",
    "creators/asagiri/contact/"
]);

await checkPublicReadiness();

async function checkPublicReadiness(){
    const files = await collectFiles(PUBLIC_ROOT);
    const htmlFiles = files.filter(file => extname(file).toLowerCase() === ".html");
    const cssFiles = files.filter(file => extname(file).toLowerCase() === ".css");
    const jsFiles = files.filter(file => extname(file).toLowerCase() === ".js");
    const jsonFiles = files.filter(file => extname(file).toLowerCase() === ".json");
    const failures = [];

    await checkProductIdentity(jsonFiles, failures);
    await checkReadinessBoundaries(failures);
    await checkLocalReferences(htmlFiles, cssFiles, jsFiles, failures);
    await checkImageBudget(files, failures);

    if(failures.length){
        failures.forEach(failure => console.error(`- ${failure}`));
        throw new Error(`Public readiness check failed: ${failures.length} issue(s)`);
    }

    console.log(
        `Public readiness passed: ${htmlFiles.length} HTML, ${jsonFiles.length} JSON, ` +
        `${formatBytes(await getEditorialImageBytes(files))} editorial images`
    );
}

async function checkProductIdentity(jsonFiles, failures){
    const packageData = JSON.parse(
        await readFile(join(PROJECT_ROOT, "package.json"), "utf8")
    );

    if(packageData.version !== PRODUCT_VERSION){
        failures.push(
            `package.json version ${packageData.version} does not match ${PRODUCT_VERSION}`
        );
    }

    for(const file of jsonFiles){
        const payload = JSON.parse(await readFile(file, "utf8"));

        if(payload.app !== undefined && payload.app !== APP_NAME){
            failures.push(
                `${toProjectPath(file)} uses app=${JSON.stringify(payload.app)}`
            );
        }

        checkPublicValue(
            payload,
            toProjectPath(file),
            failures
        );
    }
}

function checkPublicValue(value, path, failures){
    if(Array.isArray(value)){
        value.forEach((item, index) => {
            checkPublicValue(item, `${path}[${index}]`, failures);
        });
        return;
    }

    if(!value || typeof value !== "object"){
        return;
    }

    Object.entries(value).forEach(([key, item]) => {
        const itemPath = `${path}.${key}`;

        if(PRIVATE_PUBLIC_FIELDS.has(key)){
            failures.push(`${itemPath} exposes an Admin-only field`);
        }

        if(key === "url" && item && !isSafeExternalUrl(item)){
            failures.push(`${itemPath} must use http: or https:`);
        }

        checkPublicValue(item, itemPath, failures);
    });
}

function isSafeExternalUrl(value){
    try{
        return ["http:", "https:"].includes(new URL(String(value)).protocol);
    }catch{
        return false;
    }
}

async function checkReadinessBoundaries(failures){
    const sitemap = await readFile(join(PUBLIC_ROOT, "sitemap.xml"), "utf8");
    const tools = JSON.parse(
        await readFile(join(PUBLIC_ROOT, "tools", "data", "public-tools.json"), "utf8")
    );
    const home = JSON.parse(
        await readFile(join(PUBLIC_ROOT, "data", "public-home.json"), "utf8")
    );
    const creators = JSON.parse(
        await readFile(join(PUBLIC_ROOT, "data", "public-creators.json"), "utf8")
    );
    const profile = JSON.parse(
        await readFile(join(PUBLIC_ROOT, "data", "public-profile.json"), "utf8")
    );

    failures.push(...getProfileCompatibilityIssues(creators, profile));

    if(!Array.isArray(tools.tools)){
        failures.push("public-tools.json tools must be an array");
    }

    if(tools.tools.length === 0){
        const toolsSection = home.sections?.find(section => section.id === "featured-tools");

        if(toolsSection?.enabled !== false){
            failures.push("featured-tools must be disabled while public-tools.json is empty");
        }
    }

    for(const route of NON_INDEXED_ROUTES){
        const page = join(PUBLIC_ROOT, route, "index.html");
        const html = await readFile(page, "utf8");

        if(!/<meta name="robots" content="noindex,follow">/.test(html)){
            failures.push(`${toProjectPath(page)} must use noindex,follow`);
        }

        if(sitemap.includes(`https://relmua.com/${route}`)){
            failures.push(`sitemap.xml must not include non-indexed route /${route}`);
        }
    }

    const publicHtml = await collectFiles(PUBLIC_ROOT);

    for(const file of publicHtml.filter(path => extname(path).toLowerCase() === ".html")){
        const html = await readFile(file, "utf8");
        const headerNav = html.match(/<nav class="[^"]*header-nav[^"]*"[\s\S]*?<\/nav>/)?.[0] ?? "";

        if(/href="[^"]*tools\/"/.test(headerNav)){
            failures.push(`${toProjectPath(file)} promotes empty Tools in Global Navigation`);
        }
    }
}

async function checkLocalReferences(htmlFiles, cssFiles, jsFiles, failures){
    for(const file of htmlFiles){
        const source = await readFile(file, "utf8");
        const references = [
            ...source.matchAll(/\b(?:href|src)="([^"]+)"/g)
        ].map(match => match[1]);

        for(const reference of references){
            await checkReference(file, reference, failures);
        }
    }

    for(const file of cssFiles){
        const source = await readFile(file, "utf8");
        const references = [
            ...source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)
        ].map(match => match[1]);

        for(const reference of references){
            await checkReference(file, reference, failures);
        }
    }

    for(const file of jsFiles){
        const source = await readFile(file, "utf8");
        const references = [
            ...source.matchAll(/\bfrom\s+["']([^"']+)["']/g),
            ...source.matchAll(/\bimport\s+["']([^"']+)["']/g),
            ...source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)
        ].map(match => match[1]);

        for(const reference of references){
            if(reference.startsWith(".")){
                await checkReference(file, reference, failures);
            }
        }
    }
}

async function checkReference(sourceFile, reference, failures){
    if(!reference ||
        reference.startsWith("#") ||
        /^[a-z][a-z0-9+.-]*:/i.test(reference) ||
        reference.startsWith("//") ||
        reference.includes("var(")){
        return;
    }

    const cleanReference = reference.split(/[?#]/, 1)[0];

    if(!cleanReference){
        return;
    }

    let target = cleanReference.startsWith("/")
        ? join(PUBLIC_ROOT, cleanReference.replace(/^[/\\]+/, ""))
        : resolve(dirname(sourceFile), cleanReference);

    if(cleanReference.endsWith("/") || cleanReference === "." || cleanReference === ".."){
        target = join(target, "index.html");
    }

    if(!isInsidePublicRoot(target) || !await hasPath(target)){
        failures.push(
            `${toProjectPath(sourceFile)} has broken local reference ${reference}`
        );
    }
}

async function checkImageBudget(files, failures){
    const pngFiles = files.filter(file => extname(file).toLowerCase() === ".png");

    if(pngFiles.length){
        pngFiles.forEach(file => {
            failures.push(`${toProjectPath(file)} must be optimized to WebP or SVG`);
        });
    }

    const editorialBytes = await getEditorialImageBytes(files);

    if(editorialBytes > MAX_EDITORIAL_IMAGE_BYTES){
        failures.push(
            `editorial image budget is ${formatBytes(editorialBytes)}; ` +
            `limit is ${formatBytes(MAX_EDITORIAL_IMAGE_BYTES)}`
        );
    }
}

async function getEditorialImageBytes(files){
    const editorialPrefix = `${resolve(EDITORIAL_ASSET_ROOT)}${sep}`;
    let total = 0;

    for(const file of files){
        if(!resolve(file).startsWith(editorialPrefix)){
            continue;
        }

        total += (await lstat(file)).size;
    }

    return total;
}

async function collectFiles(directory){
    const entries = await readdir(directory, {
        withFileTypes: true
    });
    const files = [];

    for(const entry of entries){
        const path = join(directory, entry.name);

        if(entry.isDirectory()){
            files.push(...await collectFiles(path));
        }else{
            files.push(path);
        }
    }

    return files;
}

async function hasPath(path){
    try{
        await lstat(path);
        return true;
    }catch(error){
        if(error?.code === "ENOENT"){
            return false;
        }
        throw error;
    }
}

function isInsidePublicRoot(path){
    const root = `${resolve(PUBLIC_ROOT)}${sep}`;
    const target = resolve(path);
    return target === resolve(PUBLIC_ROOT) || target.startsWith(root);
}

function toProjectPath(path){
    return relative(PROJECT_ROOT, path).split(sep).join("/");
}

function formatBytes(value){
    return `${Math.round(value / 1024)} KiB`;
}
