#!/usr/bin/env python3
"""Validate archived hashes and all static resources and page links locally."""
import hashlib
import json
from pathlib import Path
import sys
from urllib.parse import urlsplit, unquote
from urllib.request import urlopen
from html.parser import HTMLParser
import concurrent.futures

ROOT = Path(__file__).resolve().parents[1]
BASE = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://127.0.0.1:8000'
report = json.loads((ROOT / 'reports/mirror.json').read_text())
errors = []
expected_missing = set()
missing_paths = {unquote(urlsplit(row['url']).path) for row in report['failures']}
for row in report['resources']:
    if 'path' in row:
        body = (ROOT / 'archive' / row['path']).read_bytes()
        if hashlib.sha256(body).hexdigest() != row['sha256']:
            errors.append('Archive checksum mismatch: ' + row['path'])

class Links(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ['src', 'poster'] + (['href'] if tag in ('a', 'link') else []):
            value = attrs.get(key, '')
            if value.startswith('/') and not value.startswith('//'):
                path = unquote(urlsplit(value).path).lstrip('/')
                target = ROOT / 'snapshot' / path
                if target.is_dir():
                    target = target / 'index.html'
                if not target.is_file():
                    if '/' + path in missing_paths:
                        expected_missing.add(value)
                    else:
                        errors.append('Unresolved local reference: ' + value)

pages = json.loads((ROOT / 'snapshot/_local/pages.json').read_text())
for page in pages:
    parser = Links()
    parser.feed((ROOT / 'snapshot' / unquote(page['url']).lstrip('/')).read_text())

def check(page):
    try:
        with urlopen(BASE + page['url'], timeout=15) as response:
            body = response.read().decode('utf-8')
            if response.status != 200 or '<html' not in body.lower() or '/_local/offline.js' not in body:
                return page['url']
    except Exception as e:
        return page['url'] + ': ' + str(e)

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    errors.extend('HTTP check failed: ' + result for result in pool.map(check, pages) if result)
result = {'pages_checked': len(pages), 'archive_hashes_checked': report['downloaded'],
          'errors': sorted(set(errors)), 'source_missing_resources': len(report['failures'])}
result['expected_missing_references'] = sorted(expected_missing)
(ROOT / 'reports/validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(bool(errors))
