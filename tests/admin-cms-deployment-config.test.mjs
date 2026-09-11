import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

async function read(path){
    return readFile(new URL(path, ROOT), "utf8");
}

test("deployed CMS config endpoint exposes only browser-safe Supabase values", async () => {
    const api = await read("api/supabase-public.js");
    const client = await read("apps/admin/js/features/cms/cmsClient.js");

    assert.match(api, /SUPABASE_URL/);
    assert.match(api, /SUPABASE_PUBLISHABLE_KEY/);
    assert.match(api, /SUPABASE_ANON_KEY/);
    assert.doesNotMatch(api, /SUPABASE_SERVICE_ROLE_KEY|service_role/);
    assert.match(client, /\/api\/supabase-public/);
    assert.match(client, /\/config\/supabase-public\.json/);
});
