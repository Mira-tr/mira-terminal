import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const PICKER_ROOT = new URL(
    "../apps/web/creators/chikage/trpg/picker/",
    import.meta.url
);

async function readPickerFile(path){
    return readFile(new URL(path, PICKER_ROOT), "utf8");
}

test("Scenario Picker v5 is a guided three-pick experience", async ()=>{
    const html = await readPickerFile("index.html");

    assert.match(html, /<body[^>]*picker-v5-page/);
    assert.match(html, /TRPG \/ TONIGHT'S PICK/);
    assert.match(html, /今夜、[\s\S]*何を回す？/);
    assert.match(html, /id="pickerPlayers"/);
    assert.match(html, /id="pickerHours"/);
    assert.match(html, /id="pickerTag"/);
    assert.match(html, /id="pickerSystem"/);
    assert.match(html, /id="pickerIncludeR18"/);
    assert.match(html, /id="pickerCriteriaSummary"/);
    assert.match(html, /id="pickerMatchCount"/);
    assert.match(html, /id="pickerSurpriseButton"/);
    assert.match(html, /id="pickerResults"/);
    assert.match(html, /Scenario Libraryを開く/);
    assert.match(html, /\.\/css\/picker-v5\.css/);
});

test("Scenario Picker v5 keeps mobile-first consultation and result layouts", async ()=>{
    const css = await readPickerFile("css/picker-v5.css");

    assert.match(css, /\.picker-v5-layout\s*{[\s\S]*grid-template-columns:/);
    assert.match(css, /\.picker-v5-core-fields\s*{/);
    assert.match(css, /\.picker-v5-live\s*{/);
    assert.match(css, /\.picker-v5-results\s*{[\s\S]*grid-template-columns:\s*1fr/);
    assert.match(css, /@media\s*\(max-width:\s*760px\)/);
    assert.match(css, /\.picker-v5-submit-row\s*{[\s\S]*grid-template-columns:\s*1fr;/);
    assert.match(css, /prefers-reduced-motion/);
});

test("Picker rendering stays on safe DOM APIs for public scenario content", async ()=>{
    const pageJs = await readPickerFile("js/pickerPage.js");

    assert.match(pageJs, /document\.createElement/);
    assert.match(pageJs, /\.textContent\s*=/);
    assert.doesNotMatch(pageJs, /innerHTML\s*=/);
    assert.match(pageJs, /getScenarioTags/);
    assert.match(pageJs, /pickerTag/);
});
