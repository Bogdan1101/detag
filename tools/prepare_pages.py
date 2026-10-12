#!/usr/bin/env python3
"""Create HTML entries for public routes on GitHub Pages (no server fallback)."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
entry = (dist / 'index.html').read_bytes()
report = json.loads((root / 'reports/mirror.json').read_text())
routes = {r['path'] for r in report['resources'] if 'text/html' in r.get('type', '')}
routes.update({'cart/index.html', 'catalog/index.html'})
for route in routes:
    target = dist / route
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(entry)
(dist / '404.html').write_bytes(entry)
(dist / '.nojekyll').touch()
print(f'Prepared {len(routes)} HTML entry points for GitHub Pages.')
