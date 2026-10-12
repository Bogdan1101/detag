import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Mail, MapPin, Menu, Minus, Package, Phone, Plus, Search, ShieldCheck, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import content from './data/content.json';
import promotion from './data/promotion.json';
import { sitePath, routePath, localHtml } from './paths';

type Product = typeof content.products[number];
type Category = typeof content.categories[number];
type Cart = Record<string, number>;
const roots = content.categories.filter(c => !c.parentId);
const phone = '+7 (967) 201-70-71';
const email = 'sales@detag.ru';
const links = [
  ['/o-kompanii.html', 'О компании'], ['/aktsii.html', 'Акции'], ['/oplata-i-dostavka.html', 'Оплата и доставка'],
  ['/partneram.html', 'Партнёрам'], ['/nashi-klienty.html', 'Наши клиенты'], ['/kontakty.html', 'Контакты'],
];
const plural = (n: number) => n % 10 === 1 && n % 100 !== 11 ? 'товар' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'товара' : 'товаров';
const normalized = (s: string) => s.toLocaleLowerCase('ru').replaceAll('ё', 'е');

function loadCart(): Cart {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('detag-cart') || '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([id, qty]) =>
      content.products.some(p => p.id === id) && Number.isInteger(qty) && qty > 0 && qty <= 999));
  } catch { return {}; }
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog className="modal" ref={ref} onClose={onClose} onClick={e => {
    if (e.target === e.currentTarget) {
      const bounds = e.currentTarget.getBoundingClientRect();
      if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) onClose();
    }
  }} aria-label={title}>
    <div className="modal-top"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Закрыть"><X /></button></div>
    {children}
  </dialog>;
}

function ProductCard({ product, add }: { product: Product; add: (id: string) => void }) {
  const category = content.categories.find(c => c.id === product.categoryId);
  return <article className="product-card">
    <a className="product-picture" href={sitePath(product.path)} aria-label={product.title}><img src={sitePath(product.image)} alt={product.title} loading="lazy" /></a>
    <div className="product-info"><span className="small muted">{category?.title}</span>
      <a className="product-title" href={sitePath(product.path)}>{product.title}</a>
      <div className="product-bottom"><span>Цена по запросу</span><button className="add-button" onClick={() => add(product.id)} aria-label={`Добавить в корзину: ${product.title}`}><Plus size={19} /></button></div>
    </div>
  </article>;
}

function CategoryCard({ category, index }: { category: Category; index: number }) {
  return <a className="category-card" href={sitePath(category.path)}>
    <span className="category-number">0{index + 1}</span><ArrowUpRight className="category-arrow" size={22} />
    <div className="category-picture"><img src={sitePath(category.image)} alt="" loading="lazy" /></div>
    <h3>{category.title}</h3><span className="small muted">Посмотреть оборудование <ArrowRight size={14} /></span>
  </a>;
}

function ContactCTA({ open }: { open: () => void }) {
  return <section className="contact-cta wrap"><div><span className="eyebrow">ПОМОЖЕМ РАЗОБРАТЬСЯ</span><h2>Найдём решение<br />для вашего магазина.</h2><p>Расскажите о своей задаче — поможем подобрать<br className="desktop-break" /> оборудование и расходные материалы.</p></div>
    <div className="cta-right"><button className="button button-light" onClick={open}>Получить консультацию <ArrowUpRight size={19} /></button><a href="tel:+79672017071">{phone}</a><span>Или позвоните нам напрямую</span></div>
  </section>;
}

