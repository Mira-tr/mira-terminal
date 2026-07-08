import { getTools } from "./toolStore.js";
import { showMessage } from "../../utils.js";
const PUBLIC_EXPORT_FILENAME="public-tools.json"; const PUBLIC_EXPORT_DESTINATION="apps/web/tools/data/public-tools.json";
export function createPublicToolsPayload(value=getTools()){return{app:"MIRA Terminal",module:"tools",exportType:"public-tools",exportVersion:"1.0.0",schemaVersion:1,exportedAt:new Date().toISOString(),tools:value.tools.filter(v=>v.status==="public").map(({id,name,summary,description,category,url,tags,order})=>({id,name,summary,description,category,url,tags,order})).sort((a,b)=>a.order-b.order)};}
export function exportPublicTools(){download(createPublicToolsPayload(),PUBLIC_EXPORT_FILENAME);showMessage(`Public Export完了 / ファイル名: ${PUBLIC_EXPORT_FILENAME} / 配置先: ${PUBLIC_EXPORT_DESTINATION}`);}
function download(data,filename){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
