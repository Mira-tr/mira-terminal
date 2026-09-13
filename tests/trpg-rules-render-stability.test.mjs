import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const CLARITY_URL = new URL(
    "../apps/web/creators/chikage/trpg/rules/js/rulesClarity.js",
    import.meta.url
);

function createObservedText(initialValue){
    let value = String(initialValue);
    let writes = 0;
    const observers = [];
    const node = {
        _observers: observers,
        get textContent(){
            return value;
        },
        set textContent(next){
            writes += 1;
            if(writes > 20){
                throw new Error("MutationObserver feedback loop detected");
            }
            value = String(next);
            [...observers].forEach(callback => callback([]));
        },
        get writes(){
            return writes;
        },
        remove(){}
    };
    return node;
}

class FakeMutationObserver{
    constructor(callback){
        this.callback = callback;
        this.target = null;
    }

    observe(target){
        this.target = target;
        target?._observers?.push(this.callback);
    }

    disconnect(){
        if(!this.target?._observers){
            return;
        }
        const index = this.target._observers.indexOf(this.callback);
        if(index >= 0){
            this.target._observers.splice(index, 1);
        }
        this.target = null;
    }
}

test("House Rules clarity observers settle after category/search status updates", async () => {
    const source = await readFile(CLARITY_URL, "utf8");
    const status = createObservedText("CoC6版 / 30 rules");
    const toggle = createObservedText("すべて開く");
    const shell = {
        dataset: {},
        classList: { toggle(){} },
        querySelector(selector){
            if(selector === ".rules-scope") return null;
            if(selector === "#rulesQuickModeBtn") return null;
            if(selector === "#rulesToggleAllBtn") return toggle;
            if(selector === "#rulesSearchStatus") return status;
            return null;
        },
        querySelectorAll(selector){
            if(selector === ".rules-system-button") return [{}];
            if(selector === ".rule-section[open]") return [];
            return [];
        }
    };
    const root = {
        querySelector(selector){
            return selector === ".rules-v5-shell" ? shell : null;
        }
    };
    const context = vm.createContext({
        document: {
            querySelector(selector){
                return selector === "#rulesApp" ? root : null;
            }
        },
        window: { location: { hash: "" } },
        MutationObserver: FakeMutationObserver
    });

    vm.runInContext(source, context);

    assert.equal(status.textContent, "CoC6版 / 30項目");
    assert.equal(toggle.textContent, "すべて展開");

    const statusWrites = status.writes;
    status.textContent = "CoC6版 / 基本 / 4件";
    assert.equal(status.textContent, "CoC6版 / 基本 / 4件");
    assert.equal(status.writes, statusWrites + 1, "already-normalized status must not rewrite itself");

    status.textContent = "全System / 3 rules";
    assert.equal(status.textContent, "全システム / 3項目");
    assert.equal(status.writes, statusWrites + 3, "changed status should normalize once and then settle");

    const toggleWrites = toggle.writes;
    toggle.textContent = "すべて開く";
    assert.equal(toggle.textContent, "すべて展開");
    assert.equal(toggle.writes, toggleWrites + 2, "toggle normalization should also settle after one rewrite");
});
