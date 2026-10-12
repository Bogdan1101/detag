#!/usr/bin/env python3
"""Functional browser checks for the modern site (Playwright + Chromium)."""
import json
from pathlib import Path
import shutil
import sys
from urllib.parse import urlsplit, unquote
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://127.0.0.1:5173'
data = json.loads((ROOT / 'src/data/content.json').read_text())
original = json.loads((ROOT / 'reports/mirror.json').read_text())
routes = ['/' + r['path'] for r in original['resources'] if 'text/html' in r.get('type', '')]
errors = []
external = []
failures = []

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=shutil.which('chromium'), headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    def offline(route):
        if urlsplit(route.request.url).hostname == urlsplit(BASE).hostname:
            route.continue_()
        else:
            external.append(route.request.url)
            route.abort()
    context.route('**/*', offline)
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append({'page': page.url, 'error': str(e)}))
    page.on('response', lambda r: failures.append({'url': r.url, 'status': r.status}) if r.status >= 400 else None)
    for route in routes:
        response = page.goto(BASE + route, wait_until='networkidle')
        page.locator('h1').wait_for()
        assert response.status == 200, route
        assert page.locator('h1').inner_text() != 'Страница не найдена', route
        assert not page.eval_on_selector_all('img', '''async xs => {
            xs.forEach(x => x.loading = 'eager');
            await Promise.all(xs.map(x => x.decode().catch(() => null)));
            return xs.filter(x => !x.complete || !x.naturalWidth).map(x => x.src);
        }'''), route
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), route
    page.goto(BASE, wait_until='networkidle')
    page.screenshot(path=str(ROOT / 'reports/modern-home-desktop.png'), full_page=True)
    page.get_by_role('link', name='Выбрать оборудование').click()
    assert page.locator('.product-card').count() == len(data['products'])
    page.get_by_label('Поиск оборудования').fill('40х50')
    page.get_by_label('Поиск оборудования').press('Enter')
    page.wait_for_url('**/catalog.html?q=*')
    assert page.locator('.product-card').count() == 1
    page.locator('.product-title').click()
    page.get_by_role('button', name='Увеличить фотографию товара').click()
    page.locator('dialog[open] img').wait_for()
    assert page.locator('dialog[open] img').evaluate('x=>x.complete && x.naturalWidth>0')
    page.keyboard.press('Escape')
    expect(page.locator('dialog')).to_have_count(0)
    page.get_by_role('button', name='Добавить в корзину', exact=True).click()
    page.get_by_role('button', name='Открыть корзину, 1 товар', exact=True).click()
    cart = page.get_by_role('dialog', name='Корзина оборудования')
    cart.get_by_role('button', name='Увеличить количество:', exact=False).click()
    expect(cart.get_by_label('Количество', exact=True)).to_have_text('2')
    mail = cart.get_by_role('link', name='Запросить стоимость по почте').get_attribute('href')
    assert mail.startswith('mailto:sales@detag.ru') and '2 шт.' in unquote(mail)
    page.keyboard.press('Escape')
    page.reload(wait_until='networkidle')
    page.get_by_role('button', name='Открыть корзину, 2 товара', exact=True).click()
    cart = page.get_by_role('dialog', name='Корзина оборудования')
    expect(cart.get_by_label('Количество', exact=True)).to_have_text('2')
    cart.get_by_role('button', name='Удалить:', exact=False).click()
    expect(cart).to_contain_text('Пока здесь пусто')
    page.keyboard.press('Escape')
    page.goto(BASE + '/catalog.html?q=zzzzzzzzzzz', wait_until='networkidle')
    assert page.get_by_role('heading', name='Ничего не нашлось').count()
    page.goto(BASE + '/catalog.html', wait_until='networkidle')
    page.get_by_label('Сортировка товаров').select_option('az')
    first_az = page.locator('.product-title').first.inner_text()
    page.get_by_label('Сортировка товаров').select_option('za')
    assert first_az != page.locator('.product-title').first.inner_text()
    page.goto(BASE + '/kontakty.html', wait_until='networkidle')
    assert page.locator('.contact-grid a[href="tel:+79672017071"]').count()
    page.screenshot(path=str(ROOT / 'reports/modern-contacts-desktop.png'), full_page=True)
    page.goto(BASE + '/poluchit-kosultatsiyu.html', wait_until='networkidle')
    page.get_by_label('Как к вам обращаться').fill('Тест')
    page.get_by_label('Что хотите защитить?').fill('Магазин одежды')
    mail = page.get_by_role('link', name='Подготовить письмо').get_attribute('href')
    assert 'Тест' in unquote(mail) and 'Магазин одежды' in unquote(mail)
    page.goto(BASE + '/404.html', wait_until='networkidle')
    assert page.get_by_role('heading', name='Страница не найдена').count()
    page.set_viewport_size({'width': 390, 'height': 844})
    for route in ['/', '/catalog.html', data['products'][0]['path'], '/kontakty.html', '/partneram.html', '/privacy/']:
        page.goto(BASE + route, wait_until='networkidle')
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), route
    page.goto(BASE, wait_until='networkidle')
    page.screenshot(path=str(ROOT / 'reports/modern-home-mobile.png'), full_page=True)
    page.get_by_role('button', name='Открыть меню', exact=True).click()
    page.locator('nav').get_by_role('link', name='Контакты', exact=True).click()
    assert page.get_by_role('heading', name='Контакты', exact=True).count()
    page.screenshot(path=str(ROOT / 'reports/modern-contacts-mobile.png'), full_page=True)
    page.goto(BASE + '/catalog.html', wait_until='networkidle')
    page.screenshot(path=str(ROOT / 'reports/modern-catalog-mobile.png'), full_page=True)
    result = {'base_url': BASE, 'original_routes_checked': len(routes), 'products': len(data['products']),
              'categories': len(data['categories']), 'javascript_errors': errors, 'external_requests': external,
              'http_failures': failures, 'search_passed': True, 'empty_search_passed': True,
              'cart_quantity_persistence_and_removal_passed': True, 'email_drafts_passed': True,
              'image_dialog_passed': True, 'sort_passed': True, 'mobile_navigation_passed': True,
              'responsive_layout_passed': True, 'unknown_route_passed': True}
    (ROOT / 'reports/modern-browser.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    browser.close()
    assert not errors, errors
    assert not external, external
    assert not failures, failures
