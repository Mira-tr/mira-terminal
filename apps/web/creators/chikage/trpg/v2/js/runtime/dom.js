export function sectionBlock(label, children, extraClassName = ""){
    return el("section", {
        className: `v2-app-block ${extraClassName}`.trim()
    }, [
        el("p", {
            className: "v2-row-label"
        }, label),
        ...children
    ]);
}

export function emptyState(message){
    return el("p", {
        className: "v2-empty-state"
    }, message);
}

export function feedbackMessage(feedback){
    return el("p", {
        className: `v2-form-feedback v2-form-feedback--${feedback.kind === "success" ? "success" : "error"}`,
        role: feedback.kind === "error" ? "alert" : "status"
    }, feedback.text);
}

export function field(label, name, type, attrs = {}){
    return el("label", {}, [
        el("span", {}, label),
        el("input", {
            name,
            type,
            ...attrs
        })
    ]);
}

export function textareaField(label, name, placeholder){
    return el("label", {}, [
        el("span", {}, label),
        el("textarea", {
            name,
            rows: 3,
            maxLength: 2000,
            placeholder
        })
    ]);
}

export function el(tagName, attrs = {}, children = []){
    const node = document.createElement(tagName);

    Object.entries(attrs).forEach(([key, value]) => {
        if(value === null || value === undefined || value === false){
            return;
        }

        if(key === "className"){
            node.className = value;
            return;
        }

        if(key === "onClick"){
            node.addEventListener("click", value);
            return;
        }

        if(key === "onSubmit"){
            node.addEventListener("submit", value);
            return;
        }

        if(key === "onChange"){
            node.addEventListener("change", value);
            return;
        }

        if(key === "onToggle"){
            node.addEventListener("toggle", value);
            return;
        }

        if(key in node){
            node[key] = value;
            return;
        }

        node.setAttribute(key, String(value));
    });

    const items = Array.isArray(children) ? children : [children];
    items.forEach(child => {
        if(child === null || child === undefined){
            return;
        }

        node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });

    return node;
}
