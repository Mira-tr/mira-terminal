import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
    createFilterUrl,
    readFilterStateFromSearch
} from "../apps/web/creators/chikage/trpg/js/filterUrlState.js";

const ROOT = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, ROOT), "utf8");

test("Scenario Library Public v4 keeps search state and detail URL shareable together", () => {
    const url = createFilterUrl(
        "https://relmua.com/creators/chikage/trpg/scenarios/?scenario=abc_123&q=old",
        {
            keyword: "四季",
            system: "CoC6",
            players: "4",
            time: "8",
            rating: "r18",
            tags: ["秘匿HO"],
            sort: "timeAsc"
        }
    );
    const parsed = new URL(url);

    assert.equal(parsed.searchParams.get("scenario"), "abc_123");
    assert.equal(parsed.searchParams.get("q"), "四季");
    assert.equal(parsed.searchParams.get("system"), "CoC6");
    assert.equal(parsed.searchParams.get("players"), "4");
    assert.equal(parsed.searchParams.get("time"), "8");
    assert.equal(parsed.searchParams.get("rating"), "r18");
    assert.deepEqual(parsed.searchParams.getAll("tag"), ["秘匿HO"]);
    assert.equal(parsed.searchParams.get("sort"), "timeAsc");
});

test("Scenario Library Public v4 drops invalid URL filter input", () => {
    const state = readFilterStateFromSearch(
        "?q=" + "x".repeat(300) + "&players=999&time=-1&system=bad&rating=bad&tag=unknown",
        { systems: ["CoC6"], tags: ["おすすめ"] }
    );

    assert.equal(state.keyword.length, 200);
    assert.equal(state.players, "");
    assert.equal(state.time, "");
    assert.equal(state.system, "");
    assert.equal(state.rating, "");
    assert.deepEqual(state.tags, []);
});

test("Scenario Library Public v4 is search-first, dense and mobile friendly", async () => {
    const html = await read("apps/web/creators/chikage/trpg/scenarios/index.html");
    const css = await read("apps/web/creators/chikage/trpg/css/scenario-library-v8.css");

    assert.match(html, /遊びたい一本を探す。/);
    assert.match(html, /id="keywordInput"/);
    assert.match(html, /id="playersSelect"/);
    assert.match(html, /id="timeSelect"/);
    assert.match(html, /id="activeFilters"/);
    assert.match(css, /\.library-control-bar--v4\{position:sticky/);
    assert.match(css, /\.scenario-list--compact \.scenario-item--v4\{display:grid/);
    assert.match(css, /@media \(max-width:600px\)/);
    assert.match(css, /min-height:46px/);
});

test("Scenario Library Public v4 supports keyboard detail opening and URL sharing without innerHTML", async () => {
    const source = await read("apps/web/creators/chikage/trpg/js/scenarioLibraryV4.js");

    assert.match(source, /event\.key !== "Enter" && event\.key !== " "/);
    assert.match(source, /event\.key !== "\/"/);
    assert.match(source, /詳細URLをコピー/);
    assert.match(source, /history\[method\]/);
    assert.match(source, /scenarioId/);
    assert.doesNotMatch(source, /innerHTML\s*=/);
});
