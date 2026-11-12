import fs from 'node:fs';import path from 'node:path';import {parse} from '@babel/parser';import traverseModule from '@babel/traverse';import {filesIn} from './audit.mjs';const traverse=traverseModule.default;
let total=0;
for(const file of filesIn('src').filter(f=>/\.[jt]sx?$/.test(f)&&!/test\.|[\\/]i18n[\\/]|uiLanguages|profileLanguages/.test(f))){
 const source=fs.readFileSync(file,'utf8');const ast=parse(source,{sourceType:'module',plugins:['jsx']});let edits=[];
 traverse(ast,{'NewExpression|CallExpression'(p){
  const callee=p.node.callee;
  const intl=callee.type==='MemberExpression'&&callee.object.name==='Intl'&&['NumberFormat','DateTimeFormat','RelativeTimeFormat','PluralRules','ListFormat','DisplayNames'].includes(callee.property.name);
  const method=callee.type==='MemberExpression'&&['toLocaleDateString','toLocaleTimeString','toLocaleString'].includes(callee.property.name);
  if(!intl&&!method)return;
  const first=p.node.arguments[0];
  if(first&&(first.type==='StringLiteral'&&/^(en(-US|-GB)?|ru-RU|ar)$/.test(first.value)||first.type==='Identifier'&&first.name==='undefined'||first.type==='ArrayExpression'&&!first.elements.length))edits.push({start:first.start,end:first.end,text:'__uiLocale()'});
  else if(!first)edits.push({start:p.node.end-1,end:p.node.end-1,text:'__uiLocale()'});
 }});
 if(!edits.length)continue;
 let result=source;for(const e of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,e.start)+e.text+result.slice(e.end);
 const relative=path.relative(path.dirname(file),'src/i18n/runtime.js').replaceAll('\\','/');if(!source.includes('getLocale as __uiLocale'))result=`import { getLocale as __uiLocale } from ${JSON.stringify(relative.startsWith('.')?relative:'./'+relative)};\n`+result;
 parse(result,{sourceType:'module',plugins:['jsx']});fs.writeFileSync(file,result);total+=edits.length;
}console.log(`${total} locale formatters updated`);
