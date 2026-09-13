import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Creator rail keeps the canonical order on every Chikage page", async () => {
    const [css, ...pages] = await Promise.all([
        read("apps/web/creators/chikage/css/works-v2.css"),
        read("apps/web/creators/chikage/index.html"),
        read("apps/web/creators/chikage/works/index.html"),
        read("apps/web/creators/chikage/profile/index.html"),
        read("apps/web/creators/chikage/contact/index.html")
    ]);

    assert.doesNotMatch(css, /\.chikage-page--works \.creator-local-nav a\[aria-current="page"\][\s\S]*?order:\s*-1/);
    for(const html of pages){
        const nav = html.match(/<nav class="creator-local-nav"[\s\S]*?<\/nav>/)?.[0] || "";
        const labels = [...nav.matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map(match => match[1]);
        assert.deepEqual(labels, ["Home", "Works", "TRPG", "Profile", "Contact"]);
    }
});

test("Scenario favorites preserve an already expanded result shelf", async () => {
    const source = await read("apps/web/creators/chikage/trpg/js/scenarioClarity.js");

    assert.match(source, /\.favorite-button, \.modal-favorite-button/);
    assert.match(source, /favoriteRestoreTarget\s*=\s*scenarioList\.querySelectorAll/);
    assert.match(source, /queueMicrotask\(restoreExpandedScenarioCount\)/);
    assert.match(source, /loadMoreButton\.click\(\)/);
});
