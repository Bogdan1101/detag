#!/usr/bin/env python3
"""Convert the archived public pages into editable frontend content data.

Requires lxml only for content migration; frontend builds use the retained JSON.
"""
import json
from pathlib import Path
from urllib.parse import urlsplit, unquote, quote
from lxml import html, etree

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'archive'

def text(node):
    return ' '.join(node.text_content().split())

def image(src):
    return quote(unquote(urlsplit(src).path), safe='/')

def rich(node):
    allowed = {'p', 'div', 'span', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'a', 'img', 'br', 'table', 'tbody', 'tr', 'td', 'th'}
    for el in list(node.iterdescendants()):
        if not isinstance(el.tag, str):
            continue
        if el.tag in {'script', 'style', 'iframe', 'object', 'form'}:
            el.drop_tree()
            continue
        if el.tag not in allowed:
            el.drop_tag()
            continue
        attrs = dict(el.attrib)
        el.attrib.clear()
        if el.tag == 'img':
            src = image(attrs.get('src', ''))
            if not (ROOT / 'public' / unquote(src).lstrip('/')).is_file():
                el.drop_tree()
                continue
            el.set('src', src)
            el.set('alt', attrs.get('alt') or 'Иллюстрация')
            el.set('loading', 'lazy')
        if el.tag == 'a':
            href = attrs.get('href', '')
            u = urlsplit(href)
            if u.scheme not in ('', 'https', 'http', 'mailto', 'tel'):
                el.drop_tag()
            else:
                el.set('href', u.path if u.hostname in ('detag.ru', 'www.detag.ru') else href)
    return (node.text or '') + ''.join(html.tostring(el, encoding='unicode') for el in node)

docs = {p.relative_to(ARCHIVE).as_posix(): html.fromstring(p.read_bytes()) for p in ARCHIVE.rglob('*.html')}
category_images = {}
for doc in docs.values():
    for link in doc.xpath('//ins[contains(@class,"thumbnail")]//a[img]'):
        href = urlsplit(link.get('href', '')).path
        category_images[href] = image(link.xpath('.//img')[0].get('src', ''))

categories = []
products = []
pages = []
for path, doc in sorted(docs.items()):
    title = text(doc.xpath('//title')[0])
    if path.startswith('catalog/'):
        stem = Path(path).stem
        parts = Path(path).parts
        categories.append({'id': stem, 'title': title, 'path': '/' + path,
                           'parentId': parts[1] if len(parts) > 2 else None,
                           'image': category_images.get('/' + path, ''),
                           'description': ''})
    if path.endswith('-detail.html'):
        main = doc.xpath('//*[contains(@class,"main-image")]//img')
        desc = doc.xpath('//*[contains(@class,"product-description")]')
        desc_html = rich(desc[0]) if desc else ''
        parts = Path(path).parts
        product_title = title.split(' : ', 1)[-1]
        specs = []
        if desc:
            for p in desc[0].xpath('.//p'):
                value = text(p)
                if ':' in value:
                    key, val = value.split(':', 1)
                    specs.append({'label': key.strip(), 'value': val.strip()})
        products.append({'id': Path(path).stem.removesuffix('-detail'), 'title': product_title,
                         'path': '/' + path, 'categoryId': parts[-2], 'groupId': parts[2],
                         'image': image(main[0].get('src', '')) if main else '',
                         'descriptionHtml': desc_html, 'specs': specs, 'price': None})
    elif not path.startswith(('catalog', 'component/')):
        content = doc.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," item-page ")]')
        if content:
            route = '/' + path.replace('index.html', '') if path.endswith('index.html') else '/' + path
            pages.append({'path': route, 'title': title, 'contentHtml': rich(content[0])})

data = {'source': 'https://detag.ru/', 'snapshotDate': '2026-10-12', 'categories': categories,
        'products': products, 'pages': pages}
(ROOT / 'src/data/content.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(len(categories), 'categories;', len(products), 'products;', len(pages), 'content pages')
