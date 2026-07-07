// =====================
// Storage Keys
// =====================

export const STORAGE_KEY = "mira_terminal_scenarios";
export const TAG_KEY = "mira_terminal_tags";
export const AUTHOR_KEY = "mira_terminal_authors";
export const PROFILE_KEY = "mira_terminal_profile";
export const RULES_KEY = "mira_terminal_rules";
export const GAME_KEY = "mira_terminal_games";

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