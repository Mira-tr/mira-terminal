import test from "node:test";
import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("Toastはaria-live領域に積み上がり短時間の重複を抑える", async () => {
    const document = createDocument();
    globalThis.document = document;

    const {
        clearToasts,
        initToastService,
        runToastOperation,
        showToast
    } = await import("../apps/admin/js/features/common/toastService.js");

    try{
        const container = initToastService();
        const first = showToast("保存しました", "success", { duration: 0 });
        const duplicate = showToast("保存しました", "success", { duration: 0 });
        const error = showToast("保存に失敗しました", "error", { duration: 0 });

        assert.equal(container.getAttribute("aria-live"), "polite");
        assert.equal(container.getAttribute("aria-atomic"), "false");
        assert.equal(container.children.length, 2);
        assert.equal(first, duplicate);
        assert.equal(first.dataset.toastType, "success");
        assert.equal(error.dataset.toastType, "error");

        const closeButton = first.children[1];
        assert.equal(closeButton.type, "button");
        assert.match(closeButton.getAttribute("aria-label"), /通知を閉じる/);
        closeButton.dispatchEvent({ type: "click" });
        assert.equal(container.children.length, 1);

        error.dispatchEvent({ type: "keydown", key: "Escape" });
        assert.equal(container.children.length, 0);

        const originalConsoleError = console.error;
        console.error = () => {};

        try{
            const result = runToastOperation(
                () => {
                    throw new Error("storage failed");
                },
                { errorMessage: "保存に失敗しました" }
            );

            assert.equal(result, false);
            assert.equal(container.children.length, 1);
            assert.equal(container.children[0].dataset.toastType, "error");
        }finally{
            console.error = originalConsoleError;
        }

        clearToasts();
    }finally{
        delete globalThis.document;
    }
});

test("Toastの表示時間と390px以下の余白が定義されている", async () => {
    const service = await read("apps/admin/js/features/common/toastService.js");
    const css = await read("apps/admin/css/components/toast.css");
    const style = await read("apps/admin/css/style.css");

    assert.match(service, /success:\s*3000/);
    assert.match(service, /info:\s*3000/);
    assert.match(service, /error:\s*5000/);
    assert.match(service, /DUPLICATE_WINDOW\s*=\s*1000/);
    assert.match(css, /@media \(max-width: 390px\)/);
    assert.match(css, /left:\s*16px/);
    assert.match(css, /right:\s*16px/);
    assert.match(css, /flex-direction:\s*column/);
    assert.ok(style.includes('@import "./components/toast.css"'));
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function createDocument(){
    const document = {
        createElement: tagName => new FakeElement(tagName),
        querySelector(selector){
            return find(this.body, selector);
        }
    };

    document.body = new FakeElement("body");
    document.body.connected = true;
    return document;
}

function find(element, selector){
    if(selector.startsWith(".") && element.className.split(" ").includes(selector.slice(1))){
        return element;
    }

    for(const child of element.children){
        const match = find(child, selector);

        if(match){
            return match;
        }
    }

    return null;
}

class FakeElement {
    constructor(tagName){
        this.tagName = tagName.toUpperCase();
        this.children = [];
        this.parentElement = null;
        this.className = "";
        this.dataset = {};
        this.attributes = new Map();
        this.listeners = new Map();
        this.textContent = "";
        this.type = "";
        this.connected = false;
    }

    get isConnected(){
        return this.connected || Boolean(this.parentElement?.isConnected);
    }

    append(...children){
        children.forEach(child => this.appendChild(child));
    }

    appendChild(child){
        child.parentElement = this;
        this.children.push(child);
        return child;
    }

    replaceChildren(...children){
        this.children.forEach(child => {
            child.parentElement = null;
        });
        this.children = [];
        this.append(...children);
    }

    remove(){
        if(!this.parentElement){
            return;
        }

        this.parentElement.children = this.parentElement.children
            .filter(child => child !== this);
        this.parentElement = null;
    }

    setAttribute(name, value){
        this.attributes.set(name, String(value));
    }

    getAttribute(name){
        return this.attributes.get(name) ?? null;
    }

    addEventListener(type, listener){
        const listeners = this.listeners.get(type) || [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
    }

    dispatchEvent(event){
        event.preventDefault ||= () => {};
        (this.listeners.get(event.type) || []).forEach(listener => listener(event));
    }
}
