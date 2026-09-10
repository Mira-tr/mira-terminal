import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath){
    return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const creatorPages = [
    "apps/web/creators/chikage/index.html",
    "apps/web/creators/chikage/trpg/index.html",
    "apps/web/creators/chikage/works/index.html",
    "apps/web/creators/chikage/profile/index.html",
    "apps/web/creators/chikage/contact/index.html"
];

const creatorV2Pages = [
    "apps/web/creators/chikage/index.html",
    "apps/web/creators/chikage/works/index.html",
    "apps/web/creators/chikage/profile/index.html",
    "apps/web/creators/chikage/contact/index.html"
];

test("Chikage top-level pages keep one creator navigation model", () => {
    for(const path of creatorPages){
        const html = read(path);
        const localNavStart = html.indexOf("creator-local-nav");
        const localNavEnd = html.indexOf("</nav>", localNavStart);
        const localNav = html.slice(localNavStart, localNavEnd);

        for(const label of ["TRPG", "Works", "Profile", "Contact"]){
            assert.match(localNav, new RegExp(`>${label}<\\/a>`), `${path} should expose ${label}`);
        }

        if(path.endsWith("creators/chikage/index.html")){
            assert.match(localNav, />千景<\/a>/, `${path} should keep the creator identity as Home`);
        }else{
            assert.match(localNav, />Home<\/a>/, `${path} should link back to Chikage Home`);
        }
    }
});

test("Chikage v2 removes the repeated legacy navigation layers", () => {
    for(const path of creatorV2Pages){
        const html = read(path);

        assert.match(html, /chikage-v2/);
        assert.match(html, /creator-v2\.css/);
        assert.doesNotMatch(html, /chikage-experience\.css|works-polish\.css/);
        assert.doesNotMatch(html, /cx-bottom-nav/);
        assert.equal((html.match(/<header\b/g) || []).length, 1, `${path}: one visible header shell`);
    }
});

test("Chikage data-driven creator features remain wired", () => {
    const home = read("apps/web/creators/chikage/index.html");
    const profile = read("apps/web/creators/chikage/profile/index.html");
    const works = read("apps/web/creators/chikage/works/index.html");
    const contact = read("apps/web/creators/chikage/contact/index.html");

    assert.match(home, /id="creatorBio"/);
    assert.match(profile, /id="creatorBio"/);
    assert.match(profile, /id="creatorActivities"/);
    assert.match(works, /id="creatorWorks"/);
    assert.match(contact, /id="creatorLinks"/);

    for(const html of [home, profile, works, contact]){
        assert.match(html, /creators\.js/);
        assert.match(html, /data-creator-slug="chikage"/);
    }
});

test("Chikage Works presents real projects while keeping TRPG tools reachable", () => {
    const works = read("apps/web/creators/chikage/works/index.html");

    assert.match(works, /Eclipse Chronicle/);
    assert.match(works, />RELMUA</);
    assert.match(works, /TRPG Platform/);
    assert.match(works, /Scheduler/);
    assert.match(works, /Scenario Library/);
    assert.match(works, /Picker/);
    assert.match(works, /data-hide-when-empty="true"/);
});

test("Chikage v2 palette and mobile type prioritize readability", () => {
    const css = read("apps/web/creators/chikage/css/creator-v2.css");

    assert.match(css, /--ch-bg:\s*#090b11/);
    assert.match(css, /--ch-violet:\s*#9b8cff/);
    assert.match(css, /--ch-silver:\s*#d9dbea/);
    assert.match(css, /@media \(max-width: 640px\)/);
    assert.match(css, /font-size:\s*16px/);
    assert.match(css, /\.ch-hero h1\s*{[\s\S]*font-size:\s*clamp\(3rem, 14vw, 3\.8rem\)/);
    assert.match(css, /\.ch-page-intro h1\s*{[\s\S]*font-size:\s*clamp\(2\.35rem, 11vw, 3\.1rem\)/);
    assert.doesNotMatch(css, /font-size:\s*(?:1[0-9]|[2-9][0-9])rem/);
});

test("TRPG application keeps its existing functional runtime", () => {
    const trpg = read("apps/web/creators/chikage/trpg/index.html");

    assert.match(trpg, /id="trpgV2SessionsApp"/);
    assert.match(trpg, /\.\/v2\/js\/app\.js/);
    assert.match(trpg, /\.\/scheduler\//);
    assert.match(trpg, /\.\/calendar\//);
    assert.match(trpg, /\.\/scenarios\//);
    assert.match(trpg, /\.\/picker\//);
    assert.match(trpg, /\.\/rules\//);
});

test("Chikage audit polish remains isolated from the RELMUA brand home", () => {
    const brandHome = read("apps/web/index.html");

    assert.doesNotMatch(brandHome, /creator-v2\.css/);
    assert.doesNotMatch(brandHome, /chikage-experience\.css/);
    assert.doesNotMatch(brandHome, /chikage-v2/);
});
