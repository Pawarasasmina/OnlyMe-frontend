"""Offline static-catalog drafting. Never reads user content or connects to an API.

Reuses existing translations first. New model output is recorded for language review.
Run catalog validation and review the resulting diff before release.
"""
import json
import pathlib
import re
import sys
import time

sys.path.insert(0, str(pathlib.Path('tmp/i18n-tools').resolve()))
import ctranslate2
import sentencepiece

root = pathlib.Path('src/i18n/locales')
english = json.loads((root / 'en.json').read_text(encoding='utf-8'))
approved = json.loads(pathlib.Path('src/i18n/approved-identical.json').read_text(encoding='utf-8'))
prototype = json.loads(pathlib.Path('scripts/i18n/prototype-reference.json').read_text(encoding='utf-8'))
model = ctranslate2.Translator('tmp/i18n-model', device='cpu', compute_type='int8', intra_threads=4)
sp = sentencepiece.SentencePieceProcessor(model_file='tmp/i18n-model/sentencepiece.bpe.model')
review_path = pathlib.Path('docs/i18n/system-translation-review.json')
review = json.loads(review_path.read_text(encoding='utf-8')) if review_path.exists() else []
coverage_file = pathlib.Path('docs/i18n/coverage.json')
coverage = json.loads(coverage_file.read_text(encoding='utf-8')) if coverage_file.exists() else {}

def normalized(text):
    return re.sub(r'\s+', ' ', text).strip().casefold()

def protected(text):
    values = []
    def replace(match):
        values.append(match.group())
        return str(900000 + len(values))
    text = re.sub(r'\{[^{}]+\}|@seen|Atseen|OnlyMe|Direct Access|\bSeens?\b|https?://\S+|[\w.+-]+@[\w.-]+', replace, text)
    return text, values

for language in [arg for arg in sys.argv[1:] if not arg.startswith('--')] or ['ar', 'ru', 'uk', 'es', 'pt', 'fr', 'de']:
    file = root / (language + '.json')
    output = json.loads(file.read_text(encoding='utf-8'))
    if '--repair-identical' in sys.argv:
        for entry in coverage.get('locales', {}).get(language, {}).get('unexpectedEnglish', []):
            if output.get(entry['key']) == english.get(entry['key']):
                output.pop(entry['key'], None)
    reusable = {normalized(english[key]): value for key, value in output.items() if key in english and normalized(english[key]) != normalized(value)}
    reusable.update({normalized(key): value for key, value in prototype[language].items() if normalized(key) != normalized(value)})
    pending = {}
    for key, source in english.items():
        if key in output:
            continue
        match = reusable.get(normalized(source))
        if match and sorted(re.findall(r'\{\w+\}', source)) == sorted(re.findall(r'\{\w+\}', match)):
            output[key] = match
        elif source in approved.get('all', []) or not re.search('[A-Za-z]{2}', source):
            output[key] = source
        else:
            if re.search(r'\{\w+,\s*(?:plural|select|selectordinal),', source):
                raise ValueError('ICU branches need explicit translations: ' + key)
            pending.setdefault(source, []).append(key)
    entries = list(pending.items())
    started = time.time()
    for start in range(0, len(entries), 24):
        batch = entries[start:start + 24]
        prepared = [protected(text) for text, _ in batch]
        results = model.translate_batch(
            [['__en__'] + sp.encode(text, out_type=str) + ['</s>'] for text, _ in prepared],
            target_prefix=[['__' + language + '__']] * len(batch),
            beam_size=3, max_decoding_length=1600, repetition_penalty=1.1,
        )
        for (source, keys), result, (_, values) in zip(batch, results, prepared):
            translated = sp.decode([token for token in result.hypotheses[0] if not token.startswith('__') and token != '</s>'])
            valid = True
            for index, value in enumerate(values):
                marker = str(900001 + index)
                pattern = r'[\s,.\u066c]*'.join(marker)
                translated, count = re.subn(pattern, lambda _: value, translated)
                valid = valid and count == 1
            if not valid or not translated.strip():
                review.append({'language': language, 'keys': keys, 'source': source, 'draft': translated, 'status': 'placeholder-repair-needed'})
                continue
            for key in keys:
                output[key] = translated
            review.append({'language': language, 'keys': keys, 'source': source, 'translation': translated, 'status': 'machine-draft'})
        file.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        review_path.write_text(json.dumps(review, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        if start % 120 == 0:
            print(f'{language}: {min(start + 24, len(entries))}/{len(entries)}; {time.time() - started:.0f}s', flush=True)
    print(f'{language}: {len(output)}/{len(english)} keys', flush=True)
