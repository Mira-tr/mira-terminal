import {
    showToast
} from "./toastService.js";

export function initCollectionForm(config){
    let editingId = null;
    const byId = id => document.getElementById(id);

    const clear = () => {
        config.fields.forEach(field => {
            byId(field.id).value = field.default ?? "";
        });
        editingId = null;
        byId(config.formTitleId).textContent = config.addTitle;
        byId(config.saveButtonId).textContent = "追加";
        byId(config.cancelButtonId).style.display = "none";
    };

    const values = () => Object.fromEntries(
        config.fields.map(field => [
            field.key,
            byId(field.id).value.trim()
        ])
    );

    const render = () => {
        const container = byId(config.listId);
        const records = config.get()[config.collection]
            .sort((a, b) => a.order - b.order);

        container.replaceChildren();

        if(!records.length){
            const message = document.createElement("p");
            message.className = "panel-note";
            message.textContent = config.emptyText;
            container.appendChild(message);
            return;
        }

        records.forEach(record => container.appendChild(createItem(record)));
    };

    const createItem = record => {
        const item = document.createElement("article");
        item.className = "management-item";

        const header = document.createElement("div");
        header.className = "management-item-header";

        const title = document.createElement("h3");
        title.textContent = record[config.titleKey] || "無題";

        const badge = document.createElement("span");
        badge.className = "status-badge";
        badge.textContent = record.status;

        const summary = document.createElement("p");
        summary.className = "management-item-summary";
        summary.textContent = record[config.summaryKey] || "説明なし";

        const actions = document.createElement("div");
        actions.className = "management-item-actions";

        [
            ["編集", () => edit(record)],
            ["上へ", () => move(record.id, "up")],
            ["下へ", () => move(record.id, "down")],
            ["削除", () => remove(record.id)]
        ].forEach(([label, handler]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "button button-secondary";
            button.textContent = label;
            button.addEventListener("click", handler);
            actions.appendChild(button);
        });

        header.append(title, badge);
        item.append(header, summary, actions);
        return item;
    };

    const edit = record => {
        editingId = record.id;
        config.fields.forEach(field => {
            const value = record[field.key];
            byId(field.id).value = Array.isArray(value)
                ? value.join("\n")
                : value ?? "";
        });
        byId(config.formTitleId).textContent = config.editTitle;
        byId(config.saveButtonId).textContent = "更新";
        byId(config.cancelButtonId).style.display = "inline-block";
        scrollTo({ top: 0, behavior: "smooth" });
    };

    const move = (id, direction) => {
        config.move(id, direction);
        render();
    };

    const remove = id => {
        if(!confirm(config.deleteConfirm)){
            return;
        }

        if(config.remove(id) === false){
            showToast("削除に失敗しました", "error");
            return;
        }

        if(editingId === id){
            clear();
        }

        render();
        showToast("削除しました", "success");
    };

    byId(config.saveButtonId).addEventListener("click", () => {
        const data = values();

        if(!data[config.titleKey]){
            showToast(`入力内容を確認してください：${config.requiredMessage}`, "warning");
            return;
        }

        const isEditing = Boolean(editingId);
        const result = isEditing
            ? config.update(editingId, data)
            : config.add(data);

        if(result === false){
            showToast("保存に失敗しました", "error");
            return;
        }

        clear();
        render();
        showToast(isEditing ? "更新しました" : "保存しました", "success");
    });

    byId(config.addButtonId).addEventListener("click", clear);
    byId(config.cancelButtonId).addEventListener("click", clear);

    clear();
    render();

    return {
        clear,
        refresh: render
    };
}
