// Source-only migration: deliberately does not inspect or replace rendered DOM text.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import generateModule from '@babel/generator';
import { filesIn, reason, normalize, textAttrs } from './audit.mjs';
const traverse=traverseModule.default, generate=generateModule.default;
const readJson=(file,fallback)=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;
const english=readJson('src/i18n/locales/en.json',{}), aliases=readJson('src/i18n/aliases.json',{}), locations=readJson('docs/i18n/message-locations.json',{}), converted=readJson('docs/i18n/converted-files.json',[]);
const registryFile='src/i18n/source-registry.json';
const registry=fs.existsSync(registryFile)?JSON.parse(fs.readFileSync(registryFile,'utf8')):{};
function register(text,file,line){
  let key=registry[text];
  if(!key){
    const parts=file.replaceAll('\\','/').split('/');
    const namespace=parts[1]==='pages'?parts[2]:parts[1]==='components'?parts[2]:parts[1];
    const words=text.replace(/\{[^}]*\}/g,'').match(/[A-Za-z0-9]+/g)||['text'];
    const slug=words.slice(0,9).map((w,i)=>i?w[0].toUpperCase()+w.slice(1).toLowerCase():w.toLowerCase()).join('');
    key=`${namespace}.${slug}`;
    if(Object.values(registry).includes(key))key+=`_${crypto.createHash('sha1').update(text).digest('hex').slice(0,6)}`;
    registry[text]=key;
  }
  english[key]=text;aliases[text]=key;(locations[key]||=[]).push({file:file.replaceAll('\\','/'),line});return key;
}
function templateKind(p){
  const text=p.node.quasis.map(q=>q.value.cooked).join(' ');
  if(!/[A-Za-z]{2}/.test(text))return false;
  let out=p;
  while(out.parentPath?.isConditionalExpression()&&out.key!=='test'||out.parentPath?.isLogicalExpression()&&out.key==='right')out=out.parentPath;
  if(out.parentPath?.isJSXExpressionContainer()){
    const attr=out.parentPath.parentPath;
    return !attr.isJSXAttribute()||textAttrs.has(attr.node.name.name);
  }
  const par=p.parentPath;
  if(par.isCallExpression() && par.node.arguments.includes(p.node)) return /^(setError|setMessage|setNotice|setFeedback|setSuccess|setToast|toast|showToast|notify|normalizeApiError)$/.test(par.node.callee.name||par.node.callee.property?.name||'');
  return false;
}
function isModuleValue(p){return !p.getFunctionParent();}
const targets=filesIn('src').filter(f=>/\.[jt]sx?$/.test(f)&&!/\.test\.|atseenMockData|[\\/]i18n[\\/]|LanguageContext|uiLanguages|[\\/]utils[\\/]profileLanguages/.test(f));
for(const file of targets){
 const source=fs.readFileSync(file,'utf8');if(source.includes('/* i18n-source-migrated */'))continue;
 const ast=parse(source,{sourceType:'module',plugins:['jsx']});const edits=[];let used=false;
 const range=(start,end,value)=>{edits.push({start,end,value});used=true;};
 traverse(ast,{
  'JSXText|StringLiteral'(p){
   const kind=reason(p);if(!kind)return;
   const original=p.node.value,text=normalize(original);if(['@seen','Seen','Direct Access'].includes(text))return;
   // Empty strings, identifiers, route fragments and user-content examples are not UI copy.
   if(/^https?:|^data:|^\/|^[.#][\w-]+$/.test(text))return;
   const key=register(text,file,p.node.loc.start.line), call=`__msg(${JSON.stringify(key)})`;
   if(kind==='copy-property'&&isModuleValue(p)){
    const prop=p.parentPath.node;
    range(prop.start,prop.end,`get ${generate(prop.key).code}() { return ${call}; }`);return;
   }
   if(kind==='copy-property' && p.findParent(a=>a.isCallExpression()&& /^(useState|setForm|setDraft|mutate|post|put|patch)$/.test(a.node.callee.name||a.node.callee.property?.name||'')))return;
   if(kind==='jsx-text'){
    const leading=/^\s/.test(original)?' ':'';const trailing=/\s$/.test(original)?' ':'';
    // React drops newline indentation around text, but preserves explicit inline spaces.
    range(p.node.start,p.node.end,`${original.includes('\n')?'':leading}{${call}}${original.includes('\n')?'':trailing}`);
   }else range(p.node.start,p.node.end,kind==='attribute'?`{${call}}`:call);
  },
  TemplateLiteral(p){
   if(!templateKind(p))return;
   const values=[];let text='';
   p.node.quasis.forEach((q,i)=>{text+=(q.value.cooked||'').replaceAll('{',"'{' ").replaceAll('}'," '}'");if(i<p.node.expressions.length){text+=`{value${i}}`;values.push(`value${i}: ${source.slice(p.node.expressions[i].start,p.node.expressions[i].end)}`);}});
   const key=register(text,file,p.node.loc.start.line);range(p.node.start,p.node.end,`__msg(${JSON.stringify(key)}${values.length?`, { ${values.join(', ')} }`:''})`);p.skip();
  }
 });
 if(!used)continue;
 // Every React component subscribes, so config getters, formatted utilities and attributes
 // refresh alongside text nodes without remounting forms or replacing user content.
 traverse(ast,{Function(p){
   const node=p.node;const name=node.id?.name || (p.parentPath.isVariableDeclarator()?p.parentPath.node.id.name:'');
   const isComponent=/^[A-Z]/.test(name||'');
   const forward=p.parentPath.isCallExpression() && ['forwardRef','memo'].includes(p.parentPath.node.callee.name||p.parentPath.node.callee.property?.name);
   if(!isComponent&&!forward)return;
   if(node.body.type==='BlockStatement')range(node.body.start+1,node.body.start+1,'\n  __useUiLanguage();');
   else {range(node.body.start,node.body.start,'{ __useUiLanguage(); return (');range(node.body.end,node.body.end,'); }');}
 }});
 const runtime=path.relative(path.dirname(file),'src/i18n/runtime.js').replaceAll('\\','/');
 const hook=path.relative(path.dirname(file),'src/hooks/useLanguage.js').replaceAll('\\','/');
 const hasHook=edits.some(e=>e.value.includes('__useUiLanguage'));
 const prefix=`/* i18n-source-migrated */\nimport { msg as __msg } from ${JSON.stringify(runtime.startsWith('.')?runtime:'./'+runtime)};\n${hasHook?`import { useLanguage as __useUiLanguage } from ${JSON.stringify(hook.startsWith('.')?hook:'./'+hook)};\n`:''}`;
 const sorted=edits.sort((a,b)=>b.start-a.start||b.end-a.end);let last=source.length+1,output=source;
 for(const edit of sorted){if(edit.end>last)throw new Error(`Overlapping migration in ${file}:${edit.start}`);output=output.slice(0,edit.start)+edit.value+output.slice(edit.end);last=edit.start;}
 output=prefix+output;parse(output,{sourceType:'module',plugins:['jsx']});
 const backup=path.join('tmp/i18n-before',file);fs.mkdirSync(path.dirname(backup),{recursive:true});if(!fs.existsSync(backup))fs.writeFileSync(backup,source);
 fs.writeFileSync(file,output);converted.push(file.replaceAll('\\','/'));
}
fs.writeFileSync(registryFile,JSON.stringify(registry,null,2)+'\n');
fs.writeFileSync('src/i18n/locales/en.json',JSON.stringify(english,null,2)+'\n');
fs.writeFileSync('src/i18n/aliases.json',JSON.stringify(aliases,null,2)+'\n');
fs.writeFileSync('docs/i18n/message-locations.json',JSON.stringify(locations,null,2)+'\n');
fs.writeFileSync('docs/i18n/converted-files.json',JSON.stringify(converted,null,2)+'\n');
console.log(JSON.stringify({modules:converted.length,keys:Object.keys(english).length}));
