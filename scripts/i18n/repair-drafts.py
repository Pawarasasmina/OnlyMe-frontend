"""Offline repair of missing interpolation drafts; preserves every placeholder and number.
These entries remain explicitly marked for linguistic review in the coverage report.
"""
import sys,json,pathlib,re,time
sys.path.insert(0,str(pathlib.Path('tmp/i18n-tools').resolve()))
import ctranslate2,sentencepiece
root=pathlib.Path('src/i18n/locales');en=json.loads((root/'en.json').read_text(encoding='utf-8'))
model=ctranslate2.Translator('tmp/i18n-model',device='cpu',compute_type='int8',intra_threads=3)
sp=sentencepiece.SentencePieceProcessor(model_file='tmp/i18n-model/sentencepiece.bpe.model')
review=[]
for lang in ['ar','ru','uk','es','pt','fr','de']:
 file=root/(lang+'.json');out=json.loads(file.read_text(encoding='utf-8'))
 missing=[(k,v) for k,v in en.items() if k not in out]
 parts={};segments={}
 for key,source in missing:
  if ', plural,' in source or ', select,' in source:continue
  pieces=re.split(r'(\{[^{}]+\}|@seen|Direct Access|\bSeens?\b|\b\d+(?:[.,]\d+)*\b)',source)
  parts[key]=pieces
  for i in range(0,len(pieces),2):
   fragment=pieces[i].strip()
   if re.search('[A-Za-z]{2}',fragment):segments[fragment]=None
 fragments=list(segments)
 for start in range(0,len(fragments),24):
  batch=fragments[start:start+24]
  result=model.translate_batch([['__en__']+sp.encode(s,out_type=str)+['</s>'] for s in batch],target_prefix=[['__'+lang+'__']]*len(batch),beam_size=2,max_decoding_length=180)
  for text,r in zip(batch,result):segments[text]=sp.decode([t for t in r.hypotheses[0] if not t.startswith('__') and t!='</s>'])
 for key,pieces in parts.items():
  for i in range(0,len(pieces),2):
   original=pieces[i];fragment=original.strip()
   if fragment in segments:
    pieces[i]=(' ' if original.startswith(' ') else '')+segments[fragment]+(' ' if original.endswith(' ') else '')
  out[key]=''.join(pieces)
  review.append({'language':lang,'key':key,'method':'segmented draft; linguistic review required'})
 file.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(lang,len(missing),'repaired',len(parts),flush=True)
pathlib.Path('docs/i18n/segmented-drafts.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
