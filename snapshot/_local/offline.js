/* Local-only behavior; no form is submitted to the former Joomla server. */
(function () {
    'use strict';
    var message = 'Это сохранённая копия сайта. Отправка заявок, подписка и оформление заказа пока не подключены. Свяжитесь с компанией по телефону +7 (967) 201-70-71 или sales@detag.ru.';
    document.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var input = event.target.querySelector('[name="keyword"]');
        if (!input) {
            window.alert(message);
            return;
        }
        var keyword = input.value.trim().toLocaleLowerCase('ru');
        if (!keyword || keyword === 'поиск...') return;
        fetch('/_local/pages.json').then(function (response) {
            if (!response.ok) throw new Error('Search index unavailable');
            return response.json();
        }).then(function (pages) {
            var old = document.getElementById('local-search-results');
            if (old) old.remove();
            var panel = document.createElement('div');
            panel.id = 'local-search-results';
            panel.style.cssText = 'position:fixed;inset:8%;overflow:auto;background:white;color:#222;padding:24px;border:2px solid #dc671d;z-index:20000;font:16px Arial,sans-serif;box-shadow:0 10px 50px #555';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-label', 'Результаты поиска');
            var close = document.createElement('button');
            close.textContent = 'Закрыть';
            close.style.float = 'right';
            close.onclick = function () { panel.remove(); input.focus(); };
            panel.appendChild(close);
            var title = document.createElement('h2');
            title.textContent = 'Поиск по сохранённым страницам';
            panel.appendChild(title);
            var seen = Object.create(null);
            var matches = pages.filter(function (page) {
                if (!page.title.toLocaleLowerCase('ru').includes(keyword) || seen[page.title]) return false;
                seen[page.title] = true;
                return true;
            });
            var count = document.createElement('p');
            count.textContent = matches.length ? 'Найдено страниц: ' + matches.length : 'По этому запросу страницы не найдены.';
            panel.appendChild(count);
            matches.forEach(function (page) {
                var paragraph = document.createElement('p');
                var link = document.createElement('a');
                link.href = page.url;
                link.textContent = page.title;
                paragraph.appendChild(link);
                panel.appendChild(paragraph);
            });
            document.body.appendChild(panel);
            close.focus();
        }).catch(function () { window.alert('Не удалось загрузить индекс поиска. Откройте сайт через локальный HTTP-сервер.'); });
    }, true);
    document.addEventListener('click', function (event) {
        var target = event.target.closest('.addtocart-button, [name="addtocart"], .ask-a-question, [data-local-unavailable], a[href*="/component/users/"]');
        if (target) {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.alert(message);
        }
        var imageLink = event.target.closest('a.modal');
        if (imageLink && /\.(png|gif|jpe?g|webp)(?:[?#]|$)/i.test(imageLink.href)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            var overlay = document.createElement('dialog');
            overlay.style.cssText = 'border:0;padding:16px;max-width:90vw;max-height:90vh;background:white';
            var close = document.createElement('button');
            close.textContent = 'Закрыть';
            close.style.cssText = 'display:block;margin-left:auto;margin-bottom:12px';
            close.onclick = function () { overlay.close(); };
            overlay.addEventListener('close', function () { overlay.remove(); imageLink.focus(); });
            var image = document.createElement('img');
            image.src = imageLink.href;
            image.alt = imageLink.title || 'Фотография товара';
            image.style.cssText = 'display:block;max-width:85vw;max-height:75vh;object-fit:contain';
            overlay.appendChild(close);
            overlay.appendChild(image);
            document.body.appendChild(overlay);
            overlay.showModal();
        }
    }, true);
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('form').forEach(function (form) {
            if (!form.querySelector('[name="keyword"]')) form.title = 'Сохранённая копия: отправка формы пока не подключена';
        });
    });
}());
