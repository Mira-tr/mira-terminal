import { getNotes } from "./noteStore.js";
import { showToast } from "../common/toastService.js";
const PUBLIC_EXPORT_FILENAME="public-notes.json"; const PUBLIC_EXPORT_DESTINATION="apps/web/notes/data/public-notes.json";
export function createPublicNotesPayload(value=getNotes()){return{app:"MIRA Terminal",module:"notes",exportType:"public-notes",exportVersion:"1.0.0",schemaVersion:1,exportedAt:new Date().toISOString(),notes:value.notes.filter(v=>v.status==="public").map(({id,title,summary,body,category,tags,order})=>({id,title,summary,body,category,tags,order})).sort((a,b)=>a.order-b.order)};}
export function exportPublicNotes(){download(createPublicNotesPayload(),PUBLIC_EXPORT_FILENAME);showToast("Public JSONを出力しました","success");}
function download(data,filename){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
