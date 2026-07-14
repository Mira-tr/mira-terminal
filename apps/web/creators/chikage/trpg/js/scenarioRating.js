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

const ALL_ALIASES = new Set([
    "all",
    "general",
    "general-audience",
    "全年齢"
]);

export function normalizeRating(value){
    return normalizeRatingFilter(value) || "all";
}

export function normalizeRatingFilter(value){
    const token = normalizeRatingToken(value);

    if(!token){
        return "";
    }

    if(isR18Token(token)){
        return "r18";
    }

    if(ALL_ALIASES.has(token)){
        return "all";
    }

    return "";
}

export function ratingText(value){
    return normalizeRating(value) === "r18"
        ? "R18"
        : "全年齢";
}

export function ratingClass(value){
    return normalizeRating(value) === "r18"
        ? "is-r18"
        : "";
}

function isR18Token(token){
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
