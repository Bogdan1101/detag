#!/usr/bin/env python3
"""Publish the prepared dist/ to gh-pages, preserving the source checkout."""
import os
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
if '/detag/assets/' not in (dist / 'index.html').read_text():
    raise SystemExit('First run npm run build:pages; this build does not target /detag/.')

def git(*args, cwd=root, env=None):
    return subprocess.check_output(['git', *args], cwd=cwd, env=env, text=True).strip()

git_dir = git('rev-parse', '--absolute-git-dir')
remote = git('ls-remote', 'origin', 'refs/heads/gh-pages')
parent = None
if remote:
    git('fetch', 'origin', 'refs/heads/gh-pages')
    parent = git('rev-parse', 'FETCH_HEAD')

with tempfile.TemporaryDirectory(prefix='detag-pages-') as temp:
    env = os.environ.copy()
    env['GIT_INDEX_FILE'] = str(Path(temp) / 'index')
    prefix = [f'--git-dir={git_dir}', f'--work-tree={dist}']
    git(*prefix, 'read-tree', '--empty', cwd=dist, env=env)
    git(*prefix, 'add', '--force', '--all', '.', cwd=dist, env=env)
    tree = git(*prefix, 'write-tree', cwd=dist, env=env)
    if parent and tree == git('rev-parse', parent + '^{tree}'):
        print('gh-pages already contains this build.')
    else:
        args = ['commit-tree', tree, '-m', 'Publish Detag website to GitHub Pages']
        if parent:
            args += ['-p', parent]
        commit = git(*args)
        git('push', 'origin', commit + ':refs/heads/gh-pages')
        print('Published gh-pages commit:', commit)
print('Website address: https://bogdan1101.github.io/detag/ (requires Pages enabled in repository settings).')
