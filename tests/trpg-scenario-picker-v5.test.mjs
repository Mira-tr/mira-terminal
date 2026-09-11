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

test("Scenario Picker v6 is a conditions-then-comparison experience", async ()=>{
    const html = await readPickerFile("index.html");

    assert.match(html, /<body[^>]*picker-v6-page/);
    assert.match(html, /TRPG \/ TONIGHT'S PICK/);
    assert.match(html, /今夜、何を回す？/);
    assert.match(html, /条件を決める。/);
    assert.match(html, /3本を比べる。/);
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
    assert.match(html, /\.\/css\/picker-v6\.css/);
    assert.doesNotMatch(html, /\.\/css\/picker-v5\.css/);
});

test("Scenario Picker v6 compares three candidates on desktop without a sticky consultation rail", async ()=>{
    const css = await readPickerFile("css/picker-v6.css");

    assert.match(css, /\.picker-v6-console\s*\{[\s\S]*position:\s*static\s*!important/);
    assert.match(css, /\.picker-v6-core-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
    assert.match(css, /\.picker-v6-results\s*\{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)\s*!important/);
    assert.match(css, /\.picker-result-card\.is-primary\s*\{[\s\S]*box-shadow:\s*none\s*!important/);
    assert.doesNotMatch(css, /position:\s*sticky/);
});

test("Scenario Picker v6 keeps phone conditions and result cards readable", async ()=>{
    const css = await readPickerFile("css/picker-v6.css");

    assert.match(css, /@media \(max-width: 760px\)/);
    assert.match(css, /\.picker-v6-core-grid\s*\{[\s\S]*grid-template-columns:\s*1fr 1fr/);
    assert.match(css, /\.picker-v6-field--mood\s*\{[\s\S]*grid-column:\s*1 \/ -1/);
    assert.match(css, /\.picker-result-card__summary\s*\{[\s\S]*-webkit-line-clamp:\s*3/);
    assert.match(css, /\.picker-card-actions\s*\{[\s\S]*grid-template-columns:\s*1fr/);
    assert.match(css, /prefers-reduced-motion/);
});

test("Picker rendering stays on safe DOM APIs for public scenario content", async ()=>{
    const pageJs = await readPickerFile("js/pickerPage.js");

    assert.match(pageJs, /document\.createElement/);
    assert.match(pageJs, /\.textContent\s*=/);
    assert.doesNotMatch(pageJs, /innerHTML\s*=/);
    assert.match(pageJs, /getScenarioTags/);
    assert.match(pageJs, /pickerTag/);
    assert.match(pageJs, /createPickerSearch/);
});
