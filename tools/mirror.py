#!/usr/bin/env python3
"""Archive public detag.ru pages and create a self-contained static copy."""
import concurrent.futures
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit, unquote, quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://detag.ru/'
HOSTS = {'detag.ru', 'www.detag.ru'}
EXTERNAL = {'ajax.googleapis.com'}
CSS_URL = re.compile(r'url\(\s*([\"\']?)(.*?)\1\s*\)', re.I)
ATTR = re.compile(r'(\b(?:href|src|poster|background|action)\s*=\s*)([\"\'])(.*?)\2', re.I | re.S)
SCRIPT = re.compile(r'<script\b[^>]*>.*?</script\s*>', re.I | re.S)


def canonical(value, base=ORIGIN):
    value = html.unescape(value.strip())
    if not value or value.startswith(('#', 'data:', 'mailto:', 'tel:', 'javascript:')):
        return None
    u = urlsplit(urljoin(base, value))
    if u.scheme not in ('http', 'https') or u.hostname not in HOSTS | EXTERNAL:
        return None
    path = quote(unquote(u.path or '/'), safe='/@:+,;=()!~*\'')
    if any(part == '..' for part in unquote(path).split('/')):
        return None
    if u.hostname in HOSTS:
        # Navigation/context and ordering variations duplicate the same content.
        query = urlencode([(k, v) for k, v in parse_qsl(u.query) if k.lower() not in
                           {'itemid', 'orderby', 'dir', 'limit', 'tmpl', 'print'}])
        return urlunsplit(('https', 'detag.ru', path, query, ''))
    return urlunsplit(('https', u.hostname, path, u.query, ''))


def local_path(url, content_type):
    u = urlsplit(url)
    path = unquote(u.path).lstrip('/')
    if u.hostname not in HOSTS:
        path = '_vendor/' + u.hostname + '/' + path
    if 'text/html' in content_type:
        if not path or path.endswith('/'):
            path += 'index.html'
        elif not path.endswith(('.html', '.htm')):
            path += '.html'
    if not path:
        path = 'index.html'
    p = Path(path)
    if u.query:
        p = p.with_name(p.stem + '.__q_' + hashlib.sha256(u.query.encode()).hexdigest()[:12] + p.suffix)
    return p.as_posix()


class Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.urls = []
        self.base = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'base':
            self.base = attrs.get('href')
        for key in ('src', 'poster', 'background'):
            if attrs.get(key):
                self.urls.append(attrs[key])
        if tag in ('a', 'link') and attrs.get('href'):
            self.urls.append(attrs['href'])
        if attrs.get('style'):
            self.urls.extend(m[1] for m in CSS_URL.findall(attrs['style']))


def discover(body, url, content_type):
    text = body.decode('utf-8', errors='replace')
    base = url
    refs = []
    if 'text/html' in content_type:
        parser = Links()
        parser.feed(text)
        base = urljoin(url, parser.base) if parser.base else url
        refs += parser.urls
        # Includes image variables and CSS inside <style> elements.
        refs += re.findall(r"[\"'](/[^\"'\n<>]+\.(?:png|gif|jpe?g|svg|pdf|woff2?))[\"']", text, re.I)
    if 'text/html' in content_type or 'css' in content_type:
        refs += [m[1] for m in CSS_URL.findall(text)]
        refs += re.findall(r'@import\s+[\"\']([^\"\']+)[\"\']', text, re.I)
    for ref in refs:
        target = canonical(ref, base)
        if not target:
            continue
        path = urlsplit(target).path
        if any(part in path for part in ('/administrator', '/user/', '/askquestion', '/recommend', '/edit', '/checkout')):
            continue
        # Only GET navigation and resources; never submit forms or mutate the shop.
        if any(k.lower() in {'task', 'add', 'remove', 'delete', 'keyword'} for k, _ in parse_qsl(urlsplit(target).query)):
            continue
        yield target


def fetch(url):
    for attempt in range(3):
        try:
            time.sleep(.15)
            req = Request(url, headers={'User-Agent': 'Detag family website archival copy/1.0'})
            with urlopen(req, timeout=40) as response:
                body = response.read()
                kind = response.headers.get('Content-Type', 'application/octet-stream')
                return {'url': url, 'status': response.status, 'type': kind,
                        'final_url': response.url, 'body': body}
        except HTTPError as e:
            if e.code < 500 or attempt == 2:
                return {'url': url, 'status': e.code, 'error': str(e)}
        except (URLError, TimeoutError, OSError) as e:
            if attempt == 2:
                return {'url': url, 'status': 0, 'error': str(e)}
        time.sleep(attempt + 1)


