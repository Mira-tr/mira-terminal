import { TOOLS_KEY, load, save } from "../../store.js";

const DEFAULT_VALUE = { tools: [] };
const ALLOWED_STATUS = new Set(["draft", "public", "private"]);

function text(value, max){ return String(value ?? "").trim().slice(0, max); }
function status(value){ const v=text(value, 20).toLowerCase(); return ALLOWED_STATUS.has(v) ? v : "draft"; }
function url(value){ const v=text(value, 500); try{ const p=new URL(v); return ["http:","https:"].includes(p.protocol) ? v : ""; }catch{ return ""; } }
function tags(value){ const source=Array.isArray(value)?value:String(value??"").split(/[\n,]/); return [...new Set(source.map(v=>text(v,24)).filter(Boolean))].slice(0,12); }
function order(value){ const n=Number(value); return Number.isInteger(n)&&n>0?n:0; }
function timestamp(value, fallback){ return text(value,50)||fallback; }
function id(){ return globalThis.crypto?.randomUUID ? `tool-${globalThis.crypto.randomUUID()}` : `tool-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

function normalize(item, options={}){
    const now=options.now||new Date().toISOString();
    return { id:options.id||text(item.id,120)||id(), name:text(item.name,80), summary:text(item.summary,160), description:text(item.description,2000), category:text(item.category,60), status:status(item.status), url:url(item.url), tags:tags(item.tags), order:options.order??order(item.order), createdAt:timestamp(item.createdAt,now), updatedAt:options.touch?now:timestamp(item.updatedAt,now) };
}

export function normalizeToolsCollection(value){
    const source=value&&Array.isArray(value.tools)?value.tools:[]; const now=new Date().toISOString(); const used=new Set();
    const sorted=source.filter(v=>v&&typeof v==="object").map((item,index)=>({item,index,order:order(item.order)})).sort((a,b)=>a.order===b.order?a.index-b.index:a.order===0?1:b.order===0?-1:a.order-b.order);
    return {tools:sorted.map(({item},index)=>{ let itemId=text(item.id,120); if(!itemId||used.has(itemId))itemId=id(); used.add(itemId); return normalize(item,{id:itemId,order:index+1,now}); })};
}
export function getTools(){ const loaded=load(TOOLS_KEY,DEFAULT_VALUE); const normalized=normalizeToolsCollection(loaded); if(JSON.stringify(loaded)!==JSON.stringify(normalized))saveTools(normalized); return normalized; }
export function saveTools(value){ return save(TOOLS_KEY,value); }
export function setTools(value){ const normalized=normalizeToolsCollection(value); saveTools(normalized); return normalized; }
export function addTool(item){ const value=getTools(); const created=normalize(item,{id:id(),order:value.tools.length+1,touch:true}); value.tools.push(created); setTools(value); return created; }
export function updateTool(itemId,updates){ const value=getTools(); const index=value.tools.findIndex(v=>v.id===itemId); if(index<0)return false; value.tools[index]=normalize({...value.tools[index],...updates},{id:itemId,order:value.tools[index].order,touch:true}); setTools(value); return true; }
export function deleteTool(itemId){ const value=getTools(); value.tools=value.tools.filter(v=>v.id!==itemId); setTools(value); return true; }
export function moveTool(itemId,direction){ const value=getTools(); const index=value.tools.findIndex(v=>v.id===itemId); const target=direction==="up"?index-1:index+1; if(index<0||target<0||target>=value.tools.length)return false; const [item]=value.tools.splice(index,1); value.tools.splice(target,0,item); value.tools.forEach((v,i)=>v.order=i+1); setTools(value); return true; }
