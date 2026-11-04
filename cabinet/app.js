import { CABINET_CONFIG } from './config.js';
import { ctx, esc, icon, toast, formData, notifyManager, ago } from './ui.js';
import { clientViews } from './client.js';
import { managerViews } from './manager.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);

async function boot() {
  const demoReq = params.has('demo') || sessionStorage.getItem('rlk_demo') === '1';
  try {
    if (CABINET_CONFIG.supabaseUrl && CABINET_CONFIG.supabaseAnonKey) {
      const { createSupa } = await import('./supa.js');
      ctx.api = await createSupa(CABINET_CONFIG);
    } else if (demoReq) {
      sessionStorage.setItem('rlk_demo', '1');
      const { createDemo } = await import('./demo.js');
      ctx.api = createDemo(); ctx.demo = true;
    } else { return renderSoon(); }
  } catch (e) { app.innerHTML = '<div class="auth"><div class="auth-card"><h1>Помилка</h1><p>' + esc(e.message) + '</p></div></div>'; return; }
  window.addEventListener('hashchange', route);
  const s = await ctx.api.getSession();
  if (s) await enter(); else renderAuth();
}

// ---------- Заглушка, поки бекенд не підключено ----------
function renderSoon() {
  app.innerHTML = '<div class="auth"><div class="auth-card"><a class="logo-dark" href="./">РЛК <b>Тернопіль</b></a><h1>Особистий кабінет</h1>' +
    '<p>Кабінет клієнта готується до запуску. Поки що розрахунок, заявку й договір можна оформити на сайті або за телефоном.</p>' +
    '<p><a class="btn" href="./#calculator">Калькулятор</a> <a class="btn ghost-dark2" href="tel:+380673524745">+380 67 352 47 45</a></p></div></div>';
}

