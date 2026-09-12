import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

test("calendar enhancement settles after answer DOM updates and still refreshes changed feedback", async () => {
    const source = await readFile(new URL("../apps/web/creators/chikage/trpg/v2/js/calendarBusyImportV5.js", import.meta.url), "utf8");
    let mutations = 0;
    const node = () => ({
        classList: { add(){}, remove(){} },
        setAttribute(){},
        append(){ mutations++; },
        appendChild(){ mutations++; },
        replaceChildren(){ mutations++; },
        prepend(){ mutations++; },
        remove(){ mutations++; },
        isConnected: true
    });
    const status = node();
    const panel = { querySelector: selector => selector.includes("status") ? status : null };
    const card = { ...node(), querySelector: () => null };
    const editor = { querySelectorAll: () => [card] };
    const context = vm.createContext({
        document: { querySelector: () => null, createElement: node },
        panel, editor,
        classifyCandidateAgainstBusy: () => ({ state: "free", overlapMinutes: 0 })
    });
    vm.runInContext(source.replace(/^import[\s\S]*?from "\.\/calendarBusyModel\.js";\s*/, ""), context);
    vm.runInContext("renderPanel(panel); applyHints(editor)", context);
    const firstRender = mutations;
    assert.ok(firstRender > 0);
    for(let i = 0; i < 10; i++) vm.runInContext("renderPanel(panel); applyHints(editor)", context);
    assert.equal(mutations, firstRender, "unrelated answer updates must not recreate calendar DOM");
    vm.runInContext('feedback = "読み取りエラー"; renderPanel(panel)', context);
    assert.ok(mutations > firstRender, "changed feedback must still render");
    vm.runInContext('importName = "calendar.ics"; readCandidate = () => ({start: 1, end: 2}); applyHints(editor)', context);
    const importedRender = mutations;
    vm.runInContext("applyHints(editor)", context);
    assert.equal(mutations, importedRender, "imported hints must also settle");
    vm.runInContext('importName = ""; applyHints(editor)', context);
    vm.runInContext("applyHints(editor)", context);
});
