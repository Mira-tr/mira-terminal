export function createCreatorEditRoute(currentUrl, creatorId){
    const url = new URL(currentUrl, "http://localhost");
    const normalizedId = String(creatorId || "").trim();

    if(normalizedId){
        url.searchParams.set("creator", normalizedId);
        url.hash = "formTitle";
    }else{
        url.searchParams.delete("creator");
        if(url.hash === "#formTitle"){
            url.hash = "";
        }
    }

    return `${url.pathname}${url.search}${url.hash}`;
}
