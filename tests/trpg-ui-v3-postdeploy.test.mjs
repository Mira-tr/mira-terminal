import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("TRPG shared style loads the scoped post-deploy readability layer", async () => {
    const style = await read("apps/web/creators/chikage/trpg/css/style.css");
    const polish = await read("apps/web/creators/chikage/trpg/css/trpg-ui-v3-postdeploy.css");

    assert.match(style, /trpg-ui-v3-postdeploy\.css/);
    assert.match(polish, /body\.trpg-v3 \.trpg-mobile-dock a/);
    assert.match(polish, /font-size:\s*\.78rem/);
    assert.match(polish, /body\.trpg-v3 input,[\s\S]*font-size:\s*16px/);
    assert.match(polish, /body\.trpg-v3 \.modal-close-button[\s\S]*min-height:\s*44px/);
    assert.match(polish, /body\.trpg-v3 \.modal-panel[\s\S]*max-height:\s*94dvh/);
    assert.doesNotMatch(polish, /(^|\n)body\s*\{/);
    assert.doesNotMatch(polish, /(^|\n)(?!body\.trpg-v3)[.#]?(?:modal|picker|scenario|cx-calendar|trpg-mobile)[^{]*\{/);
});

test("TRPG post-deploy layer raises tiny legacy labels without touching runtime files", async () => {
    const polish = await read("apps/web/creators/chikage/trpg/css/trpg-ui-v3-postdeploy.css");

    for(const contract of [
        /scenario-data-label[\s\S]*font-size:\s*\.75rem/,
        /picker-meta dt[\s\S]*font-size:\s*\.8rem/,
        /modal-meta-label[\s\S]*font-size:\s*\.8rem/,
        /cx-calendar-weekdays span[\s\S]*font-size:\s*\.8rem/
    ]){
        assert.match(polish, contract);
    }

    assert.doesNotMatch(polish, /display:\s*none\s*!important/);
    assert.doesNotMatch(polish, /pointer-events:\s*none/);
}
