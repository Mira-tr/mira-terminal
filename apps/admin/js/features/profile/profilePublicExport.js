import {
    getProfile
} from "./profileStore.js";

const APP_NAME = "MIRA Terminal";
const MODULE_NAME = "site";
const EXPORT_TYPE = "public-profile";
const EXPORT_VERSION = "1.0.0";
const SCHEMA_VERSION = 1;

export function exportPublicProfile(){
    const profile = getProfile();
    
    const exportData = {
        app: APP_NAME,
        module: MODULE_NAME,
        exportType: EXPORT_TYPE,
        exportVersion: EXPORT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        profile: {
            displayName: profile.displayName || "",
            bio: profile.bio || "",
            activities: profile.activities || [],
            links: (profile.links || [])
                .filter(link => link.status === "public")
                .map(link => ({
                    id: link.id,
                    label: link.label,
                    url: link.url,
                    type: link.type,
                    order: link.order
                }))
                .sort((a, b) => a.order - b.order)
        }
    };
    
    const blob = new Blob(
        [JSON.stringify(exportData, null, 2)],
        { type: "application/json" }
    );
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "public-profile.json";
    a.click();
    URL.revokeObjectURL(url);
}
