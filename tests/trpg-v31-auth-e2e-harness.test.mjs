import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

test("TRPG V3.1 authenticated E2E harness keeps server credentials out of public UI and cleans exact fixtures", async () => {
    const source = await readFile(new URL("scripts/trpg-v31-auth-e2e.mjs", ROOT), "utf8");
    const app = await readFile(new URL("apps/web/creators/chikage/trpg/v2/js/app.js", ROOT), "utf8");

    assert.match(source, /RELMUA_E2E_SERVICE_ROLE_KEY/);
    assert.match(source, /RELMUA_E2E_ALLOW_PRODUCTION/);
    assert.match(source, /trpg_v2_create_session/);
    assert.match(source, /trpg_v2_add_candidates/);
    assert.match(source, /schedule_account_upsert_response/);
    assert.match(source, /trpg_v31_save_personal_availability/);
    assert.match(source, /schedule_owner_confirm_slots/);
    assert.match(source, /schedules\?id=eq/);
    assert.match(source, /method: "DELETE"/);
    assert.match(source, /admin\/users/);
    assert.doesNotMatch(app, /RELMUA_E2E_SERVICE_ROLE_KEY|pseudo.?login|疑似.*ログイン/i);
});
