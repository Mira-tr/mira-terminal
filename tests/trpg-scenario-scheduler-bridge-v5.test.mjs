import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
    buildScenarioSchedulerHref,
    createScenarioDraft,
    durationFieldsFromDraft,
    readScenarioDraftFromHref,
    stripScenarioDraftParams
} from "../apps/web/creators/chikage/trpg/js/scenarioSchedulerBridge.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Scenario Library creates a public-safe Scheduler draft", () => {
    const scenario = {
        id: "scenario_123",
        title: "放課後ミスマル",
        system: "CoC6",
        timeMin: 8,
        timeMax: 15,
        summary: "This must not be handed to Scheduler",
        notes: "Neither should this"
    };

    const draft = createScenarioDraft(scenario);
    assert.deepEqual(draft, {
        scenarioId: "scenario_123",
        title: "放課後ミスマル",
        system: "CoC6",
        durationMinutes: 900,
        durationCapped: false
    });

    const href = buildScenarioSchedulerHref(scenario, "https://relmua.com/creators/chikage/trpg/scenarios/?scenario=scenario_123");
    const url = new URL(href);
    assert.equal(url.pathname, "/creators/chikage/trpg/scheduler/");
    assert.equal(url.searchParams.get("scenarioTitle"), "放課後ミスマル");
    assert.equal(url.searchParams.get("scenarioSystem"), "CoC6");
    assert.equal(url.searchParams.get("scenarioMinutes"), "900");
    assert.equal(url.searchParams.has("summary"), false);
    assert.equal(url.searchParams.has("notes"), false);

    assert.deepEqual(readScenarioDraftFromHref(href), draft);
    assert.deepEqual(durationFieldsFromDraft(draft), { hours: 15, minutes: 0 });
});

test("Scenario Scheduler drafts normalize untrusted URL values and cap form duration", () => {
    const capped = createScenarioDraft({
        id: "long-one",
        title: "Long Scenario",
        system: "CoC6",
        timeMax: 42
    });
    assert.equal(capped.durationMinutes, 1800);
    assert.equal(capped.durationCapped, true);

    assert.equal(readScenarioDraftFromHref("https://relmua.com/x?fromScenario=%3Cscript%3E&scenarioTitle=x"), null);
    const normalized = readScenarioDraftFromHref("https://relmua.com/x?fromScenario=ok_1&scenarioTitle=%20Test%0AName%20&scenarioMinutes=99999");
    assert.equal(normalized.scenarioId, "ok_1");
    assert.equal(normalized.title, "Test Name");
    assert.equal(normalized.durationMinutes, null);

    const cleaned = stripScenarioDraftParams("https://relmua.com/creators/chikage/trpg/scheduler/?foo=1&fromScenario=ok_1&scenarioTitle=Test#x");
    assert.equal(cleaned, "/creators/chikage/trpg/scheduler/?foo=1#x");
});

test("Scenario to Scheduler handoff survives login without changing Public data contracts", async () => {
    const libraryBridge = await read("apps/web/creators/chikage/trpg/js/scenarioToSchedulerV5.js");
    const schedulerBridge = await read("apps/web/creators/chikage/trpg/v2/js/scenarioSchedulerDraftV5.js");
    const helper = await read("apps/web/creators/chikage/trpg/js/scenarioSchedulerBridge.js");
    const shell = await read("apps/web/creators/chikage/trpg/js/shell.js");
    const style = await read("apps/web/creators/chikage/trpg/css/style.css");

    assert.match(libraryBridge, /このシナリオで卓を作る/);
    assert.match(libraryBridge, /buildScenarioSchedulerHref/);
    assert.doesNotMatch(libraryBridge, /innerHTML/);

    assert.match(schedulerBridge, /sessionStorage\.setItem/);
    assert.match(schedulerBridge, /sessionStorage\.removeItem/);
    assert.match(schedulerBridge, /normalizeStoredDraft/);
    assert.match(schedulerBridge, /history\.replaceState/);
    assert.match(schedulerBridge, /Discordログイン後も卓名と想定時間を引き継ぎます/);
    assert.doesNotMatch(schedulerBridge, /localStorage|innerHTML/);

    assert.match(helper, /const PARAMS = \["fromScenario", "scenarioTitle", "scenarioSystem", "scenarioMinutes", "scenarioCapped"\]/);
    assert.doesNotMatch(helper, /summary|notes|memo|createdAt|updatedAt/);
    assert.match(shell, /scenarioToSchedulerV5\.js/);
    assert.match(shell, /scenarioSchedulerDraftV5\.js/);
    assert.match(style, /@import "\.\/trpg-v5-bridges\.css"/);
});
