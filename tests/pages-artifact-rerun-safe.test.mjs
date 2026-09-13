import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const ARTIFACT_EXPR = "github-pages-${{ github.run_id }}-${{ github.run_attempt }}";

for(const workflowPath of [
    ".github/workflows/publish-pages.yml",
    ".github/workflows/publish-cms-queue.yml"
]){
    test(`${workflowPath} gives each workflow attempt its own Pages artifact`, async () => {
        const source = await readFile(new URL(workflowPath, ROOT), "utf8");

        assert.match(source, new RegExp(`name: ${escapeRegExp(ARTIFACT_EXPR)}`));
        assert.match(source, new RegExp(`artifact_name: ${escapeRegExp(ARTIFACT_EXPR)}`));
        assert.match(source, /Retry GitHub Pages deployment[\s\S]*artifact_name:/);
    });
}

function escapeRegExp(value){
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
