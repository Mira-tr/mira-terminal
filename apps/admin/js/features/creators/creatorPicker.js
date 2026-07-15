import {
    getCreators
} from "./creatorStore.js";

export function populateCreatorPicker(selectOrId, options = {}){
    const select = typeof selectOrId === "string"
        ? document.getElementById(selectOrId)
        : selectOrId;

    if(!select) return;

    const collection = getCreators();
    const current = new Set(
        select.multiple
            ? [...select.selectedOptions].map(option => option.value)
            : [select.value].filter(Boolean)
    );
    const nodes = [];

    if(!select.multiple && options.allowEmpty !== false){
        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = options.emptyLabel || "Primary Creatorを使用";
        nodes.push(empty);
    }

    collection.creators
        .slice()
        .sort((a, b) => a.order - b.order)
        .forEach(creator => {
            const option = document.createElement("option");
            option.value = creator.id;
            option.textContent = `${creator.displayName}（${creator.status}）`;
            option.selected = current.has(creator.id)
                || !current.size && options.selectPrimary && creator.id === collection.primaryCreatorId;
            nodes.push(option);
        });

    select.replaceChildren(...nodes);
}
