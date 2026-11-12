"""Repair long static-catalog drafts in sentence-sized chunks; no user data."""
import json
import pathlib
import re
import sys
sys.path.insert(0, str(pathlib.Path('tmp/i18n-tools').resolve()))
import ctranslate2
import sentencepiece
root = pathlib.Path('src/i18n/locales')
english = json.loads((root / 'en.json').read_text(encoding='utf-8'))
model = ctranslate2.Translator('tmp/i18n-model', device='cpu', compute_type='int8', intra_threads=4)
sp = sentencepiece.SentencePieceProcessor(model_file='tmp/i18n-model/sentencepiece.bpe.model')
protected = re.compile(r'\{[^{}]+\}|@seen|Atseen|OnlyMe|Direct Access|\bSeens?\b|\b\d+(?:[.,]\d+)*\b|https?://\S+|[\w.+-]+@[\w.-]+')

def translate(text, language):
    if not re.search('[A-Za-z]{2}', text):
        return text
    result = model.translate_batch([['__en__'] + sp.encode(text, out_type=str) + ['</s>']], target_prefix=[['__' + language + '__']], beam_size=4, max_decoding_length=1600)[0]
    return sp.decode([token for token in result.hypotheses[0] if not token.startswith('__') and token != '</s>'])

for language in ['ar', 'ru', 'uk', 'es', 'pt', 'fr', 'de']:
    file = root / (language + '.json')
    output = json.loads(file.read_text(encoding='utf-8'))
    for key, source in english.items():
        if key in output or len(source) < 250:
            continue
        translated_sentences = []
        for sentence in re.split(r'(?<=[.!?])\s+', source):
            values = []
            def mask(match):
                values.append(match.group())
                return str(900000 + len(values))
            draft = translate(protected.sub(mask, sentence), language)
            valid = True
            for index, value in enumerate(values):
                draft, count = re.subn(r'[\s,.\u066c]*'.join(str(900001 + index)), lambda _: value, draft)
                valid = valid and count == 1
            if not valid:
                # Keep protected text literally if the model drops a marker.
                parts = []
                offset = 0
                for match in protected.finditer(sentence):
                    fragment = sentence[offset:match.start()]
                    if fragment.strip():
                        parts.append((' ' if fragment.startswith(' ') else '') + translate(fragment.strip(), language) + (' ' if fragment.endswith(' ') else ''))
                    parts.append(match.group())
                    offset = match.end()
                fragment = sentence[offset:]
                if fragment.strip():
                    parts.append((' ' if fragment.startswith(' ') else '') + translate(fragment.strip(), language))
                draft = ''.join(parts)
            translated_sentences.append(draft)
        output[key] = ' '.join(translated_sentences)
        print(language, key, 'repaired', flush=True)
    file.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