// ---------- Вхід / реєстрація ----------
function renderAuth(tab) {
  tab = tab || 'login';
  const demo = ctx.demo
    ? '<div class="demo-note"><b>Демо-режим.</b> Дані зберігаються лише у вашому браузері й нікуди не передаються.' +
      '<div class="demo-btns"><button class="btn small" data-demo="client@demo.ua">Увійти як клієнт</button><button class="btn small ghost-dark2" data-demo="manager@demo.ua">Увійти як менеджер</button><button class="linklike" data-reset>Скинути демо-дані</button></div></div>'
    : '';
  app.innerHTML = '<div class="auth"><div class="auth-card wide">' +
    '<a class="logo-dark" href="./">РЛК <b>Тернопіль</b></a><h1>Особистий кабінет клієнта</h1>' +
    '<p class="sub">Статуси вантажів, документи, договори, відеоспостереження та чат із менеджером в одному місці.</p>' + demo +
    '<div class="tabs" role="tablist"><button role="tab" class="' + (tab === 'login' ? 'on' : '') + '" data-tab="login">Вхід</button><button role="tab" class="' + (tab === 'register' ? 'on' : '') + '" data-tab="register">Реєстрація</button></div>' +
    '<div id="auth-body"></div></div></div>';
  const body = document.getElementById('auth-body');
  if (tab === 'login') body.innerHTML =
    '<form id="f-login" novalidate><label>Email<input name="email" type="email" autocomplete="email" required></label>' +
    '<label>Пароль<input name="password" type="password" autocomplete="current-password" required></label>' +
    '<button class="btn block" type="submit">Увійти</button><p class="msg" id="msg"></p><p class="small"><button type="button" class="linklike" id="forgot">Забули пароль?</button></p></form>';
  else body.innerHTML =
    '<form id="f-reg" novalidate><div class="grid2">' +
    '<label>Тип<select name="type"><option value="le">Юридична особа</option><option value="fop">ФОП</option></select></label>' +
    '<label>Назва компанії / ПІБ ФОП *<input name="company_name" required autocomplete="organization"></label>' +
    '<label>ЄДРПОУ / РНОКПП *<input name="edrpou" required inputmode="numeric"></label>' +
    '<label>Контактна особа *<input name="contact_name" required autocomplete="name"></label>' +
    '<label>Телефон *<input name="phone" type="tel" required autocomplete="tel"></label>' +
    '<label>Email *<input name="email" type="email" required autocomplete="email"></label>' +
    '<label>Пароль * (мін. 8 символів)<input name="password" type="password" minlength="8" required autocomplete="new-password"></label>' +
    '<label>Повторіть пароль *<input name="password2" type="password" minlength="8" required autocomplete="new-password"></label></div>' +
    '<label class="check"><input type="checkbox" name="consent" required> Погоджуюсь з <a href="privacy.html" target="_blank" rel="noopener">політикою конфіденційності</a></label>' +
    '<button class="btn block" type="submit">Зареєструватися</button><p class="msg" id="msg"></p>' +
    '<p class="small">Після реєстрації менеджер перевірить дані й активує кабінет (зазвичай протягом робочого дня). До цього доступні калькулятор і підготовка договору.</p></form>';

  app.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => renderAuth(b.dataset.tab)));
  const msg = (t, ok) => { const m = document.getElementById('msg'); m.textContent = t; m.className = 'msg ' + (ok ? 'ok' : 'err'); };
  const login = async (email, pw) => { await ctx.api.signIn(email, pw); await enter(); };

  const fl = document.getElementById('f-login');
  if (fl) {
    fl.addEventListener('submit', async (e) => {
      e.preventDefault(); const d = formData(fl);
      if (!d.email || !d.password) return msg('Введіть пошту та пароль');
      try { await login(d.email, d.password); } catch (er) { msg(er.message); }
    });
    document.getElementById('forgot').addEventListener('click', async () => {
      const em = fl.elements.email.value.trim();
      if (!em) return msg('Введіть пошту, на яку надіслати посилання');
      try { await ctx.api.resetPassword(em); msg('Якщо така пошта зареєстрована, ми надіслали лист для відновлення.', true); } catch (er) { msg(er.message); }
    });
  }
  const fr = document.getElementById('f-reg');
  if (fr) fr.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!fr.checkValidity()) { fr.reportValidity(); return; }
    const d = formData(fr);
    if (d.password !== d.password2) return msg('Паролі не збігаються');
    delete d.password2; delete d.consent;
    try {
      const r = await ctx.api.signUp(d);
      notifyManager(CABINET_CONFIG.notifyEndpoint, 'Нова реєстрація в кабінеті', 'Компанія: ' + d.company_name + '\nКод: ' + d.edrpou + '\nКонтакт: ' + d.contact_name + ', ' + d.phone + ', ' + d.email);
      if (r.needsConfirm) { document.getElementById('auth-body').innerHTML = '<div class="notice ok"><h3>Перевірте пошту</h3><p>Ми надіслали лист на ' + esc(d.email) + '. Підтвердіть адресу за посиланням, потім увійдіть. Після цього менеджер активує кабінет.</p></div>'; }
      else await enter();
    } catch (er) { msg(er.message); }
  });
  app.querySelectorAll('[data-demo]').forEach((b) => b.addEventListener('click', async () => { await login(b.dataset.demo, 'demo'); }));
  const rs = app.querySelector('[data-reset]');
  if (rs) rs.addEventListener('click', () => { ctx.api.resetDemo(); toast('Демо-дані скинуто'); renderAuth(); });
}

// ---------- Оболонка ----------
const NAV_CLIENT = [
  ['dashboard', 'home', 'Огляд'], ['shipments', 'box', 'Мої вантажі'], ['new', 'plus', 'Нова заявка'], ['calculator', 'calc', 'Калькулятор'],
  ['contracts', 'file', 'Договори'], ['documents', 'folder', 'Документи'], ['cameras', 'cam', 'Відеоспостереження'], ['messages', 'chat', 'Повідомлення'], ['profile', 'user', 'Профіль']
];
const NAV_MANAGER = [
  ['m-overview', 'home', 'Огляд'], ['m-clients', 'users', 'Клієнти'], ['m-shipments', 'box', 'Вантажі'], ['m-contracts', 'file', 'Договори'],
  ['m-documents', 'folder', 'Документи'], ['m-cameras', 'cam', 'Камери'], ['m-messages', 'chat', 'Повідомлення']
];
let views = {};
let notifTimer = null;

