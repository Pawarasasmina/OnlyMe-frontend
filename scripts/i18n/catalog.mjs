import fs from 'node:fs';import {parse} from '@babel/parser';import traverseModule from '@babel/traverse';import {filesIn} from './audit.mjs';
const traverse=traverseModule.default;
const locales=['en','ar','ru','uk','es','pt','fr','de'];
const resources=Object.fromEntries(locales.map(lang=>[lang,JSON.parse(fs.readFileSync(`src/i18n/locales/${lang}.json`,'utf8'))]));
const aliases=JSON.parse(fs.readFileSync('src/i18n/aliases.json','utf8'));
const reasonMessages=JSON.parse(fs.readFileSync('src/i18n/reviewed-reasons.json','utf8'));
const enumMessages=JSON.parse(fs.readFileSync('src/i18n/enum-messages.json','utf8'));
for(const [code,translations] of Object.entries(reasonMessages)){
 if(translations.length!==8)throw new Error(`Invalid moderation reason: ${code}`);
 const key=`moderation.reason.${code.toLowerCase()}`;
 aliases[translations[0]] ||= key;
 enumMessages[code]=key;
 for(const [index,locale] of locales.entries())resources[locale][key]=translations[index];
}
fs.writeFileSync('src/i18n/enum-messages.json',JSON.stringify(enumMessages,null,2)+'\n');
const reviewed=JSON.parse(fs.readFileSync('src/i18n/reviewed.json','utf8'));
const prototype=JSON.parse(fs.readFileSync('scripts/i18n/prototype-reference.json','utf8'));
const normalize=text=>text.normalize('NFKC').toLowerCase().replaceAll('&',' and ').replace(/[’‘]/g,"'").replace(/can't|could not|unable to|couldn't/g,'cannot').match(/[a-z0-9]+/g)?.join(' ')||'';
const affixes=text=>{const first=text.search(/[A-Za-z0-9]/);const last=Math.max(...[...text.matchAll(/[A-Za-z0-9]/g)].map(m=>m.index));return {prefix:text.slice(0,first),suffix:text.slice(last+1)};};
for(const locale of locales.filter(l=>l!=='en')){
 const entries=Object.entries(prototype[locale]).filter(([,target])=>typeof target==='string'&&target.trim());const normalized=new Map(entries.map(([source,target])=>[normalize(source),{source,target}]));
 for(const [key,source] of Object.entries(resources.en)){
  if(/[{}]/.test(source)||['seen','@seen','direct access'].includes(source.toLowerCase()))continue;
  const match=normalized.get(normalize(source));if(!match)continue;
  const before=affixes(match.source),after=affixes(source);let translated=match.target;
  if(before.prefix&&translated.startsWith(before.prefix))translated=translated.slice(before.prefix.length);
  if(before.suffix&&translated.endsWith(before.suffix))translated=translated.slice(0,-before.suffix.length);
  resources[locale][key]=after.prefix+translated+after.suffix;
 }
}
const counts=JSON.parse(fs.readFileSync('src/i18n/reviewed-counts.json','utf8'));
for(const [key,values] of Object.entries({...reviewed.messages,...counts})){
 for(const [i,locale] of locales.entries())resources[locale][key]=values[i];
 aliases[values[0]]=key;
}
const extraLabels=['reviewed-labels','reviewed-details','reviewed-final-labels','reviewed-activity','reviewed-verification','reviewed-system'].flatMap(name=>JSON.parse(fs.readFileSync(`src/i18n/${name}.json`,'utf8')));
extraLabels.push(...Object.values(reasonMessages));
const settingsReview=JSON.parse(fs.readFileSync('src/i18n/reviewed-settings.json','utf8'));
for(const [key,translations] of Object.entries(settingsReview)){
 if(!resources.en[key]||translations.length!==7)throw new Error(`Invalid reviewed Settings message: ${key}`);
 extraLabels.push([resources.en[key],...translations]);
}
for(const row of [...reviewed.sourceOverrides,...extraLabels]){
 const key=aliases[row[0]]||`language.${row[0].replaceAll(' ','').replace(/^./,c=>c.toLowerCase())}`;
 aliases[row[0]]=key;
 for(const match of new Set([key,...Object.keys(resources.en).filter(k=>resources.en[k]===row[0])]))for(const [i,locale] of locales.entries())resources[locale][match]=row[i];
}
for(const name of ['Alex','Anna','Ethan','Ethan Brooks','Barcelona','Paris','Tokyo','Lina','Max','Omar','Español','Français','Português (Portugal)','Snapchat','Georgia','Consolas']){
 for(const key of Object.keys(resources.en).filter(k=>resources.en[k]===name))for(const locale of locales)resources[locale][key]=name;
}
// Template syntax shown to email-template administrators is literal content.
if(resources.en['admin.text'])for(const locale of locales)resources[locale]['admin.text']="'{{firstName}}'";
for(const locale of ['es','pt','fr','de'])resources[locale]['common.actorAction']=`{gender, select, other {${reviewed.messages['common.actorAction'][locales.indexOf(locale)]}}}`;
// The existing picker has reviewed prototype copy for all eight languages.
const picker=JSON.parse(fs.readFileSync('src/utils/languagePickerCopy.json','utf8'));
for(const [locale,values] of Object.entries(picker))for(const [source,translated] of Object.entries(values)){
 const key=aliases[source]|| (source.startsWith('Choose the language')?'language.description':`language.${source.replaceAll(' ','')}`);
 aliases[source]=key;resources.en[key]=source;resources[locale][key]=translated;
}
const required=new Set();
for(const file of filesIn('src').filter(f=>/\.[jt]sx?$/.test(f)&&!/[\\/]i18n[\\/]|\.test\./.test(f))){
 traverse(parse(fs.readFileSync(file,'utf8'),{sourceType:'module',plugins:['jsx']}),{CallExpression(p){
  if(['__msg','msg'].includes(p.node.callee.name)&&p.node.arguments[0]?.type==='StringLiteral')required.add(p.node.arguments[0].value);
  if(p.node.callee.name==='t'&&p.node.arguments[0]?.type==='StringLiteral'){
   const source=p.node.arguments[0].value;
   if(!aliases[source]&&!resources.en[source]){const key='legacy.'+source.replace(/[^a-zA-Z0-9]+/g,'_').slice(0,100);resources.en[key]=source;aliases[source]=key;}
  }
 },ObjectProperty(p){if(p.node.key.name==='__uiMessage'&&p.node.value.type==='StringLiteral')required.add(p.node.value.value);}});
}
const unknown=[...required].filter(key=>!resources.en[key]&&!aliases[key]);
// Recover the small set of messages registered immediately before a migration parse failed.
const candidates=fs.existsSync('tmp/i18n-remaining-filtered.json')?JSON.parse(fs.readFileSync('tmp/i18n-remaining-filtered.json','utf8')):[];
for(const item of candidates){const ns=item.file.replaceAll('\\','/').split('/')[2]?.replace(/\.[^.]+$/,'')||'common';const words=item.text.match(/[A-Za-z0-9]+/g)||['text'];const slug=words.slice(0,8).map((w,i)=>i?w[0].toUpperCase()+w.slice(1).toLowerCase():w.toLowerCase()).join('');const key=ns+'.'+slug;if(unknown.includes(key)){resources.en[key]=item.text;aliases[item.text]=key;}}
// Replace bare count messages with CLDR plural messages without changing call-site values.
for(const [key,source] of Object.entries(resources.en)){
 const match=source.match(/^\{value0\} (followers|members|comments|chapters|messages)$/);
 if(match)for(const locale of locales)resources[locale][key]=resources[locale][`common.${match[1]}Count`].replaceAll('count','value0');
}
for(const locale of locales){
 for(const [key,text] of Object.entries(resources[locale]))resources[locale][key]=text.replace(/(?<=[A-Za-zÀ-ÿ])'(?=\{)/g,"''");
 fs.writeFileSync(`src/i18n/locales/${locale}.json`,JSON.stringify(resources[locale],null,2)+'\n');
}
fs.writeFileSync('src/i18n/aliases.json',JSON.stringify(aliases,null,2)+'\n');
console.log(JSON.stringify({required:required.size,unregistered:[...required].filter(k=>!resources.en[k]&&!aliases[k]),keys:Object.keys(resources.en).length}));
