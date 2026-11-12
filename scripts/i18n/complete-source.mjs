import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {parse} from '@babel/parser';import traverseModule from '@babel/traverse';
import {filesIn} from './audit.mjs';
const traverse=traverseModule.default;
const registry=JSON.parse(fs.readFileSync('src/i18n/source-registry.json','utf8'));
const en=JSON.parse(fs.readFileSync('src/i18n/locales/en.json','utf8'));
const aliases=JSON.parse(fs.readFileSync('src/i18n/aliases.json','utf8'));
const locations=JSON.parse(fs.readFileSync('docs/i18n/message-locations.json','utf8'));
function register(text,file,line){
 let key=registry[text];if(!key){const ns=file.replaceAll('\\','/').split('/')[2]?.replace(/\.[^.]+$/,'')||'common';const words=text.match(/[A-Za-z0-9]+/g)||['text'];let slug=words.slice(0,8).map((w,i)=>i?w[0].toUpperCase()+w.slice(1).toLowerCase():w.toLowerCase()).join('');key=ns+'.'+slug;if(Object.values(registry).includes(key))key+='_'+crypto.createHash('sha1').update(text).digest('hex').slice(0,6);registry[text]=key;}
 en[key]=text;aliases[text]=key;(locations[key]||=[]).push({file:file.replaceAll('\\','/'),line});return key;
}
const natural=text=>/^[A-Z][a-z]|^[A-Z] [a-z]|^[a-z]+ [a-z]+|^\d+ [A-Za-z]|^@seen /u.test(text)&&!/[{}<>]|(?:^|\s)(?:bg-|text-|border-|rounded-|flex|grid|hidden|block|absolute|relative|inline-|items-|opacity-|hover:|focus:|px-|py-)|^https?:|^M\d|^image\//.test(text);
let count=0;
for(const file of filesIn('src').filter(f=>/\.[jt]sx?$/.test(f)&&!/test\.|atseenMockData|[\\/]i18n[\\/]|[\\/]context[\\/]|uiLanguages|profileLanguages/.test(f))){
 const source=fs.readFileSync(file,'utf8'),ast=parse(source,{sourceType:'module',plugins:['jsx']});const edits=[],arrays=new Map();let tuple=false;
 traverse(ast,{
  StringLiteral(p){
   const text=p.node.value;if(!natural(text)||['Seen','Direct Access'].includes(text))return;
   const par=p.parentPath;
   // Display labels may change language; identifiers and native names must not.
   if(par.isObjectProperty()&&['value','key','id','code','type','name','sourceLabel','context','purpose','category','kind','role','className','color','path','to','url','method'].includes(par.node.key.name||par.node.key.value))return;
   if(par.isCallExpression()&&par.node.callee.type==='MemberExpression'&&par.node.callee.object.name==='repostService'&&par.node.callee.property.name==='toggle')return;
   if(par.isImportDeclaration()||par.isExportNamedDeclaration()||par.isBinaryExpression()||par.isSwitchCase()||par.isMemberExpression()||(par.isObjectProperty()||par.isObjectMethod())&&p.key==='key')return;
   if(par.isJSXAttribute())return;
   if(par.isCallExpression()&&/^(t|msg|__msg|label|includes|startsWith|endsWith|replace|replaceAll|test|match|split|join|add|has|remove|querySelector|querySelectorAll)$/.test(par.node.callee.name||par.node.callee.property?.name||''))return;
   if(p.findParent(a=>a.isJSXAttribute()&&!['title','aria-label','placeholder','alt'].includes(a.node.name.name)))return;
   if(p.findParent(a=>a.isCallExpression()&&/^(useState|setForm|setDraft|post|patch|put|mutate|createElement|dispatchEvent)$/.test(a.node.callee.name||a.node.callee.property?.name||'')))return;
   let module=!p.getFunctionParent();
   if(par.isArrayExpression()){
    // Only the display slots of key/label(/description) tuples, never API enum arrays.
    const first=par.node.elements[0];
    const variable=par.findParent(a=>a.isVariableDeclarator())?.node.id.name;
    if(variable==='languages')return;
    if(variable==='definitions'&&p.key!==1)return;
    const displayTuple=['definitions','holds','benefitRows'].includes(variable)||first?.type==='Identifier'||first?.type==='MemberExpression';
    if(!module||(!displayTuple&&(p.key===0||first?.type!=='StringLiteral'||!/^[a-zA-Z][a-zA-Z_-]*$/.test(first.value)))||par.node.elements.length>5)return;
    const key=register(text,file,p.node.loc.start.line);
    edits.push({start:p.node.start,end:p.node.end,value:`{ __uiMessage: ${JSON.stringify(key)} }`});arrays.set(par.node.start,par.node);tuple=true;return;
   }
   if(module){
    if(!par.isObjectProperty()||p.key!=='value')return;
    const keyName=par.node.key.name||par.node.key.value;
    if(['value','key','id','code','type','name','sourceLabel','context','purpose','category','kind','role','className','color','path','to','url','method'].includes(keyName))return;
    const key=register(text,file,p.node.loc.start.line);
    const rawKey=source.slice(par.node.key.start,par.node.key.end);
    const originalKey=par.node.computed?`[${rawKey}]`:rawKey;
    edits.push({start:par.node.start,end:par.node.end,value:`get ${originalKey}() { return __msg(${JSON.stringify(key)}); }`});return;
   }
   const key=register(text,file,p.node.loc.start.line);
   edits.push({start:p.node.start,end:p.node.end,value:`__msg(${JSON.stringify(key)})`});
  }
 });
 if(!edits.length)continue;
 for(const node of arrays.values()){
  // An existing localized tuple already supplies the lazy accessors.
  if(source.slice(Math.max(0,node.start-10),node.start).endsWith('__uiTuple('))continue;
  edits.push({start:node.start,end:node.start,value:'__uiTuple('});edits.push({start:node.end,end:node.end,value:')'});
 }
 let output=source;for(const e of edits.sort((a,b)=>b.start-a.start||b.end-a.end))output=output.slice(0,e.start)+e.value+output.slice(e.end);
 const runtime=path.relative(path.dirname(file),'src/i18n/runtime.js').replaceAll('\\','/');
 if(!source.includes('msg as __msg'))output=`import { msg as __msg } from ${JSON.stringify(runtime.startsWith('.')?runtime:'./'+runtime)};\n`+output;
 if(tuple&&!source.includes('localizedTuple as __uiTuple'))output=`import { localizedTuple as __uiTuple } from ${JSON.stringify(runtime.startsWith('.')?runtime:'./'+runtime)};\n`+output;
 // Components introduced by this pass also need a reactive subscription.
 if(!source.includes('__useUiLanguage')){
  let ast2;try { ast2=parse(output,{sourceType:'module',plugins:['jsx']}); } catch(error) { fs.writeFileSync('tmp/i18n-conversion-error.txt',output);throw new Error(file+': '+error.message); } const insert=[];
  traverse(ast2,{Function(p){const n=p.node;const name=n.id?.name||(p.parentPath.isVariableDeclarator()?p.parentPath.node.id.name:'');if(!/^[A-Z]/.test(name||''))return;if(n.body.type==='BlockStatement')insert.push(n.body.start+1);}});
  for(const i of insert.sort((a,b)=>b-a))output=output.slice(0,i)+'\n  __useUiLanguage();'+output.slice(i);
  if(insert.length){const hook=path.relative(path.dirname(file),'src/hooks/useLanguage.js').replaceAll('\\','/');output=`import { useLanguage as __useUiLanguage } from ${JSON.stringify(hook.startsWith('.')?hook:'./'+hook)};\n`+output;}
 }
 try { parse(output,{sourceType:'module',plugins:['jsx']}); } catch(error) { fs.writeFileSync('tmp/i18n-conversion-error.txt',output);throw new Error(file+': '+error.message); }
 const backup=path.join('tmp/i18n-before',file);fs.mkdirSync(path.dirname(backup),{recursive:true});if(!fs.existsSync(backup))fs.writeFileSync(backup,source);
 fs.writeFileSync(file,output);count++;
 for(const [target,data] of [['src/i18n/source-registry.json',registry],['src/i18n/locales/en.json',en],['src/i18n/aliases.json',aliases],['docs/i18n/message-locations.json',locations]])fs.writeFileSync(target,JSON.stringify(data,null,2)+'\n');
}
for(const [file,data] of [['src/i18n/source-registry.json',registry],['src/i18n/locales/en.json',en],['src/i18n/aliases.json',aliases],['docs/i18n/message-locations.json',locations]])fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({modules:count,keys:Object.keys(en).length}));
