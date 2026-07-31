import {
    isSafeHttpUrl
} from "../../utils.js";

export function validateCreatorContent(creator){
    const errors = [
        ...validateWorks(creator?.works),
        ...validateLinks(creator?.links)
    ];

    if(errors.length){
        throw new Error(errors.join("\n"));
    }

    return true;
}

function validateWorks(works){
    return validateItems(works, "作品", item => {
        const errors = [];
        if(!text(item.title)){
            errors.push("作品名は必須です");
        }
        const url = text(item.url);
        if(url && !isSafeHttpUrl(url)){
            errors.push("作品URLはhttpまたはhttpsで入力してください");
        }
        return errors;
    });
}

function validateLinks(links){
    return validateItems(links, "公開連絡先", item => {
        const errors = [];
        if(!text(item.label)){
            errors.push("表示名は必須です");
        }
        if(!isSafeHttpUrl(text(item.url))){
            errors.push("URLはhttpまたはhttpsで入力してください");
        }
        return errors;
    });
}

function validateItems(items, label, validateItem){
    const source = Array.isArray(items) ? items : [];
    const ids = new Set();
    const errors = [];

    source.forEach((item, index) => {
        const prefix = `${label}${index + 1}`;
        const id = text(item?.id);
        if(!id){
            errors.push(`${prefix}: 管理IDは必須です`);
        }else if(ids.has(id)){
            errors.push(`${prefix}: 管理IDが重複しています`);
        }else{
            ids.add(id);
        }

        validateItem(item).forEach(error => errors.push(`${prefix}: ${error}`));
    });

    return errors;
}

function text(value){
    return String(value || "").trim();
}
