import test from "node:test";
import assert from "node:assert/strict";

import { normalizeToolsCollection } from "../apps/admin/js/features/tools/toolStore.js";
import { normalizeNotesCollection } from "../apps/admin/js/features/notes/noteStore.js";
import { createPublicToolsPayload } from "../apps/admin/js/features/tools/toolPublicExport.js";
import { createPublicNotesPayload } from "../apps/admin/js/features/notes/notePublicExport.js";
import { createToolsBackup, importBackupTools } from "../apps/admin/js/features/tools/toolBackup.js";
import { createNotesBackup, importBackupNotes } from "../apps/admin/js/features/notes/noteBackup.js";

const records = status => ({
    id: status,
    name: `Tool ${status}`,
    title: `Note ${status}`,
    summary: "summary",
    description: "description",
    body: "body",
    category: "category",
    status,
    url: "https://example.com",
    tags: ["tag"],
    order: status === "public" ? 1 : 2,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-02"
});

test("ToolsとNotesの保存境界で値を正規化する", ()=>{
    const tools = normalizeToolsCollection({ tools: [records("public")] });
    const notes = normalizeNotesCollection({ notes: [records("public")] });
    assert.equal(tools.tools[0].status, "public");
    assert.equal(notes.notes[0].status, "public");
    assert.equal(tools.tools[0].order, 1);
    assert.equal(notes.notes[0].order, 1);
});

test("Public Exportはpublicだけを含み管理項目を除外する", ()=>{
    const originalLocalStorage = globalThis.localStorage;
    const source = [records("public"), records("draft"), records("private")];

    globalThis.localStorage = createStorage();

    try{
        const tools = createPublicToolsPayload({ tools: source });
        const notes = createPublicNotesPayload({ notes: source });
        assert.deepEqual(tools.tools.map(item=>item.id), ["public"]);
        assert.deepEqual(notes.notes.map(item=>item.id), ["public"]);
        [tools.tools[0], notes.notes[0]].forEach(item=>{
            assert.equal("status" in item, false);
            assert.equal("createdAt" in item, false);
            assert.equal("updatedAt" in item, false);
        });
    }finally{
        globalThis.localStorage = originalLocalStorage;
    }
});

test("Backupはdraft・public・privateをすべて含む", ()=>{
    const source = [records("public"), records("draft"), records("private")];
    const tools = createToolsBackup({ tools: source });
    const notes = createNotesBackup({ notes: source });
    assert.deepEqual(tools.tools.tools.map(item=>item.status), ["public", "draft", "private"]);
    assert.deepEqual(notes.notes.notes.map(item=>item.status), ["public", "draft", "private"]);
});

test("ToolsとNotesのBackup Importは全ステータスを復元する", async ()=>{
    const storage = new Map();
    globalThis.localStorage = {
        getItem: key=>storage.get(key) ?? null,
        setItem: (key,value)=>storage.set(key,value)
    };
    globalThis.confirm = ()=>true;

    try{
        const source = [records("public"), records("draft"), records("private")];
        const toolFile = { text: async ()=>JSON.stringify(createToolsBackup({ tools: source })) };
        const noteFile = { text: async ()=>JSON.stringify(createNotesBackup({ notes: source })) };

        assert.equal(await importBackupTools(toolFile), true);
        assert.equal(await importBackupNotes(noteFile), true);
        assert.deepEqual(JSON.parse(storage.get("mira_terminal_tools")).tools.map(item=>item.status), ["public", "draft", "private"]);
        assert.deepEqual(JSON.parse(storage.get("mira_terminal_notes")).notes.map(item=>item.status), ["public", "draft", "private"]);
    }finally{
        delete globalThis.localStorage;
        delete globalThis.confirm;
    }
});

function createStorage(){
    return {
        getItem(key){
            if(key !== "mira_terminal_creators"){
                return null;
            }

            return JSON.stringify({
                primaryCreatorId: "creator-chikage",
                creators: [
                    {
                        id: "creator-chikage",
                        slug: "chikage",
                        displayName: "千景",
                        status: "public",
                        order: 1
                    }
                ]
            });
        },
        setItem(){}
    };
}
