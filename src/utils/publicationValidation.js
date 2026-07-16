export const PUBLICATION_LIMITS={title:120,summary:300,description:2000,category:40,tags:15,tag:40,chapterTitle:120,chapterText:2000};
export const BLOCK_TYPES=["TEXT","IMAGE","VIDEO","AUDIO","VOICE","LINK","KEY_POINT","HIGHLIGHT"];
export const normalizeTags=(v)=>[...new Set((Array.isArray(v)?v:String(v||"").split(",")).map(x=>x.trim().toLowerCase()).filter(Boolean))].slice(0,15);
export const chapterTextCount=(c)=>(c?.blocks||[]).reduce((n,b)=>n+(["TEXT","KEY_POINT","HIGHLIGHT"].includes(b.type)?(b.text||"").length:b.type==="LINK"?(b.label||"").length:0),0);
export function validHttpUrl(v){try{return["http:","https:"].includes(new URL(v).protocol)}catch{return false}}
export function seenCompleteness(p){const e=[];if(!p?.title?.trim())e.push("Title is required");if(!p?.summary?.trim())e.push("Summary is required");if(!p?.category?.trim())e.push("Category is required");if(!p?.coverMedia?.secureUrl)e.push("A verified cover is required");if(!p?.chapters?.length)e.push("At least one chapter is required");if((p?.chapters?.length||0)>3)e.push("Seen supports at most three chapters");(p?.chapters||[]).forEach((c,i)=>{if(!c.title?.trim())e.push(`Chapter ${i+1} needs a title`);if(chapterTextCount(c)>2000)e.push(`Chapter ${i+1} exceeds 2,000 characters`)});return e}
export const publicationError=(e,f="Unable to complete this action")=>e?.response?.data?.message||e?.message||f;