def rewrite(text, url, kind, records):
    base = url
    if 'text/html' in kind:
        parser = Links()
        parser.feed(text)
        base = urljoin(url, parser.base) if parser.base else url
    def convert(value):
        target = canonical(value, base)
        if target is None:
            return value
        row = records.get(target)
        if row and row.get('path'):
            result = '/' + quote(row['path'], safe='/')
            if urlsplit(html.unescape(value)).fragment:
                result += '#' + urlsplit(html.unescape(value)).fragment
            return result
        if urlsplit(target).hostname in HOSTS:
            # Missing source assets remain missing locally; use browser fallbacks.
            u = urlsplit(target)
            return u.path + ('?' + u.query if u.query else '')
        return value
    if 'text/html' in kind:
        scripts = []
        def script_filter(match):
            script = match.group()
            if any(token in script for token in ('google-analytics.com', 'code.jivosite.com',
                     'userapi.com', 'recaptcha/api.js', 'grecaptcha.', 'counter.yadro.ru',
                     '/media/system/js/modal.js', '/media/system/js/validate.js')):
                return '<!-- External tracking/widget omitted from the local copy. -->'
            # These old Joomla widgets depend on MooTools, absent on the source site.
            # The local helper provides image viewing and blocks backend-only actions.
            script = re.sub(r"window\.addEvent\('domready', function\(\)\s*\{\s*SqueezeBox\.initialize.*?\n\s*\}\);",
                            '', script, flags=re.S)
            script = script.replace("vmSiteurl = 'https://detag.ru/'", "vmSiteurl = '/'")
            start, content = script.split('>', 1)
            start = ATTR.sub(lambda m: m[1] + m[2] + html.escape(convert(m[3]), quote=True) + m[2], start)
            scripts.append(start + '>' + content)
            return f'<!--LOCAL_SCRIPT_{len(scripts)-1}-->'
        text = SCRIPT.sub(script_filter, text)
        text = ATTR.sub(lambda m: m[1] + m[2] + html.escape(convert(m[3]), quote=True) + m[2], text)
        text = re.sub(r'(<a\b[^>]*?)href=([\"\'])([^\"\']*(?:/cart/edit_|/component/users/)[^\"\']*)\2',
                      lambda m: m[1] + 'data-local-unavailable="true" href="#"', text, flags=re.I)
        text = re.sub(r'<base\b[^>]*>', '<base href="/">', text, flags=re.I)
        for index, script in enumerate(scripts):
            text = text.replace(f'<!--LOCAL_SCRIPT_{index}-->', script)
        text = re.sub(r'</head\s*>', '<script src="/_local/offline.js"></script>\n</head>', text, flags=re.I)
    text = CSS_URL.sub(lambda m: 'url("' + convert(m[2]) + '")', text)
    if 'css' in kind:
        text = re.sub(r'(@import\s+)([\"\'])([^\"\']+)([\"\'])',
                      lambda m: m[1] + m[2] + convert(m[3]) + m[4], text)
    return text


def main():
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rebuild', action='store_true', help='Rebuild snapshot/ from the existing archive without network requests')
    args = parser.parse_args()
    archive = ROOT / 'archive'
    public = ROOT / 'snapshot'
    archive.mkdir(exist_ok=True)
    public.mkdir(exist_ok=True)
    previous = json.loads((ROOT / 'reports/mirror.json').read_text()) if args.rebuild else None
    records = {r['url']: r for r in previous['resources']} if previous else {}
    queue = set() if args.rebuild else {ORIGIN}
    started = previous['started_at'] if previous else time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        while queue:
            batch = sorted(queue - records.keys())
            queue = set()
            if len(records) + len(batch) > 5000:
                raise RuntimeError('Crawl exceeded 5000 URLs; inspect navigation before continuing.')
            for result in pool.map(fetch, batch):
                url = result['url']
                body = result.pop('body', None)
                if body is not None:
                    path = local_path(url, result['type'])
                    result.update(path=path, bytes=len(body), sha256=hashlib.sha256(body).hexdigest())
                    dest = archive / path
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(body)
                    if 'text/html' in result['type'] or 'css' in result['type']:
                        queue.update(discover(body, url, result['type']))
                records[url] = result
                print(len(records), result['status'], url, flush=True)
    pages = []
    for url, row in records.items():
        if 'path' not in row:
            continue
        body = (archive / row['path']).read_bytes()
        kind = row['type']
        if 'text/html' in kind or 'css' in kind:
            source = body.decode('utf-8', errors='replace')
            body = rewrite(source, url, kind, records).encode('utf-8')
            if 'text/html' in kind:
                title = re.search(r'<title[^>]*>(.*?)</title>', source, re.I | re.S)
                pages.append({'url': '/' + quote(row['path'], safe='/'),
                              'title': html.unescape(title[1]).strip() if title else row['path']})
        dest = public / row['path']
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(body)
    (public / '_local').mkdir(exist_ok=True)
    (public / '_local/pages.json').write_text(json.dumps(pages, ensure_ascii=False, indent=2) + '\n')
    report = {'source': ORIGIN, 'started_at': started,
              'finished_at': previous['finished_at'] if previous else time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
              'pages': len(pages), 'downloaded': sum('path' in r for r in records.values()),
              'failures': [r for r in records.values() if 'path' not in r], 'resources': list(records.values())}
    (ROOT / 'reports').mkdir(exist_ok=True)
    (ROOT / 'reports/mirror.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print('RESULT', report['pages'], 'pages;', report['downloaded'], 'files;', len(report['failures']), 'failures')


if __name__ == '__main__':
    main()
