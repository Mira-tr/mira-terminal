import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("Chikage public rooms use the final presentation layer and meaningful room visuals", async ()=>{
    const pages = await Promise.all([
        read("apps/web/creators/chikage/works/index.html"),
        read("apps/web/creators/chikage/profile/index.html"),
        read("apps/web/creators/chikage/contact/index.html")
    ]);

    for(const page of pages){
        assert.match(page, /chikage-public-finish\.css/);
        assert.match(page, /class="ch-page-intro__visual ch-room-visual/);
        assert.match(page, /ch-room-visual__index/);
    }

    assert.match(pages[0], /ROOM 02 \/ MAKE/);
    assert.match(pages[1], /ROOM 03 \/ SELF/);
    assert.match(pages[2], /ROOM 04 \/ DOOR/);
});

test("TRPG Home exposes the Play Room index without changing the runtime mount", async ()=>{
    const page = await read("apps/web/creators/chikage/trpg/index.html");

    assert.match(page, /chikage-public-finish\.css/);
    assert.match(page, /class="trpg-v3-intro trpg-home-hero"/);
    assert.match(page, /class="trpg-home-index"/);
    assert.match(page, /PLAY ROOM \/ INDEX/);
    assert.match(page, /href="#sessions"/);
    assert.match(page, /href="\.\/scheduler\/"/);
    assert.match(page, /href="\.\/scenarios\/"/);
    assert.match(page, /href="\.\/rules\/"/);
    assert.match(page, /id="trpgV2SessionsApp" class="v2-app-shell" data-trpg-v2-app/);
    assert.doesNotMatch(page, /trpg-mobile-dock/);
});

test("Public finish CSS keeps mobile navigation horizontal and room identity visible", async ()=>{
    const css = await read("apps/web/creators/chikage/css/chikage-public-finish.css");

    assert.match(css, /scroll-margin-top:124px/);
    assert.match(css, /\.ch-room-visual\{/);
    assert.match(css, /\.trpg-home-index\{/);
    assert.match(css, /@media \(max-width:900px\)/);
    assert.match(css, /\.ch-page-intro__visual\.ch-room-visual\{[\s\S]*display:grid/);
    assert.match(css, /\.trpg-home-index\{[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(css, /scroll-snap-type:x proximity/);
    assert.match(css, /env\(safe-area-inset-bottom\)/);
});
