// =====================
// Storage Keys
// =====================

export const STORAGE_KEY =
    "mira_terminal_scenarios";

export const TAG_KEY =
    "mira_terminal_tags";

export const AUTHOR_KEY =
    "mira_terminal_authors";


// =====================
// Load
// =====================

export function load(key, defaultValue){

    return (
        JSON.parse(
            localStorage.getItem(key)
        )
        ||
        defaultValue
    );

}


// =====================
// Save
// =====================

export function save(key,data){

    localStorage.setItem(
        key,
        JSON.stringify(data)
    );

}