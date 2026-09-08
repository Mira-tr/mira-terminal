import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    initHomeExperience
} from "../apps/web/js/homeExperience.js";

const ROOT = new URL("../", import.meta.url);

test("RELMUA Home experience numbers only visible Home sections", () => {
    const home = new FakeElement("main", "page brand-main home-page");
    const hero = new FakeElement("section", "home-hero");
    const tools = new FakeElement("section", "home-tools", true);
    const creator = new FakeElement("section", "home-featured-creator");

    home.children.push(hero, tools, creator);

    const documentRef = {
        querySelector(selector){
            return selector === ".home-page" ? home : null;
        }
    };

    initHomeExperience({
        documentRef,
        windowRef: null
    });

    assert.match(home.className, /relmua-archive-experience/);
    assert.equal(home.dataset.archiveTotal, "02");
    assert.equal(hero.dataset.archiveMark, "01 / ORIGIN");
    assert.equal(creator.dataset.archiveMark, "02 / CREATOR / EXTERNAL");
    assert.equal(tools.dataset.archiveMark, undefined);
    assert.match(hero.className, /is-visible/);
});

test("RELMUA Home experience stays isolated from Chikage Creator site", async () => {
    const homePage = await read("apps/web/js/homePage.js");
    const experience = await read("apps/web/js/homeExperience.js");
    const chikage = await read("apps/web/creators/chikage/index.html");

    assert.match(homePage, /\.\/homeExperience\.js/);
    assert.match(experience, /home-experience\.css/);
    assert.doesNotMatch(chikage, /homeExperience|home-experience\.css|relmua-archive-experience/);
    assert.match(chikage, /chikage-experience\.css/);
});

class FakeElement {
    constructor(tagName, className = "", hidden = false){
        this.tagName = tagName;
        this.className = className;
        this.hidden = hidden;
        this.children = [];
        this.dataset = {};
    }

    querySelector(){
        return null;
    }
}

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}
