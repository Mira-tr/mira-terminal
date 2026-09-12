import { readFile, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { spawnSync } from "node:child_process";

const PACKAGE_SCHEMA_VERSION = 1;
const PACKAGE_MODULE = "public-snapshot-package";
const ALLOWED_TARGETS = new Map([
    ["home", { filename: "public-home.json", destination: "apps/web/data/public-home.json" }],
    ["projects", { filename: "public-games.json", destination: "apps/web/game/data/public-games.json" }],
    ["tools", { filename: "public-tools.json", destination: "apps/web/tools/data/public-tools.json" }],
    ["notes", { filename: "public-notes.json", destination: "apps/web/notes/data/public-notes.json" }],
    ["creators", { filename: "public-creators.json", destination: "apps/web/data/public-creators.json" }],
    ["profile", { filename: "public-profile.json", destination: "apps/web/data/public-profile.json" }],
    ["trpg-scenarios", { filename: "public-scenarios.json", destination: "apps/web/data/creators/chikage/trpg/public-scenarios.json" }],
    ["house-rules", { filename: "house-rules.json", destination: "apps/web/data/creators/chikage/trpg/house-rules.json" }]
]);
const ADMIN_ONLY_FIELDS = new Set(["memo", "status", "createdAt", "updatedAt"]);
const SAFE_EXTERNAL_PROTOCOLS = new Set(["http:", "https:"]);

const packagePath = process.argv[2];
if(!packagePath){
    console.error("Usage: node scripts/apply-public-package.mjs <relmua-public-snapshots-*.json> [--no-build]");
    process.exit(1);
}

const root = process.cwd();
const fullPackagePath = resolve(root, packagePath);
const payload = JSON.parse(await readFile(fullPackagePath, "utf8"));
validatePackage(payload);

for(const file of payload.files){
    const destination = resolve(root, file.destination);
    assertInsideRepository(root, destination);
    await writeFile(destination, `${JSON.stringify(file.payload, null, 2)}\n`, "utf8");
    console.log(`updated ${file.destination}`);
}

if(!process.argv.includes("--no-build")){
    const result = spawnSync(process.execPath, ["scripts/build-public.mjs"], {
        cwd: root,
        stdio: "inherit"
    });
    if(result.status !== 0){
        process.exit(result.status || 1);
    }
}

console.log("\nPublic snapshots applied and verified.");
console.log("Next: review git diff, then commit and push to main/PR. GitHub Pages publishes from the repository pipeline.");

function validatePackage(pack){
    if(!pack || typeof pack !== "object") throw new Error("Invalid public snapshot package.");
    if(pack.schemaVersion !== PACKAGE_SCHEMA_VERSION) throw new Error("Unsupported public snapshot package schemaVersion.");
    if(pack.module !== PACKAGE_MODULE) throw new Error("Invalid public snapshot package module.");
    if(!Array.isArray(pack.files) || pack.files.length !== ALLOWED_TARGETS.size){
        throw new Error(`Public snapshot package must contain ${ALLOWED_TARGETS.size} files.`);
    }

    const seen = new Set();
    for(const file of pack.files){
        const expected = ALLOWED_TARGETS.get(file?.targetId);
        if(!expected) throw new Error(`Unknown public target: ${file?.targetId || "unknown"}`);
        if(seen.has(file.targetId)) throw new Error(`Duplicate public target: ${file.targetId}`);
        seen.add(file.targetId);
        if(file.filename !== expected.filename) throw new Error(`Filename mismatch for ${file.targetId}.`);
        if(file.destination !== expected.destination) throw new Error(`Destination mismatch for ${file.targetId}.`);
        if(!String(file.destination).startsWith("apps/web/")) throw new Error(`Destination must stay inside apps/web: ${file.destination}`);
        assertPublicSafe(file.payload, file.targetId);
    }
    for(const targetId of ALLOWED_TARGETS.keys()){
        if(!seen.has(targetId)) throw new Error(`Missing public target: ${targetId}`);
    }
}

function assertPublicSafe(value, path){
    if(Array.isArray(value)){
        value.forEach((item, index) => assertPublicSafe(item, `${path}[${index}]`));
        return;
    }
    if(!value || typeof value !== "object") return;
    for(const [key, item] of Object.entries(value)){
        if(ADMIN_ONLY_FIELDS.has(key)) throw new Error(`${path}.${key} is an Admin-only field.`);
        if(key === "url" && String(item || "").trim()){
            assertSafeExternalUrl(item, `${path}.${key}`);
        }
        assertPublicSafe(item, `${path}.${key}`);
    }
}

function assertSafeExternalUrl(value, path){
    let url;
    try{
        url = new URL(String(value));
    }catch{
        throw new Error(`${path} must be an absolute http/https URL.`);
    }
    if(!SAFE_EXTERNAL_PROTOCOLS.has(url.protocol)){
        throw new Error(`${path} must use http or https.`);
    }
}

function assertInsideRepository(rootPath, targetPath){
    const path = relative(rootPath, targetPath);
    if(path.startsWith("..") || path.startsWith("/")){
        throw new Error(`Refusing to write outside repository: ${targetPath}`);
    }
}
