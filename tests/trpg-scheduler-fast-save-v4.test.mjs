import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Scheduler one-click candidate save reuses the native composer submit path", async () => {
    const source = await read("apps/web/creators/chikage/trpg/v2/js/candidateFastSaveV4.js");

    assert.match(source, /候補日をまとめて追加/);
    assert.match(source, /候補欄で確認/);
    assert.match(source, /requestSubmit/);
    assert.match(source, /classList\.contains\("is-success"\)/);
    assert.match(source, /data-candidate-fast-save/);
    assert.doesNotMatch(source, /repository\.|supabase|fetch\s*\(/i);
    assert.doesNotMatch(source, /innerHTML/);
});

test("Scheduler fast save keeps preview as an explicit fallback", async () => {
    const source = await read("apps/web/creators/chikage/trpg/v2/js/candidateFastSaveV4.js");

    assert.match(source, /previewButton\.classList\.remove\("v2-command--primary"\)/);
    assert.match(source, /previewButton\.textContent = "候補欄で確認"/);
    assert.match(source, /保存前に編集したい時だけ/);
    assert.match(source, /一括保存を開始できませんでした/);
});

test("Scheduler fast save re-enhancement never mistakes its primary save button for preview", async () => {
    const source = await read("apps/web/creators/chikage/trpg/v2/js/candidateFastSaveV4.js");

    assert.match(source, /\[data-candidate-preview=\\?"true\\?"\]/);
    assert.match(source, /\.v2-command--primary:not\(\[data-candidate-fast-save=\\?"true\\?"\]\)/);
    assert.match(source, /previewButton\.dataset\.candidatePreview = "true"/);
});

test("Scheduler candidate enhancers do not rewrite each other's owned controls forever", async () => {
    const candidate = await read("apps/web/creators/chikage/trpg/v2/js/candidateInputExperience.js");
    const fast = await read("apps/web/creators/chikage/trpg/v2/js/candidateFastSaveV4.js");

    assert.match(candidate, /applyButton\.dataset\.candidatePreview = "true"/);
    assert.match(candidate, /\.v2-command--primary:not\(\[data-candidate-fast-save=\\?"true\\?"\]\)/);
    assert.match(candidate, /fastSaveEnabled/);
    assert.match(candidate, /status\.dataset\.renderSignature/);
    assert.doesNotMatch(candidate, /while\s*\(true\)/);
    assert.match(fast, /observer\?\.disconnect\(\)/);
    assert.match(fast, /help\.textContent !== helpText/);
    assert.doesNotMatch(fast, /rewriteIdleNote/);
});

test("Scheduler and TRPG Overview load fast save after the existing candidate input enhancement", async () => {
    for(const page of [
        "apps/web/creators/chikage/trpg/scheduler/index.html",
        "apps/web/creators/chikage/trpg/index.html"
    ]){
        const html = await read(page);
        const base = html.indexOf("candidateInputExperience.js");
        const fast = html.indexOf("candidateFastSaveV4.js");

        assert.ok(base >= 0, `${page} must load candidateInputExperience.js`);
        assert.ok(fast > base, `${page} must load candidateFastSaveV4.js after the existing enhancement`);
    }
});
