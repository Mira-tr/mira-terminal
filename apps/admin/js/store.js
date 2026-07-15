// =====================
// Storage Keys
// =====================

export const STORAGE_KEY = "mira_terminal_scenarios";
export const TAG_KEY = "mira_terminal_tags";
export const AUTHOR_KEY = "mira_terminal_authors";
export const PROFILE_KEY = "mira_terminal_profile";
export const CREATORS_KEY = "mira_terminal_creators";
export const RULES_KEY = "mira_terminal_rules";
export const GAME_KEY = "mira_terminal_games";
export const TOOLS_KEY = "mira_terminal_tools";
export const NOTES_KEY = "mira_terminal_notes";
export const HOME_CONFIG_KEY = "mira_terminal_home_config";
export const LAST_BACKUP_EXPORT_KEY = "mira_terminal_last_backup_at";
export const LAST_PUBLIC_EXPORT_KEY = "mira_terminal_last_public_export";

// =====================
// Load
// =====================

export function load(key, defaultValue){
    const raw = localStorage.getItem(key);

    if(raw === null){
        return defaultValue;
    }

    try{
        const parsed = JSON.parse(raw);
        return parsed ?? defaultValue;
    }catch(error){
        console.warn(`[storage] Failed to parse ${key}`, error);
        return defaultValue;
    }
}

// =====================
// Save
// =====================

export function save(key, data){
    try{
        localStorage.setItem(
            key,
            JSON.stringify(data)
        );
        return true;
    }catch(error){
        console.error(`[storage] Failed to save ${key}`, error);
        return false;
    }
}
