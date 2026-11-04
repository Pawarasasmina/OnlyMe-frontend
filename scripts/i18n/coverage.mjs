import fs from 'node:fs';import {parse as parseIcu} from '@formatjs/icu-messageformat-parser';
import {parse} from '@babel/parser';import traverseModule from '@babel/traverse';import {filesIn} from './audit.mjs';
const traverse=traverseModule.default;
const locales=['en','ar','ru','uk','es','pt','fr','de'];
const catalogs=Object.fromEntries(locales.map(l=>[l,JSON.parse(fs.readFileSync(`src/i18n/locales/${l}.json`,'utf8'))]));
const aliases=JSON.parse(fs.readFileSync('src/i18n/aliases.json','utf8'));
const approved=JSON.parse(fs.readFileSync('src/i18n/approved-identical.json','utf8'));
const reviewed=JSON.parse(fs.readFileSync('src/i18n/reviewed.json','utf8'));
const reviewedRows=[...reviewed.sourceOverrides,...['reviewed-labels','reviewed-details','reviewed-final-labels','reviewed-activity','reviewed-verification'].flatMap(name=>JSON.parse(fs.readFileSync(`src/i18n/${name}.json`,'utf8')))];
reviewedRows.push(...Object.entries(JSON.parse(fs.readFileSync('src/i18n/reviewed-settings.json','utf8'))).map(([key,translations])=>[catalogs.en[key],...translations]));
reviewedRows.push(...Object.values(JSON.parse(fs.readFileSync('src/i18n/reviewed-reasons.json','utf8'))));
const args=nodes=>[...new Set(nodes.flatMap(n=> n.options ? [n.value,...Object.values(n.options).flatMap(o=>args(o.value))] : n.type>0&&n.type<5?[n.value]:[]))].sort();
const report={locales:{},source:{},references:{html:fs.existsSync('D:/Downloads/-seen-copy-main (15)/-seen-copy-main/design/web.html'),oct17:fs.existsSync('D:/Downloads/seen-prototype-changes-oct17-19.pdf'),oct20:fs.existsSync('D:/Downloads/atseen-dev-changes-oct20-26.pdf')}};
const brand=/^(?:Seen|Seens|Direct Access|@seen(?:\.com)?|WhatsApp|Telegram|Instagram|Facebook|YouTube|Stripe|CSV|PDF|JSON|JPEG|PNG|WebP|MP4|AI|IBAN|SWIFT|UTC|PPM|ID|Email|E-mail|URL|OTP|Georgia|Consolas|Arial|Roboto|Inter|OAuth|RSS|API|HD|JPG|GPS|HTML|OK|Admin)$/i;
for(const locale of locales){const c=catalogs[locale],missing=[],invalid=[],identical=[];
 for(const [key,source] of Object.entries(catalogs.en)){
  if(!Object.hasOwn(c,key)||!c[key]?.trim()){missing.push(key);continue;}
  try{const expected=args(parseIcu(source,{ignoreTag:true}));const actual=args(parseIcu(c[key],{ignoreTag:true}));if(expected.join(',')!==actual.join(','))invalid.push({key,reason:'arguments',expected,actual});}catch(error){invalid.push({key,reason:error.message});}
  if(locale!=='en'&&source===c[key]&&!brand.test(source)&&/[A-Za-z]{3}/.test(source)&&!/^https?:|\w+@\w|^atseen\.com\//.test(source))identical.push({key,source});
 }
 const approvedTexts=new Set([...(approved.all||[]),...(approved[locale]||[]),...reviewedRows.filter(row=>row[0]?.toLowerCase()===row[locales.indexOf(locale)]?.toLowerCase()).map(row=>row[0]),...Object.values(reviewed.messages).filter(row=>row[0]===row[locales.indexOf(locale)]).map(row=>row[0])].map(t=>t.toLowerCase()));
 const unexpectedEnglish=identical.filter(item=>!approvedTexts.has(item.source.toLowerCase()));
 report.locales[locale]={keys:Object.keys(c).length,required:Object.keys(catalogs.en).length,missing,invalid,identical,unexpectedEnglish};
}
const unregistered=[],raw=[],routes=[];let modules=0;
for(const file of filesIn('src').filter(f=>/\.[jt]sx?$/.test(f)&&!/[\\/]i18n[\\/]|\.test\./.test(f))){modules++;const source=fs.readFileSync(file,'utf8');traverse(parse(source,{sourceType:'module',plugins:['jsx']}),{
 CallExpression(p){if(['msg','__msg','t'].includes(p.node.callee.name)&&p.node.arguments[0]?.type==='StringLiteral'){const key=p.node.arguments[0].value;if(!catalogs.en[key]&&!aliases[key])unregistered.push({file,line:p.node.loc.start.line,key});}},
 JSXText(p){const text=p.node.value.replace(/\s+/g,' ').trim();if(/[A-Za-z]{2}/.test(text)&&!brand.test(text))raw.push({file,line:p.node.loc.start.line,text});},
 JSXAttribute(p){if(p.node.name.name==='path'&&p.node.value?.type==='StringLiteral')routes.push(p.node.value.value);}
});}
report.source={modules,routeDeclarations:routes.length,routes,unregistered,rawJsx:raw};
fs.writeFileSync('docs/i18n/coverage.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({source: {...report.source,routes:undefined},locales:Object.fromEntries(Object.entries(report.locales).map(([l,v])=>[l,{keys:v.keys,missing:v.missing.length,invalid:v.invalid.length,identical:v.identical.length}]))},null,2));
if(unregistered.length||raw.length||Object.values(report.locales).some(l=>l.missing.length||l.invalid.length||l.unexpectedEnglish.length))process.exitCode=1;
