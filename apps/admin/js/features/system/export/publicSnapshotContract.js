export const PUBLIC_SNAPSHOT_SCHEMA_VERSION = 1;
export const PUBLIC_SNAPSHOT_VERSION = "1.0.0";
export const PUBLIC_SNAPSHOT_EXPORT_TYPE = "public-snapshot-package";

export const PUBLIC_SNAPSHOT_TARGETS = Object.freeze([
    createTarget("home", "public-home.json", "apps/web/data/public-home.json"),
    createTarget("projects", "public-games.json", "apps/web/game/data/public-games.json"),
    createTarget("tools", "public-tools.json", "apps/web/tools/data/public-tools.json"),
    createTarget("notes", "public-notes.json", "apps/web/notes/data/public-notes.json"),
    createTarget("creators", "public-creators.json", "apps/web/data/public-creators.json"),
    createTarget("profile", "public-profile.json", "apps/web/data/public-profile.json"),
    createTarget("trpg-scenarios", "public-scenarios.json", "apps/web/data/creators/chikage/trpg/public-scenarios.json"),
    createTarget("house-rules", "house-rules.json", "apps/web/data/creators/chikage/trpg/house-rules.json")
]);

const ADMIN_ONLY_FIELDS = new Set([
    "status",
    "memo",
    "createdAt",
    "updatedAt",
    "created_at",
    "updated_at",
    "owner_user_id",
    "ownerUserId",
    "created_by",
    "user_id",
    "role"
]);

export function getPublicSnapshotTarget(id){
    return PUBLIC_SNAPSHOT_TARGETS.find(target => target.id === id) || null;
}

export function validatePublicSnapshotPackage(value){
    if(!value || typeof value !== "object" || Array.isArray(value)){
        throw new Error("公開用データセットの形式が正しくありません。");
    }

    if(value.exportType !== PUBLIC_SNAPSHOT_EXPORT_TYPE){
        throw new Error("公開用データセットとして認識できないファイルです。");
    }

    if(value.schemaVersion !== PUBLIC_SNAPSHOT_SCHEMA_VERSION){
        throw new Error(`未対応の公開用データ形式です: schema ${value.schemaVersion}`);
    }

    if(!Array.isArray(value.files)){
        throw new Error("公開用データの一覧が見つかりません。");
    }

    const expectedIds = new Set(PUBLIC_SNAPSHOT_TARGETS.map(target => target.id));
    const seen = new Set();

    value.files.forEach(file => {
        if(!file || typeof file !== "object" || Array.isArray(file)){
            throw new Error("公開用データに壊れた項目があります。");
        }

        const target = getPublicSnapshotTarget(file.id);
        if(!target){
            throw new Error(`許可されていない公開先が含まれています: ${file.id || "(不明)"}`);
        }
        if(seen.has(file.id)){
            throw new Error(`公開用データが重複しています: ${file.id}`);
        }
        if(file.filename !== target.filename || file.destination !== target.destination){
            throw new Error(`公開先が正規の場所と一致しません: ${file.id}`);
        }

        assertPublicPayloadSafe(file.payload, file.id);
        seen.add(file.id);
    });

    if(seen.size !== expectedIds.size || [...expectedIds].some(id => !seen.has(id))){
        throw new Error("公開用データセットに不足があります。8種類すべてを作り直してください。");
    }

    return true;
}

export function assertPublicPayloadSafe(value, targetId = "public"){
    visit(value, targetId);
    return true;
}

function visit(value, path){
    if(Array.isArray(value)){
        value.forEach((item, index) => visit(item, `${path}[${index}]`));
        return;
    }

    if(!value || typeof value !== "object"){
        return;
    }

    Object.entries(value).forEach(([key, child]) => {
        if(ADMIN_ONLY_FIELDS.has(key)){
            throw new Error(`管理画面専用の情報が公開用データに混ざっています: ${path}.${key}`);
        }
        visit(child, `${path}.${key}`);
    });
}

function createTarget(id, filename, destination){
    return Object.freeze({ id, filename, destination });
}
