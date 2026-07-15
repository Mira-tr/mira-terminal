export const STUDIO_PUBLIC_JSON_MODULES = Object.freeze([
    createModule({
        id: "brand-home",
        title: "Brand Home",
        sourceFile: "apps/web/data/public-home.json",
        publicUrl: "/",
        buildOutput: "dist/data/public-home.json",
        previewUrl: "/"
    }),
    createModule({
        id: "projects",
        title: "Projects",
        sourceFile: "apps/web/game/data/public-games.json",
        publicUrl: "/projects/",
        buildOutput: "dist/game/data/public-games.json",
        previewUrl: "/projects/"
    }),
    createModule({
        id: "tools",
        title: "Tools",
        sourceFile: "apps/web/tools/data/public-tools.json",
        publicUrl: "/tools/",
        buildOutput: "dist/tools/data/public-tools.json",
        previewUrl: "/tools/"
    }),
    createModule({
        id: "notes",
        title: "Notes",
        sourceFile: "apps/web/notes/data/public-notes.json",
        publicUrl: "/notes/",
        buildOutput: "dist/notes/data/public-notes.json",
        previewUrl: "/notes/"
    }),
    createModule({
        id: "creators",
        title: "Creators",
        sourceFile: "apps/web/data/public-creators.json",
        publicUrl: "/creators/",
        buildOutput: "dist/data/public-creators.json",
        previewUrl: "/creators/"
    }),
    createModule({
        id: "profile",
        title: "Chikage Profile",
        sourceFile: "apps/web/data/public-profile.json",
        publicUrl: "/creators/chikage/",
        buildOutput: "dist/data/public-profile.json",
        previewUrl: "/creators/chikage/"
    }),
    createModule({
        id: "trpg",
        title: "Chikage TRPG",
        sourceFile: "apps/web/data/creators/chikage/trpg/public-scenarios.json",
        publicUrl: "/creators/chikage/trpg/",
        buildOutput: "dist/data/creators/chikage/trpg/public-scenarios.json",
        previewUrl: "/creators/chikage/trpg/"
    }),
    createModule({
        id: "house-rules",
        title: "House Rules",
        sourceFile: "apps/web/data/creators/chikage/trpg/house-rules.json",
        publicUrl: "/creators/chikage/trpg/rules/",
        buildOutput: "dist/data/creators/chikage/trpg/house-rules.json",
        previewUrl: "/creators/chikage/trpg/rules/"
    })
]);

export function getStudioPublicJsonModules(){
    return STUDIO_PUBLIC_JSON_MODULES.map(module => ({ ...module }));
}

export function getStudioPublicJsonModule(moduleId){
    return getStudioPublicJsonModules().find(module => module.id === moduleId) || null;
}

export function validatePublicJsonRegistry(modules = getStudioPublicJsonModules()){
    const errors = [];
    const ids = new Set();
    const sourceFiles = new Set();

    modules.forEach(module => {
        if(ids.has(module.id)){
            errors.push(`Duplicate module id: ${module.id}`);
        }
        ids.add(module.id);

        if(sourceFiles.has(module.sourceFile)){
            errors.push(`Duplicate source file: ${module.sourceFile}`);
        }
        sourceFiles.add(module.sourceFile);

        ["id", "title", "sourceFile", "publicUrl", "buildOutput", "previewUrl"].forEach(key => {
            if(!module[key]){
                errors.push(`${module.id || "unknown"} is missing ${key}.`);
            }
        });
    });

    return errors;
}

function createModule({
    id,
    title,
    sourceFile,
    publicUrl,
    buildOutput,
    previewUrl
}){
    return Object.freeze({
        id,
        title,
        sourceFile,
        publicUrl,
        buildOutput,
        previewUrl
    });
}
