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

test("Chikage top-level pages share one creator navigation model", () => {
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

test("Chikage public copy talks about the creator instead of internal implementation rules", () => {
    const home = read("apps/web/creators/chikage/index.html");
    const works = read("apps/web/creators/chikage/works/index.html");
    const contact = read("apps/web/creators/chikage/contact/index.html");

    assert.doesNotMatch(home, /Homeはサイトマップではなく|前室にします/);
    assert.doesNotMatch(works, /捏造せず|個別実績が少ない状態でも/);
    assert.doesNotMatch(contact, /推測して追加しません/);
    assert.doesNotMatch(contact, /creator-contact-check/);
});

test("Chikage Works surfaces real public destinations with explicit status", () => {
    const works = read("apps/web/creators/chikage/works/index.html");
    const css = read("apps/web/creators/chikage/works/works-polish.css");

    assert.match(works, /TRPG Scheduler/);
    assert.match(works, /Scenario Library/);
    assert.match(works, /RELMUA Projectsで見る/);
    assert.match(works, />LIVE</);
    assert.match(works, />CONCEPT</);
    assert.match(works, /data-hide-when-empty="true"/);
    assert.match(css, /#creatorWorks\[data-hide-when-empty\]/);
});

test("Chikage audit polish remains isolated from the RELMUA brand home", () => {
    const brandHome = read("apps/web/index.html");

    assert.doesNotMatch(brandHome, /works-polish\.css/);
    assert.doesNotMatch(brandHome, /chikage-experience\.css/);
    assert.doesNotMatch(brandHome, /cx-work-status/);
});
