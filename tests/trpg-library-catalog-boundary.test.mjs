import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Scenario Library stays a catalog and does not create Scheduler sessions", async () => {
    const shell = await read("apps/web/creators/chikage/trpg/js/shell.js");
    const library = await read("apps/web/creators/chikage/trpg/js/scenarioLibraryV4.js");
    const modal = await read("apps/web/creators/chikage/trpg/js/scenarioModal.js");
    const css = await read("apps/web/creators/chikage/trpg/css/trpg-v5-bridges.css");

    assert.doesNotMatch(shell, /scenarioToScheduler|scenarioSchedulerDraft|Scenario.*Scheduler/i);
    assert.doesNotMatch(library, /scheduler|卓を作る/i);
    assert.doesNotMatch(modal, /scheduler|卓を作る/i);
    assert.doesNotMatch(css, /scenario-draft|create-session|Scenario Library.*Scheduler/i);

    assert.match(shell, /calendarBusyImportV5\.js/);
});
