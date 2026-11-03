import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import{parse}from'@babel/parser';import traverseModule from'@babel/traverse';import{filesIn}from'./audit.mjs';const traverse=traverseModule.default;
const en=JSON.parse(fs.readFileSync('src/i18n/locales/en.json','utf8')),aliases=JSON.parse(fs.readFileSync('src/i18n/aliases.json','utf8')),registry=JSON.parse(fs.readFileSync('src/i18n/source-registry.json','utf8'));
const css=/(?:^| )(?:inline-|flex |grid |h-|w-|gap-|media-|ms-|me-|absolute|relative|items-|home-|wall-|discover-|fan-|text-|opacity-|rounded-|border-|z-|left-|right-|top-|bottom-|overflow-|pointer-|font-|shadow-|bg-|profile-|object-|transition |whitespace-|min-|max-|group|cursor-|activity-|world-|story-|seen-|search-|content-|identity-|settings-|is-)|linear forwards/;
let total=0;
for(const file of filesIn('src').filter(f=>/\.[jt]sx?$/.test(f)&&!/test\.|atseenMockData|[\\/]i18n[\\/]|LanguageContext/.test(f))){let source=fs.readFileSync(file,'utf8'),edits=[],arrays=new Map(),tuple=false;traverse(parse(source,{sourceType:'module',plugins:['jsx']}),{TemplateLiteral(p){
 const n=p.node,raw=n.quasis.map(q=>q.value.cooked||'').join('{}');
 if(!/[A-Za-z]{2,}\s[A-Za-z]{2,}/.test(raw)||css.test(raw)||/[#<>]|https?:|\brgba\b/.test(raw))return;
 const attr=p.findParent(a=>a.isJSXAttribute());if(attr&&!['title','aria-label','alt','placeholder','label','subtitle','description'].includes(attr.node.name.name))return;
 // These are generated author drafts, not application UI messages.
 if(file.endsWith('WorldPublishingPage.jsx')&&raw.startsWith('A structured Experience'))return;
 let text='';const args=[];
 n.quasis.forEach((q,i)=>{text+=q.value.cooked||'';if(i<n.expressions.length){text+=`{value${i}}`;const expr=n.expressions[i],value=source.slice(expr.start,expr.end);args.push(`value${i}: ${value}`);}});
 let key=registry[text]||aliases[text];if(!key){const ns=file.replaceAll('\\','/').split('/')[2]?.replace(/\.[^.]+$/,'')||'common';const words=text.match(/[A-Za-z0-9]+/g)||['message'];key=ns+'.'+words.slice(0,8).map((w,i)=>i?w[0].toUpperCase()+w.slice(1).toLowerCase():w.toLowerCase()).join('');if(Object.values(registry).includes(key))key+='_'+crypto.createHash('sha1').update(text).digest('hex').slice(0,6);registry[text]=key;}
 en[key]=text;aliases[text]=key;const call=`__msg(${JSON.stringify(key)}${args.length?`, { ${args.join(', ')} }`:''})`;
 if(!p.getFunctionParent()&&p.parentPath.isArrayExpression()){
  edits.push([n.start,n.end,`{ __uiMessage: ${JSON.stringify(key)}, values: { ${args.join(', ')} } }`]);arrays.set(p.parentPath.node.start,p.parentPath.node);tuple=true;
 }else if(!p.getFunctionParent()&&p.parentPath.isObjectProperty()){
  const prop=p.parentPath.node;const name=source.slice(prop.key.start,prop.key.end);edits.push([prop.start,prop.end,`get ${prop.computed?'['+name+']':name}() { return ${call}; }`]);
 }else edits.push([n.start,n.end,call]);
 p.skip();total++;
}});
if(!edits.length)continue;
for(const n of arrays.values()){edits.push([n.start,n.start,'__uiTuple(']);edits.push([n.end,n.end,')']);}
let output=source;for(const[a,b,text]of edits.sort((a,b)=>b[0]-a[0]||b[1]-a[1]))output=output.slice(0,a)+text+output.slice(b);
const r=path.relative(path.dirname(file),'src/i18n/runtime.js').replaceAll('\\','/');const imp=JSON.stringify(r.startsWith('.')?r:'./'+r);if(!source.includes('msg as __msg'))output=`import { msg as __msg } from ${imp};\n`+output;if(tuple&&!source.includes('localizedTuple as __uiTuple'))output=`import { localizedTuple as __uiTuple } from ${imp};\n`+output;
try{parse(output,{sourceType:'module',plugins:['jsx']});}catch(e){throw new Error(file+': '+e.message);}
const backup=path.join('tmp/i18n-pre-templates',file);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.writeFileSync(backup,source);fs.writeFileSync(file,output);
}
for(const [file,value] of [['src/i18n/locales/en.json',en],['src/i18n/aliases.json',aliases],['src/i18n/source-registry.json',registry]])fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');console.log(`${total} dynamic UI templates migrated`);