async function enter() {
  try { ctx.profile = await ctx.api.getProfile(); } catch (e) { toast(e.message, 'err'); return renderAuth(); }
  if (ctx.profile.status === 'blocked') { await ctx.api.signOut(); renderAuth(); return toast('Обліковий запис заблоковано', 'err'); }
  const mgr = ctx.profile.role === 'manager';
  views = mgr ? managerViews : clientViews;
  const nav = mgr ? NAV_MANAGER : NAV_CLIENT;
  app.innerHTML =
    '<div class="shell"><aside class="side" id="side"><a class="logo-dark light" href="./">РЛК <b>Тернопіль</b></a>' +
    '<nav>' + nav.map((n) => '<a href="#/' + n[0] + '" data-r="' + n[0] + '">' + icon(n[1]) + '<span>' + n[2] + '</span></a>').join('') + '</nav>' +
    '<div class="side-foot"><a href="./" class="sf">← На сайт</a><button type="button" id="logout">' + icon('out') + ' Вийти</button></div></aside>' +
    '<div class="main"><header class="top"><button class="burger2" id="burger2" type="button" aria-label="Меню">' + icon('menu') + '</button>' +
    '<div class="who"><b>' + esc(ctx.profile.company_name || ctx.profile.email) + '</b><small>' + (mgr ? 'Менеджер' : 'Клієнт') + '</small></div>' +
    (ctx.demo ? '<span class="demo-pill">ДЕМО</span>' : '') +
    (mgr ? '' : '<div class="bellwrap"><button class="bell" id="bell" type="button" aria-label="Сповіщення">' + icon('bell') + '<i id="bellcount" hidden></i></button><div class="notifs" id="notifs" hidden></div></div>') +
    '</header><main id="view" class="view" tabindex="-1"></main></div></div>';
  document.getElementById('logout').addEventListener('click', async () => { await ctx.api.signOut(); ctx.profile = null; location.hash = ''; renderAuth(); });
  document.getElementById('burger2').addEventListener('click', () => document.getElementById('side').classList.toggle('open'));
  document.getElementById('side').addEventListener('click', (e) => { if (e.target.closest('a')) document.getElementById('side').classList.remove('open'); });
  if (!mgr) setupBell();
  if (!location.hash || location.hash === '#') location.hash = mgr ? '#/m-overview' : '#/dashboard';
  route();
}

async function setupBell() {
  const bell = document.getElementById('bell'); const box = document.getElementById('notifs'); const cnt = document.getElementById('bellcount');
  const load = async () => {
    try {
      const list = await ctx.api.listNotifications();
      const unread = list.filter((n) => !n.read).length;
      cnt.hidden = !unread; cnt.textContent = unread;
      box.innerHTML = list.length ? list.map((n) => '<a href="' + esc(n.link || '#/dashboard') + '" class="' + (n.read ? '' : 'unread') + '"><span>' + esc(n.text) + '</span><small>' + ago(n.created_at) + '</small></a>').join('') : '<p class="muted pad">Сповіщень немає</p>';
    } catch (_) {}
  };
  bell.addEventListener('click', async (e) => {
    e.stopPropagation(); box.hidden = !box.hidden;
    if (!box.hidden) { await ctx.api.markNotificationsRead(); setTimeout(load, 600); }
  });
  document.addEventListener('click', (e) => { if (!box.contains(e.target)) box.hidden = true; });
  box.addEventListener('click', () => { box.hidden = true; });
  await load();
  clearInterval(notifTimer); notifTimer = setInterval(load, 30000);
}

async function route() {
  if (!ctx.profile) return;
  if (typeof ctx.cleanup === 'function') { try { ctx.cleanup(); } catch (_) {} ctx.cleanup = null; }
  const parts = location.hash.replace(/^#\//, '').split('/');
  const name = parts[0] || 'dashboard';
  const fn = views[name] || views[Object.keys(views)[0]];
  document.querySelectorAll('.side nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === (views[name] ? name : '')));
  const view = document.getElementById('view');
  view.innerHTML = '<div class="loading">Завантаження…</div>';
  try { const r = await fn(view, parts.slice(1)); if (typeof r === 'function') ctx.cleanup = r; view.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  catch (e) { view.innerHTML = '<div class="notice err"><h3>Не вдалося завантажити</h3><p>' + esc(e.message) + '</p></div>'; }
}
window.__route = route;

boot();
