import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

function stylesheetPaths(html){
    return [...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)]
        .map(match => match[1].split("?", 1)[0]);
}

const EXPECTED_LAYERS = [
    {
        path: "apps/web/creators/chikage/trpg/index.html",
        layers: [
            "./css/style.css",
            "./v2/css/trpg-v2-home.css",
            "./css/trpg-ui-v3.css",
            "../css/chikage-house.css",
            "../css/chikage-ui-refresh.css",
            "../css/chikage-public-finish.css",
            "./css/trpg-overview-v7.css",
            "./v2/css/trpg-vnext-candidate-input.css",
            "./v2/css/trpg-vnext-answer.css",
            "./v2/css/trpg-answer-v4.css",
            "./v2/css/trpg-answer-v5-dense.css",
            "./scheduler/css/scheduler-v8-flow.css",
            "../css/chikage-ultimate.css"
        ]
    },
    {
        path: "apps/web/creators/chikage/trpg/scheduler/index.html",
        layers: [
            "../css/style.css",
            "../v2/css/trpg-v2-home.css",
            "../css/trpg-ui-v3.css",
            "../../css/chikage-house.css",
            "../../css/chikage-ui-refresh.css",
            "./css/scheduler-v6.css",
            "../v2/css/trpg-vnext-candidate-input.css",
            "../v2/css/trpg-vnext-answer.css",
            "../v2/css/trpg-answer-v4.css",
            "../v2/css/trpg-answer-v5-dense.css",
            "./css/scheduler-v7.css",
            "./css/scheduler-v8-flow.css",
            "../../css/chikage-ultimate.css"
        ]
    },
    {
        path: "apps/web/creators/chikage/trpg/calendar/index.html",
        layers: [
            "../css/style.css",
            "../v2/css/trpg-v2-home.css",
            "./css/calendar.css",
            "../css/trpg-ui-v3.css",
            "../../css/chikage-house.css",
            "../../css/chikage-ui-refresh.css",
            "./css/calendar-v5.css",
            "./css/calendar-v6.css",
            "../../css/chikage-ultimate.css"
        ]
    },
    {
        path: "apps/web/creators/chikage/trpg/scenarios/index.html",
        layers: [
            "../css/style.css",
            "../css/trpg-ui-v3.css",
            "../../css/chikage-house.css",
            "../../css/chikage-ui-refresh.css",
            "../css/scenario-library-v5.css",
            "../css/scenario-library-v6.css",
            "../css/scenario-library-v7.css",
            "../css/scenario-library-v8.css",
            "../../css/chikage-ultimate.css"
        ]
    },
    {
        path: "apps/web/creators/chikage/trpg/picker/index.html",
        layers: [
            "../css/style.css",
            "./css/picker.css",
            "../css/trpg-ui-v3.css",
            "../../css/chikage-house.css",
            "../../css/chikage-ui-refresh.css",
            "./css/picker-v6.css",
            "../../css/chikage-ultimate.css"
        ]
    },
    {
        path: "apps/web/creators/chikage/trpg/rules/index.html",
        layers: [
            "../css/style.css",
            "./css/rules.css",
            "../css/trpg-ui-v3.css",
            "../../css/chikage-house.css",
            "../../css/chikage-ui-refresh.css",
            "./css/rules-v5.css",
            "../css/mobile-reading-repair.css",
            "../css/reference-clarity.css",
            "../../css/chikage-ultimate.css"
        ]
    }
];

test("TRPG public pages keep one explicit, tested CSS layer order", async () => {
    for(const page of EXPECTED_LAYERS){
        const actual = stylesheetPaths(await read(page.path));
        assert.deepEqual(actual, page.layers, `${page.path} CSS order changed`);
    }
});
