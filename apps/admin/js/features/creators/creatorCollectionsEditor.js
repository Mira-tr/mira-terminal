export function initCreatorCollectionsEditor(){
    const works = createCollectionEditor({
        containerId: "creatorWorksEditor",
        addButtonId: "addCreatorWorkBtn",
        emptyText: "作品はまだ登録されていません",
        itemName: "作品",
        fields: [
            createField("id", "管理ID", "text", true),
            createField("title", "作品名", "text", true),
            createField("summary", "短い説明", "textarea"),
            createField("url", "作品URL（任意）", "url"),
            createStatusField()
        ]
    });
    const links = createCollectionEditor({
        containerId: "creatorLinksEditor",
        addButtonId: "addCreatorLinkBtn",
        emptyText: "公開連絡先はまだ登録されていません",
        itemName: "公開連絡先",
        fields: [
            createField("id", "管理ID", "text", true),
            createField("label", "表示名", "text", true),
            createField("url", "URL", "url", true),
            createStatusField()
        ]
    });

    return {
        getWorks: works.getItems,
        setWorks: works.setItems,
        getLinks: links.getItems,
        setLinks: links.setItems,
        clear(){
            works.setItems([]);
            links.setItems([]);
        }
    };
}

function createCollectionEditor({
    containerId,
    addButtonId,
    emptyText,
    itemName,
    fields
}){
    const container = document.getElementById(containerId);
    const addButton = document.getElementById(addButtonId);
    let items = [];

    const render = () => {
        container.replaceChildren();

        if(items.length === 0){
            const message = document.createElement("p");
            message.className = "panel-note";
            message.textContent = emptyText;
            container.appendChild(message);
            return;
        }

        items.forEach((item, index) => {
            container.appendChild(createEditorItem({
                item,
                index,
                itemName,
                fields,
                onChange(field, value){
                    items[index] = {
                        ...items[index],
                        [field]: value
                    };
                },
                onMove(direction){
                    const nextIndex = index + direction;
                    if(nextIndex < 0 || nextIndex >= items.length){
                        return;
                    }
                    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
                    render();
                },
                onRemove(){
                    items.splice(index, 1);
                    render();
                }
            }));
        });
    };

    addButton.addEventListener("click", () => {
        items.push({
            id: "",
            status: "private"
        });
        render();
        container.lastElementChild?.querySelector("input")?.focus();
    });

    render();

    return {
        getItems(){
            return items.map((item, index) => ({
                ...item,
                order: index + 1
            }));
        },
        setItems(nextItems){
            items = (Array.isArray(nextItems) ? nextItems : [])
                .map(item => ({ ...item }));
            render();
        }
    };
}

function createEditorItem({
    item,
    index,
    itemName,
    fields,
    onChange,
    onMove,
    onRemove
}){
    const fieldset = document.createElement("fieldset");
    fieldset.className = "creator-collection-item";

    const legend = document.createElement("legend");
    legend.textContent = `${itemName} ${index + 1}`;
    fieldset.appendChild(legend);

    fields.forEach(field => {
        const wrapper = document.createElement("div");
        wrapper.className = "form-field";
        const label = document.createElement("label");
        const inputId = `${itemName}-${index}-${field.name}`;

        label.htmlFor = inputId;
        label.textContent = `${field.label}${field.required ? "（必須）" : ""}`;

        const input = field.type === "textarea"
            ? document.createElement("textarea")
            : field.type === "select"
                ? document.createElement("select")
                : document.createElement("input");

        input.id = inputId;
        input.dataset.field = field.name;

        if(field.type === "select"){
            field.options.forEach(option => {
                const element = document.createElement("option");
                element.value = option.value;
                element.textContent = option.label;
                input.appendChild(element);
            });
        }else if(field.type !== "textarea"){
            input.type = field.type;
        }

        input.required = field.required;
        input.value = String(item[field.name] || field.defaultValue || "");
        input.addEventListener("input", () => onChange(field.name, input.value));
        input.addEventListener("change", () => onChange(field.name, input.value));
        wrapper.append(label, input);
        fieldset.appendChild(wrapper);
    });

    const actions = document.createElement("div");
    actions.className = "management-item-actions";
    [
        ["上へ", () => onMove(-1)],
        ["下へ", () => onMove(1)],
        ["削除", onRemove]
    ].forEach(([label, handler]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button button-secondary";
        button.textContent = label;
        button.addEventListener("click", handler);
        actions.appendChild(button);
    });
    fieldset.appendChild(actions);

    return fieldset;
}

function createField(name, label, type, required = false){
    return {
        name,
        label,
        type,
        required
    };
}

function createStatusField(){
    return {
        name: "status",
        label: "公開状態",
        type: "select",
        defaultValue: "private",
        required: true,
        options: [
            { value: "public", label: "Public" },
            { value: "private", label: "Private" }
        ]
    };
}
