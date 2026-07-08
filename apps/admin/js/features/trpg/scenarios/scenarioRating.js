const R18_ALIASES = new Set([
    "18",
    "18+",
    "18禁",
    "adult",
    "adults-only",
    "explicit",
    "hard",
    "mature",
    "nsfw",
    "restricted",
    "成人向け"
]);

export function normalizeScenarioRating(value){
    const token = normalizeRatingToken(value);

    if(isR18Token(token)){
        return "r18";
    }

    return "all";
}

function isR18Token(token){
    if(!token){
        return false;
    }

    const compact = token.replace(/[\s_‐‑‒–—―−-]/g, "");

    return R18_ALIASES.has(token) ||
        compact.includes("r18") ||
        compact.includes("18禁") ||
        compact.includes("成人向け");
}

function normalizeRatingToken(value){
    return String(value ?? "")
        .normalize("NFKC")
        .trim()
        .toLowerCase();
}
