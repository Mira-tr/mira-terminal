export function createActiveFilterItems(filters = {}){
    const items = [];
    const keyword = normalizeText(filters.keyword);

    if(keyword){
        items.push({
            type: "keyword",
            label: `キーワード: ${keyword}`
        });
    }

    const author = normalizeText(filters.author);

    if(author){
        items.push({
            type: "author",
            label: `作者: ${author}`
        });
    }

    appendChoice(items, "system", "システム", filters.system);
    appendChoice(items, "players", "人数", filters.players);
    appendChoice(items, "time", "時間", filters.time);
    appendChoice(items, "rating", "年齢区分", filters.rating);

    if(filters.favoriteOnly){
        items.push({
            type: "favoriteOnly",
            label: "お気に入りのみ"
        });
    }

    normalizeTags(filters.tags).forEach(tag=>{
        items.push({
            type: "tag",
            value: tag,
            label: `#${tag}`
        });
    });

    if(
        normalizeText(filters.sort?.value) &&
        filters.sort.value !== "recommended"
    ){
        appendChoice(items, "sort", "並び順", filters.sort);
    }

    return items;
}

export function renderActiveFilters(container, filters, onRemove){
    const items = createActiveFilterItems(filters);

    if(items.length === 0){
        container.replaceChildren();
        container.hidden = true;
        return 0;
    }

    const label = document.createElement("span");
    label.className = "active-filter-label";
    label.textContent = "適用中";

    const list = document.createElement("div");
    list.className = "active-filter-list";

    const fragment = document.createDocumentFragment();

    items.forEach(item=>{
        fragment.appendChild(
            createActiveFilterButton(item, onRemove)
        );
    });

    list.appendChild(fragment);
    container.replaceChildren(label, list);
    container.hidden = false;

    return items.length;
}

function createActiveFilterButton(item, onRemove){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "active-filter-chip";
    button.textContent = `${item.label} ×`;
    button.setAttribute("aria-label", `${item.label}を解除`);

    button.addEventListener("click", ()=>{
        if(typeof onRemove === "function"){
            onRemove(item);
        }
    });

    return button;
}

function appendChoice(items, type, prefix, choice){
    const value = normalizeText(choice?.value);

    if(!value){
        return;
    }

    const label = normalizeText(choice?.label) || value;

    items.push({
        type,
        label: `${prefix}: ${label}`
    });
}

function normalizeTags(value){
    if(!Array.isArray(value)){
        return [];
    }

    return [
        ...new Set(
            value
            .map(normalizeText)
            .filter(Boolean)
        )
    ];
}

function normalizeText(value){
    return String(value ?? "").trim();
}
