import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import {
    getCreatorWorkspaces,
    resolveAdminRelativePath,
    resolvePublicRelativePath
} from "../apps/admin/js/features/creators/creatorFeatureRegistry.js";
import {
    PUBLIC_ADMIN_SURFACES
} from "../apps/admin/js/features/site/publicAdminRegistry.js";

const ROOT = new URL("../", import.meta.url);

function stripRouteSuffix(value){
    return String(value || "").split("#", 1)[0].split("?", 1)[0];
}

async function assertRouteExists(root, route, label){
    const clean = stripRouteSuffix(route);
    if(!clean) return;
    const relative = clean.replace(/^\.\//, "");
    const target = relative.endsWith("/") ? `${relative}index.html` : relative;
    await assert.doesNotReject(
        access(new URL(target, root)),
        `${label} -> ${target}`
    );
}

test("every registered Creator Admin and Public destination resolves to a real source page", async () => {
    for(const workspace of getCreatorWorkspaces()){
        await assertRouteExists(new URL("apps/admin/", ROOT), workspace.adminPath, `workspace ${workspace.creatorId}`);
        await assertRouteExists(new URL("apps/web/", ROOT), workspace.publicPath, `workspace public ${workspace.creatorId}`);

        for(const feature of workspace.features){
            await assertRouteExists(new URL("apps/admin/", ROOT), feature.adminPath, `feature ${feature.id}`);
            if(feature.publicPath){
                await assertRouteExists(new URL("apps/web/", ROOT), feature.publicPath, `feature public ${feature.id}`);
            }
        }
    }
});

test("every Public/Admin surface route resolves, including House Rules", async () => {
    for(const surface of PUBLIC_ADMIN_SURFACES){
        await assertRouteExists(new URL("apps/admin/", ROOT), surface.adminPath, `surface admin ${surface.id}`);
        if(surface.publicPath){
            await assertRouteExists(new URL("apps/web/", ROOT), surface.publicPath, `surface public ${surface.id}`);
        }
    }

    const rules = PUBLIC_ADMIN_SURFACES.find(surface => surface.id === "creator-chikage-rules");
    assert.equal(rules?.adminPath, "trpg/rules/");
    assert.equal(rules?.publicPath, "creators/chikage/trpg/rules/");
});

test("Creator route resolvers stay inside the correct source and built roots", () => {
    const sourceLocation = "https://example.test/repo/apps/admin/trpg/rules/";
    const builtLocation = "https://relmua.com/admin/trpg/rules/";

    assert.equal(
        resolveAdminRelativePath("./trpg/rules/", sourceLocation),
        "https://example.test/repo/apps/admin/trpg/rules/"
    );
    assert.equal(
        resolveAdminRelativePath("./trpg/rules/", builtLocation),
        "https://relmua.com/admin/trpg/rules/"
    );
    assert.equal(
        resolvePublicRelativePath("creators/chikage/trpg/rules/", sourceLocation),
        "https://example.test/repo/apps/web/creators/chikage/trpg/rules/"
    );
    assert.equal(
        resolvePublicRelativePath("creators/chikage/trpg/rules/", builtLocation),
        "https://relmua.com/creators/chikage/trpg/rules/"
    );
});

test("Chikage workspace House Rules links do not point at a dead compatibility route", async () => {
    const html = await readFile(new URL("apps/admin/creators/chikage/index.html", ROOT), "utf8");
    assert.match(html, /href="\.\.\/\.\.\/trpg\/rules\/"/);
    assert.doesNotMatch(html, /href="[^\"]*\/web\/[^\"]*trpg\/rules\/"[^>]*>House Rules/);
});
