"""Development-only, offline catalog drafting. Never imported by the application.
Only static source messages are read; user content and API records are not inputs.
Generated drafts require terminology and linguistic review before release.
"""
import sys, json, pathlib, re, time
sys.path.insert(0, str(pathlib.Path('tmp/i18n-tools').resolve()))
import ctranslate2
import sentencepiece

root=pathlib.Path('src/i18n/locales')
english=json.loads((root/'en.json').read_text(encoding='utf-8'))
reference=json.loads(pathlib.Path('tmp/prototype-ui-translations.json').read_text(encoding='utf-8'))
model=ctranslate2.Translator('tmp/i18n-model', device='cpu', compute_type='int8', intra_threads=3, inter_threads=1)
sp=sentencepiece.SentencePieceProcessor(model_file='tmp/i18n-model/sentencepiece.bpe.model')
review=[]

def protect(text):
    placeholders=[]
    def add(m):
        placeholders.append(m.group());return str(900000+len(placeholders))
    return re.sub(r'\{[^{}]+\}|@seen|Direct Access|\bSeens?\b|https?://\S+|[\w.+-]+@[\w.-]+',add,text),placeholders

def restore(text, placeholders):
    for i,value in enumerate(placeholders):
        marker=str(900001+i)
        pattern=r'[\s,.\u066c]*'.join(marker)
        text,count=re.subn(pattern,lambda _:value,text)
        if count!=1:return None
    return text

for lang in sys.argv[1:] or ['ar','ru','uk','es','pt','fr','de']:
    file=root/(lang+'.json')
    output=json.loads(file.read_text(encoding='utf-8')) if file.exists() else {}
    prototype=reference[lang]
    for key,text in english.items():
        if text in prototype:output[key]=prototype[text]
        elif text in ['@seen','Seen','Direct Access']:output[key]=text
    pending=[(key,text) for key,text in english.items() if key not in output]
    started=time.time()
    for start in range(0,len(pending),24):
        batch=pending[start:start+24]
        prepared=[protect(text) for _,text in batch]
        inputs=[['__en__']+sp.encode(text,out_type=str)+['</s>'] for text,_ in prepared]
        results=model.translate_batch(inputs,target_prefix=[['__'+lang+'__']]*len(inputs),beam_size=1,max_decoding_length=180,repetition_penalty=1.1)
        for (key,source),result,(_,placeholders) in zip(batch,results,prepared):
            text=sp.decode([x for x in result.hypotheses[0] if not x.startswith('__') and x!='</s>'])
            translated=restore(text,placeholders)
            if translated is not None and translated.strip():output[key]=translated
            else:review.append({'language':lang,'key':key,'source':source,'draft':text,'reason':'placeholder mismatch'})
        draft=pathlib.Path('tmp/i18n-drafts')/(lang+'.json')
        draft.parent.mkdir(exist_ok=True)
        draft.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        pathlib.Path('tmp/i18n-draft-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
        if start%240==0: print(f'{lang} {min(start+24,len(pending))}/{len(pending)} {time.time()-started:.1f}s',flush=True)
    file.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'{lang} complete: {len(output)}/{len(english)}; review {len(review)}',flush=True)
