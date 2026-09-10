import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const APP = "apps/web/creators/chikage/trpg/v2/js/app.js";
const RUNTIME = "apps/web/creators/chikage/trpg/v2/js/runtime";

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("TRPG v2 app is an orchestrator backed by domain runtime modules", async () => {
    const app = await read(APP);
    const bytes = Buffer.byteLength(app);

    for(const moduleName of [
        "dom.js",
        "navigation.js",
        "support.js",
        "scheduleSupport.js",
        "availabilityController.js",
        "preparationActions.js",
        "schedulerActions.js",
        "sessionActions.js"
    ]){
        assert.ok(app.includes("runtime/" + moduleName));
    }

    assert.ok(bytes < 100000, "app.js should stay below 100KB after modularization, got " + bytes);

    for(const moved of [
        "renderAvailability",
        "savePreparationItem",
        "openDetail",
        "createSession",
        "answerSlot",
        "addCandidateBatch",
        "saveExistingCandidate",
        "sectionBlock",
        "readRoute",
        "normalizeMinuteRange"
    ]){
        assert.ok(!app.includes("function " + moved + "(") && !app.includes("async function " + moved + "("));
    }
});

test("TRPG runtime controllers keep mutation boundaries explicit", async () => {
    const availability = await read(RUNTIME + "/availabilityController.js");
    const preparation = await read(RUNTIME + "/preparationActions.js");
    const scheduler = await read(RUNTIME + "/schedulerActions.js");
    const sessions = await read(RUNTIME + "/sessionActions.js");

    assert.match(availability, /createAvailabilityController/);
    assert.match(preparation, /createPreparationActions/);
    assert.match(scheduler, /createSchedulerActions/);
    assert.match(sessions, /createSessionActions/);

    assert.match(preparation, /createTrpgV12PreparationItem/);
    assert.match(scheduler, /addTrpgV6Candidates/);
    assert.match(sessions, /createTrpgV2Session/);
    assert.match(sessions, /upsertAccountResponse/);
});
