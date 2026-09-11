import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    normalizeRulesSnapshot
} from "../apps/admin/js/features/trpg/rules/rulesCmsStore.js";

const ROOT = new URL("../", import.meta.url);

test("House Rules CMS snapshot preserves normalized systems and sections", () => {
    const snapshot = normalizeRulesSnapshot({
        rules: {
            systems: [{
                id: "coc6",
                label: "CoC6版",
                title: "Rules",
                status: "public",
                sections: [{
                    id: "combat",
                    category: "戦闘",
                    title: "戦闘",
                    body: "本文",
                    order: 1,
                    status: "public"
                }]
            }]
        }
    });

    assert.equal(snapshot.schemaVersion, 1);
    assert.equal(snapshot.rules.systems[0].id, "coc6");
    assert.equal(snapshot.rules.systems[0].sections[0].id, "combat");
});

test("House Rules page hydrates before form startup and confirms explicit saves to CMS", async () => {
    const page = await read("apps/admin/js/pages/trpgRulesPage.js");
    const cms = await read("apps/admin/js/features/trpg/rules/rulesCmsStore.js");
    const backup = await read("apps/admin/js/features/trpg/rules/rulesBackup.js");

    assert.match(page, /await hydrateRulesFromCms\(\)/);
    assert.ok(page.indexOf("await hydrateRulesFromCms()") < page.indexOf("initRulesForm()"));
    assert.match(page, /await saveRulesCanonical\(getRules\(\)\)/);
    assert.match(cms, /hydrateOwnerCmsSnapshot/);
    assert.match(cms, /persistOwnerCmsSnapshot/);
    assert.match(cms, /trpg-house-rules/);
    assert.match(backup, /await saveRulesCanonical\(data\.rules\)/);
});

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
