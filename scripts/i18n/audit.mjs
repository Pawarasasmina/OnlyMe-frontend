import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
const traverse = traverseModule.default;
export function filesIn(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? filesIn(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
export const textAttrs = new Set(['title','label','subtitle','description','placeholder','aria-label','alt','emptyMessage','loadingLabel','confirmLabel','cancelLabel','helperText','message','tooltip','hint','caption','detail']);
export const normalize = text => text.replace(/\s+/g,' ').trim();
function codeLiteral(p) {
  const parent=p.parentPath;
  return parent?.isImportDeclaration() || parent?.isExportNamedDeclaration() || parent?.isBinaryExpression() || parent?.isSwitchCase() || parent?.isObjectProperty() && p.key==='key' || parent?.isMemberExpression() || parent?.isDirectiveLiteral();
}
export function reason(p) {
  const value=p.node.value;
  if(typeof value!=='string'||!/[A-Za-z]/.test(value)||!normalize(value)||codeLiteral(p))return null;
  if(p.isJSXText()) return 'jsx-text';
  const parent=p.parentPath;
  if(parent?.isJSXAttribute()) return textAttrs.has(parent.node.name.name) ? 'attribute' : null;
  if(parent?.isObjectProperty() && textAttrs.has(parent.node.key.name || parent.node.key.value) && !parent.node.computed && parent.node.value===p.node) return 'copy-property';
  const call=p.findParent(a=>a.isCallExpression());
  if(call && call.node.arguments.includes(p.node)) {
    const callee=call.node.callee;
    const name=callee.name || callee.property?.name || '';
    if(/^(setError|setMessage|setNotice|setFeedback|setSuccess|setToast|toast|alert|confirm|showToast|notify|normalizeApiError)$/.test(name))return 'notification';
    if(name==='t'||name==='msg') return null;
  }
  let out=p;
  while(out.parentPath?.isConditionalExpression() && out.key!=='test' || out.parentPath?.isLogicalExpression() && out.key==='right' || out.parentPath?.isArrayExpression())out=out.parentPath;
  if(out.parentPath?.isJSXExpressionContainer()) {
    const attr=out.parentPath.parentPath;
    if(attr?.isJSXAttribute()&&!textAttrs.has(attr.node.name.name))return null;
    return 'render-expression';
  }
  return null;
}
export function inventory() {
  const result={files:[],routes:[],strings:{},references:['design/web.html','seen-prototype-changes-oct17-19.pdf','atseen-dev-changes-oct20-26.pdf']};
  for(const file of filesIn('src').filter(f=>/\.[jt]sx?$/.test(f)&& !/\.test\.|[\\/]i18n[\\/]|languagePickerCopy/.test(f))){
    const source=fs.readFileSync(file,'utf8');let ast;
    try{ast=parse(source,{sourceType:'module',plugins:['jsx']});}catch(e){throw new Error(`${file}: ${e.message}`);}
    const found=[];
    traverse(ast,{JSXAttribute(p){if(p.node.name.name==='path' && p.node.value?.type==='StringLiteral')result.routes.push({path:p.node.value.value,file});},'JSXText|StringLiteral'(p){const kind=reason(p);if(!kind)return;const text=normalize(p.node.value);const entry={file: file.replaceAll('\\','/'),line:p.node.loc.start.line,kind};found.push({text,...entry});(result.strings[text]||=[]).push(entry);}});
    result.files.push({file:file.replaceAll('\\','/'),count:found.length,strings:found});
  }
  return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve('scripts/i18n/audit.mjs')){
  const result=inventory();fs.mkdirSync('docs/i18n',{recursive:true});fs.writeFileSync('docs/i18n/source-inventory.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({files:result.files.length,routes:result.routes.length,uniqueCandidates:Object.keys(result.strings).length,occurrences:result.files.reduce((s,f)=>s+f.count,0)}));
}
