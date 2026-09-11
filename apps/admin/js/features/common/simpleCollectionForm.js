import {
    showToast
} from "./toastService.js";

export function initCollectionForm(config){
    let editingId = null;
    let mutating = false;
    const byId = id => document.getElementById(id);

    const clear = () => {
        config.fields.forEach(field => {
            writeFieldValue(byId(field.id), field.default ?? "");
        });
        editingId = null;
        byId(config.formTitleId).textContent = config.addTitle;
        byId(config.saveButtonId).textContent = "追加";
        byId(config.cancelButtonId).style.display = "none";
    };

    const values = () => Object.fromEntries(
        config.fields.map(field => [
            field.key,
            readFieldValue(byId(field.id))
        ])
    );

    const render = () => {
        const container = byId(config.listId);
        const records = config.get()[config.collection]
            .slice()
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
            writeFieldValue(byId(field.id), value ?? "");
        });
        byId(config.formTitleId).textContent = config.editTitle;
        byId(config.saveButtonId).textContent = "更新";
        byId(config.cancelButtonId).style.display = "inline-block";
        scrollTo({ top: 0, behavior: "smooth" });
    };

    const move = async (id, direction) => {
        const success = await runMutation(
            () => config.move(id, direction),
            "並び替えに失敗しました"
        );
        if(success){
            render();
        }
    };

    const remove = async id => {
        if(!confirm(config.deleteConfirm)){
            return;
        }

        const success = await runMutation(
            () => config.remove(id),
            "削除に失敗しました"
        );
        if(!success){
            return;
        }

        if(editingId === id){
            clear();
        }

        render();
        showToast("削除しました", "success");
    };

    byId(config.saveButtonId).addEventListener("click", async () => {
        const data = values();

        if(!data[config.titleKey]){
            showToast(`入力内容を確認してください：${config.requiredMessage}`, "warning");
            return;
        }

        const isEditing = Boolean(editingId);
        const success = await runMutation(
            () => isEditing
                ? config.update(editingId, data)
                : config.add(data),
            "保存に失敗しました"
        );

        if(!success){
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

    const ready = typeof config.hydrate === "function"
        ? Promise.resolve()
            .then(() => config.hydrate())
            .then(result => {
                render();
                return result;
            })
            .catch(error => {
                console.warn(`[admin] Failed to hydrate ${config.collection}`, error);
                showToast(
                    error?.message || "DBからデータを読み込めませんでした。この端末のcacheを表示しています。",
                    "warning"
                );
                return false;
            })
        : Promise.resolve(true);

    return {
        clear,
        refresh: render,
        ready
    };

    async function runMutation(operation, failureMessage){
        if(mutating){
            return false;
        }

        mutating = true;
        try{
            const result = await Promise.resolve().then(operation);
            if(result === false){
                showToast(failureMessage, "error");
                return false;
            }
            return true;
        }catch(error){
            console.error(`[admin] ${config.collection} mutation failed`, error);
            showToast(error?.message || failureMessage, "error");
            return false;
        }finally{
            mutating = false;
        }
    }
}

function readFieldValue(element){
    if(element.tagName === "SELECT" && element.multiple){
        return [...element.selectedOptions].map(option => option.value);
    }

    return element.value.trim();
}

function writeFieldValue(element, value){
    if(element.tagName === "SELECT" && element.multiple){
        const selected = new Set(Array.isArray(value) ? value : String(value || "").split(/[\n,]/));
        [...element.options].forEach(option => {
            option.selected = selected.has(option.value);
        });
        return;
    }

    element.value = Array.isArray(value) ? value[0] || "" : value;
}
