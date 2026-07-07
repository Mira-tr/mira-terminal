export function sortScenarios(scenarios, sortType){
    const result = Array.isArray(scenarios)
        ? [...scenarios]
        : [];

    return result.sort((a, b)=>{
        switch(sortType){
            case "title":
                return compareText(a.title, b.title);

            case "author":
                return compareText(a.author, b.author);

            case "timeAsc":
                return compareNumber(a.timeMin, b.timeMin);

            case "timeDesc":
                return compareNumber(b.timeMax, a.timeMax);

            case "playersAsc":
                return compareNumber(a.playersMin, b.playersMin);

            default:
                return compareText(a.title, b.title);
        }
    });
}

function compareText(a, b){
    return String(a ?? "").localeCompare(
        String(b ?? ""),
        "ja"
    );
}

function compareNumber(a, b){
    const left = Number.isFinite(a)
        ? a
        : Number.MAX_SAFE_INTEGER;

    const right = Number.isFinite(b)
        ? b
        : Number.MAX_SAFE_INTEGER;

    return left - right;
}