export default function App() {
  const [location, setLocation] = useState(window.location.pathname + window.location.search);
  const [cart, setCart] = useState<Cart>(loadCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState<Product | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [sort, setSort] = useState('default');
  const [contactName, setContactName] = useState('');
  const [contactText, setContactText] = useState('');
  const url = new URL(location, window.location.origin);
  const path = routePath(url.pathname).replace(/\/index\.html$/, '/') || '/';
  const query = url.searchParams.get('q') || '';
  const [search, setSearch] = useState(query);
  const product = content.products.find(p => p.path === path);
  const category = content.categories.find(c => c.path === path || c.path.replace('/catalog/', '/component/virtuemart/') === path);
  const article = content.pages.find(p => p.path === path);
  const isHome = path === '/';
  const isCatalog = path === '/catalog.html' || path === '/catalog' || path === '/catalog/' || !!category || path === '/component/virtuemart/search.html';
  const isContacts = path === '/kontakty.html';
  const isNews = path === '/allnews/';
  const isPromotions = path === '/aktsii.html';
  const isCart = path === '/component/virtuemart/cart.html' || path === '/cart' || path === '/cart/';
  const isConsult = path === '/poluchit-kosultatsiyu.html';
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const selected = content.products.filter(p => cart[p.id]);

  function navigate(href: string) {
    window.history.pushState(null, '', sitePath(href));
    setLocation(window.location.pathname + window.location.search);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }
  useEffect(() => {
    const pop = () => { setLocation(window.location.pathname + window.location.search); setMenuOpen(false); };
    window.addEventListener('popstate', pop);
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const a = (e.target as Element).closest('a');
      if (!a || a.target || a.hasAttribute('download')) return;
      const dest = new URL(a.href);
      if (dest.origin !== window.location.origin || !['http:', 'https:'].includes(dest.protocol) || dest.hash) return;
      e.preventDefault();
      navigate(routePath(dest.pathname) + dest.search);
    };
    document.addEventListener('click', click);
    return () => { window.removeEventListener('popstate', pop); document.removeEventListener('click', click); };
  }, []);
  useEffect(() => { setSearch(query); setSort('default'); }, [location, query]);
  useEffect(() => {
    try { localStorage.setItem('detag-cart', JSON.stringify(cart)); } catch { /* Private browser storage may be unavailable. */ }
  }, [cart]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    document.title = `${product?.title || category?.title || (isCatalog ? 'Каталог оборудования' : isNews ? 'Новости' : isCart ? 'Корзина' : article?.title || (isHome ? 'Системы безопасности для торговли' : 'Страница не найдена'))} — ДЕТАГ`;
  }, [location, product, category, article, isCatalog, isNews, isCart, isHome]);
  function add(id: string) {
    setCart(c => ({ ...c, [id]: Math.min((c[id] || 0) + 1, 999) }));
    setToast('Товар добавлен в корзину');
  }
  function change(id: string, qty: number) {
    setCart(c => { const next = { ...c }; if (qty <= 0) delete next[id]; else next[id] = Math.min(qty, 999); return next; });
  }
  function submitSearch(e: FormEvent) { e.preventDefault(); navigate('/catalog.html' + (search.trim() ? '?q=' + encodeURIComponent(search.trim()) : '')); }
  const inquiryBody = selected.map(p => `${p.title} — ${cart[p.id]} шт.`).join('\n');
  const inquiry = `mailto:${email}?subject=${encodeURIComponent('Запрос стоимости оборудования ДЕТАГ')}&body=${encodeURIComponent('Здравствуйте! Прошу уточнить стоимость и наличие:\n\n' + inquiryBody + '\n\nКонтакт для ответа: ')}`;
  const consultLink = `mailto:${email}?subject=${encodeURIComponent('Консультация по оборудованию')}&body=${encodeURIComponent('Здравствуйте!\nМеня зовут ' + contactName + '.\n\n' + contactText)}`;

  function cartContent() {
    return selected.length ? <>
      <p className="muted cart-note">Соберите список оборудования — мы уточним стоимость и наличие.</p>
      <div className="cart-list">{selected.map(p => <div className="cart-row" key={p.id}>
        <img src={sitePath(p.image)} alt="" /><div className="cart-item-info"><a href={sitePath(p.path)} onClick={() => setCartOpen(false)}>{p.title}</a><span className="small muted">Цена по запросу</span><div className="quantity"><button aria-label={`Уменьшить количество: ${p.title}`} onClick={() => change(p.id, cart[p.id] - 1)}><Minus size={14} /></button><span aria-label="Количество">{cart[p.id]}</span><button aria-label={`Увеличить количество: ${p.title}`} disabled={cart[p.id] >= 999} onClick={() => change(p.id, cart[p.id] + 1)}><Plus size={14} /></button></div></div>
        <button className="icon-button remove" aria-label={`Удалить: ${p.title}`} onClick={() => change(p.id, 0)}><Trash2 size={17} /></button>
      </div>)}</div>
      <div className="cart-total"><span>В списке</span><strong>{count} {plural(count)}</strong></div>
      <a className="button full" href={sitePath(inquiry)}>Запросить стоимость по почте <Mail size={18} /></a>
      <p className="small muted mail-note">Откроется ваша почтовая программа с готовым списком. Проверьте письмо и отправьте его самостоятельно. Заказ автоматически не оформляется.</p>
    </> : <div className="empty"><ShoppingBag size={42} strokeWidth={1.2} /><h3>Пока здесь пусто</h3><p>Добавьте оборудование из каталога,<br />чтобы запросить стоимость.</p><a className="button" href={sitePath('/catalog.html')} onClick={() => setCartOpen(false)}>Перейти в каталог <ArrowRight size={17} /></a></div>;
  }
  function consultContent() {
    return <div className="consult-content"><p className="muted">Поможем подобрать оборудование для вашей задачи. Позвоните нам или подготовьте письмо.</p><a className="contact-line" href="tel:+79672017071"><Phone size={20} />{phone}</a>
      <label>Как к вам обращаться<input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Ваше имя" maxLength={100} /></label>
      <label>Что хотите защитить?<textarea value={contactText} onChange={e => setContactText(e.target.value)} placeholder="Расскажите о магазине и необходимом оборудовании" rows={4} maxLength={1800} /></label>
      <a className="button full" href={sitePath(consultLink)}>Подготовить письмо <ArrowUpRight size={17} /></a>
      <p className="small muted mail-note">Письмо откроется в вашей почтовой программе. Данные не отправляются автоматически и не сохраняются на сервере.</p>
    </div>;
  }

  const filtered = content.products.filter(p => {
    const inCategory = !category || p.categoryId === category.id || p.groupId === category.id;
    const text = normalized(p.title + ' ' + p.specs.map(s => s.label + ' ' + s.value).join(' ') + ' ' + (content.categories.find(c => c.id === p.categoryId)?.title || ''));
    return inCategory && normalized(query).split(/\s+/).filter(Boolean).every(word => text.includes(word));
  });
  if (sort === 'az') filtered.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  if (sort === 'za') filtered.sort((a, b) => b.title.localeCompare(a.title, 'ru'));
  const childCategories = category ? content.categories.filter(c => c.parentId === category.id) : [];
  const featuredIds = ['datchik-radiochastotnyj-40kh50', 'butylochnyj-datchik', 'datchik-rakushka-designer-mini-d-45-mm', 'etiketka-radiochastotnaya-40kh40-mm-belaya'];

  return <>
    <a className="skip-link" href="#main">Перейти к содержимому</a>
    <div className="topbar"><div className="wrap"><span><ShieldCheck size={14} /> Безопасность начинается с правильного решения</span><div><a href="mailto:sales@detag.ru">sales@detag.ru</a><span className="top-separator" /><a href="tel:+79672017071">{phone}</a></div></div></div>
    <header className="header"><div className="wrap header-row">
      <a className="logo" href={sitePath('/')} aria-label="ДЕТАГ — на главную"><img src={sitePath('/images/logo.png')} alt="ДЕТАГ — системы безопасности" /></a>
      <form className="header-search" onSubmit={submitSearch} role="search"><Search size={19} /><input aria-label="Поиск оборудования" placeholder="Найти оборудование или расходные материалы" value={search} onChange={e => setSearch(e.target.value)} /><button type="submit" aria-label="Найти"><ArrowRight size={18} /></button></form>
      <button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`Открыть корзину, ${count} ${plural(count)}`}><span className="cart-symbol"><ShoppingBag size={22} />{count > 0 && <b>{count}</b>}</span><span className="cart-caption">Ваш список<span>Корзина оборудования</span></span></button>
      <button className="mobile-menu icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>
    </div><nav className={'nav wrap ' + (menuOpen ? 'expanded' : '')} aria-label="Главная навигация"><a className={'nav-catalog ' + (isCatalog ? 'active' : '')} href={sitePath('/catalog.html')}><Menu size={17} />Каталог оборудования</a>{links.map(([href, title]) => <a key={href} className={path === href ? 'active' : ''} href={sitePath(href)}>{title}</a>)}<a className="nav-consult" href={sitePath('/poluchit-kosultatsiyu.html')}>Консультация <ArrowUpRight size={15} /></a></nav></header>

    <main id="main">
    {isHome ? <>
      <section className="hero wrap"><div className="hero-copy"><span className="eyebrow"><span className="dot" /> РЕШЕНИЯ ДЛЯ РОЗНИЧНОЙ ТОРГОВЛИ</span><h1>Защищаем товары.<br /><span>Сохраняем<br />ваш бизнес.</span></h1><p>Противокражные системы и расходные материалы.<br className="desktop-break" /> Всё, что нужно для безопасности вашего магазина.</p><div className="hero-actions"><a className="button" href={sitePath('/catalog.html')}>Выбрать оборудование <ArrowUpRight size={19} /></a><button className="text-button" onClick={() => setConsultOpen(true)}>Помощь в подборе <ArrowRight size={16} /></button></div><div className="hero-footnote"><span className="avatar-icon"><ShieldCheck size={19} /></span><span>Оборудование. Расходные материалы.<br /><strong>Одно надёжное решение.</strong></span></div></div>
        <div className="hero-visual"><div className="visual-grid" /><div className="hero-ring" /><span className="visual-label">ДЕТАГ / СИСТЕМЫ БЕЗОПАСНОСТИ</span><img className="hero-system" src={sitePath('/images/stories/virtuemart/product/sd-102b.jpg')} alt="Радиочастотная противокражная система SD 102B" /><div className="visual-card"><span className="visual-card-icon"><ShieldCheck size={23} /></span><div><strong>Защита без компромиссов</strong><span>Системы для вашего магазина</span></div></div><a className="visual-product" href={sitePath(content.products.find(p => p.id.endsWith('sd-102b'))!.path)}><span>РАДИОЧАСТОТНЫЕ СИСТЕМЫ<br /><strong>Система SD 102B</strong></span><ArrowUpRight size={24} /></a><span className="visual-index">01 / 04</span></div>
      </section>
      <section className="benefits wrap"><div><Package /><span><strong>Всё для защиты товаров</strong><small>Системы, датчики и этикетки</small></span></div><div><Truck /><span><strong>Доставка по России</strong><small>Транспортной компанией</small></span></div><div><Phone /><span><strong>Помощь в подборе</strong><small>Индивидуальный подход</small></span></div><div><ShieldCheck /><span><strong>Для бизнеса любого масштаба</strong><small>От магазина до торговой сети</small></span></div></section>
      <section className="section wrap"><div className="section-head"><div><span className="eyebrow">ПОДБЕРИТЕ СВОЁ РЕШЕНИЕ</span><h2>Оборудование по категориям</h2></div><a className="text-button" href={sitePath('/catalog.html')}>Весь каталог <ArrowUpRight size={19} /></a></div><div className="category-grid">{roots.map((c, i) => <CategoryCard category={c} index={i} key={c.id} />)}</div></section>
      <section className="section featured"><div className="wrap"><div className="section-head"><div><span className="eyebrow">ВЫБОР НАШИХ КЛИЕНТОВ</span><h2>Популярное оборудование</h2></div><a className="text-button" href={sitePath('/catalog.html')}>Все товары <ArrowUpRight size={19} /></a></div><div className="product-grid">{featuredIds.map(id => <ProductCard key={id} product={content.products.find(p => p.id === id)!} add={add} />)}</div></div></section>
      <section className="about-section wrap"><div className="about-mark"><ShieldCheck size={76} strokeWidth={1} /><span>ДЕТАГ</span><small>СИСТЕМЫ БЕЗОПАСНОСТИ</small></div><div><span className="eyebrow">О КОМПАНИИ</span><h2>Безопасность магазина —<br />наша общая задача.</h2><p>Обеспечиваем предприятия торговли противокражным оборудованием и расходными материалами. Помогаем подобрать сбалансированное решение с учётом задач вашего бизнеса.</p><a className="text-button" href={sitePath('/o-kompanii.html')}>Ближе познакомиться <ArrowUpRight size={18} /></a></div></section>
      <ContactCTA open={() => setConsultOpen(true)} />
      <section className="section wrap news-section"><div className="section-head"><h2>Новости компании</h2><a className="text-button" href={sitePath('/allnews/')}>Все новости <ArrowUpRight size={18} /></a></div><a className="news-card" href={sitePath('/allnews/19-novaya-novost.html')}><img src={sitePath('/images/euroshop%20heade.png')} alt="EuroShop 2017" /><div><span className="small muted">Архив · 2017</span><h3>EuroShop 2017</h3><p>Международная выставка технологий и решений для розничной торговли.</p></div><ArrowUpRight size={24} /></a></section>
    </> : <>
      <div className="wrap breadcrumbs"><a href={sitePath('/')}>Главная</a><ChevronRight size={13} />{(isCatalog || product) && <><a href={sitePath('/catalog.html')}>Каталог</a><ChevronRight size={13} /></>}<span>{product?.title || category?.title || (isCatalog ? 'Все товары' : isNews ? 'Новости' : isCart ? 'Корзина' : article?.title || 'Страница не найдена')}</span></div>
      {isPromotions ? <section className="wrap promotions-page">
        <div className="promotions-heading"><span className="eyebrow">ПРЕДЛОЖЕНИЯ ДЕТАГ</span><h1>Акции и специальные предложения</h1><p>Больше возможностей для вашего бизнеса.</p></div>
        <article className="promotion-banner">
          <div className="promotion-copy"><span className="promotion-tag"><Truck size={16} /> ДОСТАВКА В ПОДАРОК</span><h2>{promotion.title}</h2><p className="promotion-threshold">При заказе от <strong>{promotion.minimumOrder.toLocaleString('ru-RU')} ₽</strong></p><p className="promotion-description">{promotion.description}</p><button className="button" onClick={() => setConsultOpen(true)}>Обсудить доставку <ArrowUpRight size={19} /></button><p className="promotion-note">{promotion.note}</p></div>
          <div className="promotion-visual"><span className="promotion-orbit" /><div className="promotion-truck"><img src={sitePath(promotion.image)} alt="Грузовик бесплатной доставки" /></div><span className="promotion-route"><MapPin size={16} /> Москва и область</span><div className="promotion-price"><span>СТОИМОСТЬ ДОСТАВКИ</span><strong>0 <small>₽</small></strong><span>при соблюдении условий акции</span></div></div>
        </article>
        <div className="promotion-details"><div><MapPin size={23} /><span><strong>Москва и область</strong><span>В пределах МКАД и 20 км за её пределами</span></span></div><div><Package size={23} /><span><strong>Отправка в регионы</strong><span>Доставка до терминала транспортной компании</span></span></div><div><Phone size={23} /><span><strong>Уточните условия</strong><a href="tel:+79672017071">{phone}</a></span></div></div>
      </section> : isCatalog ? <section className="wrap catalog-page"><aside className="catalog-sidebar"><h2>Каталог оборудования</h2><a className={!category ? 'selected' : ''} href={sitePath('/catalog.html')}>Все товары <span>{content.products.length}</span></a>{roots.map(root => <div className="sidebar-group" key={root.id}><a className={category?.id === root.id ? 'selected' : ''} href={sitePath(root.path)}>{root.title}</a>{content.categories.filter(c => c.parentId === root.id).map(c => <a className={'sidebar-child ' + (category?.id === c.id ? 'selected' : '')} key={c.id} href={sitePath(c.path)}>{c.title}</a>)}</div>)}<div className="sidebar-help"><ShieldCheck size={25} /><h3>Не уверены в выборе?</h3><p>Поможем подобрать совместимое оборудование.</p><button className="text-button" onClick={() => setConsultOpen(true)}>Спросить специалиста <ArrowRight size={15} /></button></div></aside>
        <div className="catalog-main"><span className="eyebrow">ОБОРУДОВАНИЕ ДЕТАГ</span><h1>{query ? `Поиск: «${query}»` : category?.title || 'Каталог оборудования'}</h1><p className="muted">{query ? `По названию, категории и характеристикам` : 'Противокражные решения для защиты товаров и вашего бизнеса.'}</p>{childCategories.length > 0 && !query && <div className="category-chips">{childCategories.map(c => <a key={c.id} href={sitePath(c.path)}>{c.title}<ArrowUpRight size={14} /></a>)}</div>}
          <div className="catalog-toolbar"><span>{filtered.length} {plural(filtered.length)}</span><label>Сортировка <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Сортировка товаров"><option value="default">По умолчанию</option><option value="az">Название: А–Я</option><option value="za">Название: Я–А</option></select></label></div>
          {filtered.length ? <div className="product-grid catalog-products">{filtered.map(p => <ProductCard product={p} add={add} key={p.id} />)}</div> : <div className="empty"><Search size={34} /><h2>{query ? 'Ничего не нашлось' : 'Поможем подобрать оборудование'}</h2><p>{query ? 'Попробуйте другое название или найдите товар в каталоге.' : 'Свяжитесь с нами, чтобы уточнить ассортимент этого раздела.'}</p><button className="button" onClick={() => query ? navigate('/catalog.html') : setConsultOpen(true)}>{query ? 'Все товары' : 'Получить консультацию'}<ArrowRight size={17} /></button></div>}
        </div></section> : product ? <section className="wrap product-page"><div className="product-detail-picture"><button onClick={() => setImageOpen(product)} aria-label="Увеличить фотографию товара"><img src={sitePath(product.image)} alt={product.title} /></button><span className="small muted">Нажмите на изображение, чтобы рассмотреть детали</span></div><div className="product-detail-info"><a className="eyebrow" href={sitePath(content.categories.find(c => c.id === product.categoryId)?.path)}>{content.categories.find(c => c.id === product.categoryId)?.title}</a><h1>{product.title}</h1><p className="price-label">Цена по запросу</p><p className="muted">Уточним стоимость, наличие и условия поставки.</p><button className="button" onClick={() => add(product.id)}>Добавить в корзину <Plus size={19} /></button><button className="button button-outline" onClick={() => setConsultOpen(true)}>Задать вопрос <ArrowUpRight size={17} /></button><div className="product-description rich-text" dangerouslySetInnerHTML={{ __html: localHtml(product.descriptionHtml) }} /><a className="contact-line" href="tel:+79672017071"><Phone size={18} />{phone}</a></div></section> : isContacts ? <section className="wrap content-page"><span className="eyebrow">БУДЕМ НА СВЯЗИ</span><h1>Контакты</h1><p className="page-intro">Обсудим вашу задачу и поможем подобрать решение.</p><div className="contact-grid"><a href="tel:+79672017071"><Phone /><span>Позвоните нам</span><strong>{phone}</strong><small>Подбор и консультация</small></a><a href="mailto:sales@detag.ru"><Mail /><span>Отдел продаж</span><strong>sales@detag.ru</strong><small>Оборудование и поставки</small></a><a href="mailto:info@detag.ru"><Mail /><span>Общие вопросы</span><strong>info@detag.ru</strong><small>Сотрудничество и информация</small></a></div><div className="contact-other"><div><h2>Удобнее в мессенджере?</h2><p className="muted">Свяжитесь с нами привычным способом.</p><div className="hero-actions"><a className="button" href="https://t.me/DetagRU" target="_blank" rel="noreferrer">Telegram <ArrowUpRight size={17} /></a><a className="button button-outline" href="https://wa.me/79672017071" target="_blank" rel="noreferrer">WhatsApp <ArrowUpRight size={17} /></a></div></div><div className="pickup"><MapPin /><div><h3>Самовывоз</h3><p>МО, Пятницкое шоссе, 20-й км</p><span className="small muted">Перед поездкой уточните адрес и время по телефону.</span></div></div></div></section> : isCart ? <section className="wrap content-page narrow"><h1>Корзина оборудования</h1>{cartContent()}</section> : isConsult ? <section className="wrap content-page narrow"><span className="eyebrow">ПОДБЕРЁМ РЕШЕНИЕ ВМЕСТЕ</span><h1>Получить консультацию</h1>{consultContent()}</section> : isNews ? <section className="wrap content-page"><span className="eyebrow">НОВОСТИ КОМПАНИИ</span><h1>Новости</h1><p className="muted">Архив публикаций компании.</p><a className="news-card" href={sitePath('/allnews/19-novaya-novost.html')}><img src={sitePath('/images/euroshop%20heade.png')} alt="EuroShop 2017" /><div><span className="small muted">2017</span><h2>EuroShop 2017</h2><p>Международная выставка для розничной торговли.</p></div><ArrowUpRight /></a></section> : article ? <section className="wrap content-page article-page"><span className="eyebrow">ДЕТАГ / СИСТЕМЫ БЕЗОПАСНОСТИ</span><h1>{article.title}</h1>{path.includes('19-novaya') && <p className="small muted">Архив публикаций · 2017</p>}<div className="rich-text" dangerouslySetInnerHTML={{ __html: localHtml(article.contentHtml) }} />{path === '/oplata-i-dostavka.html' && <p className="delivery-note"><Truck size={20} />Условия и сроки доставки уточняйте при запросе стоимости.</p>}</section> : <section className="wrap content-page empty"><span className="eyebrow">404</span><h1>Страница не найдена</h1><p>Посмотрите оборудование в каталоге или свяжитесь с нами.</p><a className="button" href={sitePath('/catalog.html')}>Перейти в каталог <ArrowRight size={17} /></a></section>}
      {!isCart && !isConsult && <ContactCTA open={() => setConsultOpen(true)} />}
    </>}
    </main>

    <footer className="footer"><div className="wrap footer-grid"><div className="footer-brand"><a href={sitePath('/')}><img src={sitePath('/images/logo.png')} alt="ДЕТАГ — системы безопасности" /></a><p>Противокражные решения<br />для уверенного бизнеса.</p><div className="footer-social"><a href="https://t.me/DetagRU" target="_blank" rel="noreferrer">Telegram <ArrowUpRight size={14} /></a><a href="https://wa.me/79672017071" target="_blank" rel="noreferrer">WhatsApp <ArrowUpRight size={14} /></a></div></div><div><h3>Оборудование</h3>{roots.map(c => <a key={c.id} href={sitePath(c.path)}>{c.title}</a>)}</div><div><h3>Компания</h3>{links.map(([href, title]) => <a key={href} href={sitePath(href)}>{title}</a>)}<a href={sitePath('/allnews/')}>Новости</a></div><div className="footer-contact"><h3>Свяжитесь с нами</h3><a href="tel:+79672017071">{phone}</a><a href="mailto:sales@detag.ru">{email}</a><button className="text-button" onClick={() => setConsultOpen(true)}>Помочь с выбором <ArrowUpRight size={16} /></button></div></div><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} ДЕТАГ. Системы безопасности.</span><div><a href={sitePath('/privacy/')}>Условия работы сайта</a><a href={sitePath('/cookies.html')}>Cookies</a></div></div></footer>
    {toast && <div className="toast" role="status"><Check size={18} />{toast}<button onClick={() => { setToast(''); setCartOpen(true); }}>Открыть корзину <ArrowRight size={14} /></button></div>}
    {cartOpen && <Modal title="Корзина оборудования" onClose={() => setCartOpen(false)}>{cartContent()}</Modal>}
    {consultOpen && <Modal title="Поможем с выбором" onClose={() => setConsultOpen(false)}>{consultContent()}</Modal>}
    {imageOpen && <Modal title={imageOpen.title} onClose={() => setImageOpen(null)}><img className="lightbox-image" src={sitePath(imageOpen.image)} alt={imageOpen.title} /></Modal>}
  </>;
}
