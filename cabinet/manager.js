import { STATUS, FLOW, CLOSED, ARRIVAL_TYPES, DOC_KINDS, CAMERA_KINDS, CONTRACT_STATUS } from './data.js';
import { ctx, esc, money, fmtDate, ago, badge, accBadge, conBadge, toast, modal, formData, empty, icon } from './ui.js';

const api = () => ctx.api;

// ================= ОГЛЯД =================
async function overview(v) {
  const [clients, sh, cons, msgs] = await Promise.all([api().listProfiles(), api().listShipments(), api().listContracts(), api().listAllMessages()]);
  const pending = clients.filter((c) => c.status === 'pending');
  const fresh = sh.filter((s) => s.status === 'requested');
  const open = sh.filter((s) => !CLOSED.includes(s.status));
  const signing = cons.filter((c) => c.status === 'sent');
  const lastByClient = {};
  msgs.forEach((m) => { if (!lastByClient[m.client_id]) lastByClient[m.client_id] = m; });
  const unanswered = Object.values(lastByClient).filter((m) => m.from_role === 'client');
  const name = Object.fromEntries(clients.map((c) => [c.id, c.company_name || c.email]));
  v.innerHTML = '<h1>Панель менеджера</h1><div class="kpis2">' +
    '<a class="kpi" href="#/m-clients"><b>' + pending.length + '</b><span>клієнтів чекають активації</span></a>' +
    '<a class="kpi" href="#/m-shipments"><b>' + fresh.length + '</b><span>нових заявок</span></a>' +
    '<a class="kpi" href="#/m-shipments"><b>' + open.length + '</b><span>вантажів у роботі</span></a>' +
    '<a class="kpi" href="#/m-contracts"><b>' + signing.length + '</b><span>договорів на підписанні</span></a>' +
    '<a class="kpi" href="#/m-messages"><b>' + unanswered.length + '</b><span>чатів без відповіді</span></a></div>' +
    '<div class="cols"><section class="card2"><h2>Потребують уваги</h2>' +
    (pending.length || fresh.length || signing.length ? '<ul class="feed">' +
      pending.map((c) => '<li><div><span class="badge amber">Новий клієнт</span> <b>' + esc(c.company_name) + '</b></div><p>' + esc(c.contact_name || '') + ' · ' + esc(c.phone || '') + '</p><small>' + ago(c.created_at) + '</small></li>').join('') +
      fresh.map((s) => '<li><div><span class="badge gray">Нова заявка</span> <b>' + esc(s.number) + '</b></div><p>' + esc(name[s.client_id] || '') + ': ' + esc(s.title || '') + '</p><small>' + ago(s.created_at) + '</small></li>').join('') +
      signing.map((c) => '<li><div><span class="badge amber">На підписанні</span> <b>' + esc(c.number) + '</b></div><p>' + esc(name[c.client_id] || '') + '</p><small>' + ago(c.updated_at) + '</small></li>').join('') + '</ul>' : empty('Усе опрацьовано')) + '</section>' +
    '<section class="card2"><h2>Підказки</h2><ul class="tips"><li>Активуйте нових клієнтів у розділі «Клієнти» після перевірки ЄДРПОУ.</li><li>Статус вантажу змінюйте в розділі «Вантажі». Клієнт одразу отримає сповіщення.</li><li>Доступ до камер видається в картці клієнта.</li><li>Договір переводьте в «Підписано» після отримання підписаних копій.</li></ul></section></div>';
}

// ================= КЛІЄНТИ =================
async function clients(v) {
  const list = await api().listProfiles();
  v.innerHTML = '<h1>Клієнти</h1><div class="tablewrap"><table class="t"><thead><tr><th>Компанія</th><th>Контакт</th><th>Код</th><th>Статус</th><th>Реєстрація</th><th></th></tr></thead><tbody>' +
    (list.length ? list.map((c) => '<tr><td><b>' + esc(c.company_name || '—') + '</b><small class="blk">' + esc(c.email) + '</small></td><td>' + esc(c.contact_name || '—') + '<small class="blk">' + esc(c.phone || '') + '</small></td><td>' + esc(c.edrpou || '—') + '</td><td>' + accBadge(c.status) + '</td><td>' + fmtDate(c.created_at) + '</td><td><button class="btn small ghost-dark2" data-id="' + esc(c.id) + '" type="button">Відкрити</button></td></tr>').join('') : '<tr><td colspan="6">' + empty('Клієнтів ще немає') + '</td></tr>') + '</tbody></table></div>';
  v.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => openClient(list.find((c) => c.id === b.dataset.id))));
}

async function openClient(c) {
  const [cams, access, sh] = await Promise.all([api().listCameras(), api().getCameraAccess(c.id), api().listShipments()]);
  const mine = sh.filter((s) => s.client_id === c.id);
  const m = modal(c.company_name || c.email,
    '<div class="sh-head">' + accBadge(c.status) + '</div><dl class="info"><div><dt>Тип</dt><dd>' + (c.type === 'fop' ? 'ФОП' : 'Юр. особа') + '</dd></div><div><dt>Код</dt><dd>' + esc(c.edrpou || '—') + '</dd></div>' +
    '<div><dt>Контакт</dt><dd>' + esc(c.contact_name || '—') + '</dd></div><div><dt>Телефон</dt><dd>' + esc(c.phone || '—') + '</dd></div><div><dt>Email</dt><dd>' + esc(c.email) + '</dd></div><div><dt>Податки</dt><dd>' + esc(c.tax || '—') + '</dd></div>' +
    '<div class="wide"><dt>Адреса</dt><dd>' + esc(c.address || '—') + '</dd></div><div class="wide"><dt>IBAN / банк</dt><dd>' + esc((c.iban || '—') + ' ' + (c.bank || '')) + '</dd></div></dl>' +
    '<p class="muted">Вантажів: ' + mine.length + '</p>' +
    '<h3>Доступ до відеоспостереження</h3>' + (cams.length ? '<div class="checks">' + cams.map((x) => '<label class="check"><input type="checkbox" value="' + esc(x.id) + '"' + (access.includes(x.id) ? ' checked' : '') + '> ' + esc(x.name) + ' <small>' + esc(x.zone || '') + '</small></label>').join('') + '</div><button class="btn small" id="sa" type="button">Зберегти доступ</button>' : '<p class="muted">Камер ще не додано (розділ «Камери»).</p>') +
    '<h3>Статус облікового запису</h3><div class="actions-row">' +
    (c.status !== 'active' ? '<button class="btn small" data-s="active" type="button">Активувати</button>' : '') + (c.status !== 'blocked' ? '<button class="btn small ghost-dark2 danger" data-s="blocked" type="button">Заблокувати</button>' : '') + (c.status === 'active' ? '<button class="btn small ghost-dark2" data-s="pending" type="button">Повернути на перевірку</button>' : '') + '</div>', { wide: true });
  const sa = m.el.querySelector('#sa');
  if (sa) sa.addEventListener('click', async () => { try { await api().setCameraAccess(c.id, [...m.el.querySelectorAll('.checks input:checked')].map((i) => i.value)); toast('Доступ до камер збережено'); } catch (e) { toast(e.message, 'err'); } });
  m.el.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', async () => { try { await api().setProfileStatus(c.id, b.dataset.s); toast('Статус змінено'); m.close(); window.__route(); } catch (e) { toast(e.message, 'err'); } }));
}

// ================= ВАНТАЖІ =================
async function shipments(v) {
  const [list, cl] = await Promise.all([api().listShipments(), api().listProfiles()]);
  const name = Object.fromEntries(cl.map((c) => [c.id, c.company_name || c.email]));
  let st = '';
  const draw = () => {
    const rows = list.filter((s) => !st || (st === 'open' ? !CLOSED.includes(s.status) : s.status === st));
    v.querySelector('#tb').innerHTML = rows.length ? rows.map((s) => '<tr data-id="' + esc(s.id) + '" tabindex="0"><td><b>' + esc(s.number) + '</b></td><td>' + esc(name[s.client_id] || '') + '</td><td>' + esc(s.title || '—') + '</td><td>' + esc(s.pallets || '—') + '</td><td>' + badge(s.status) + '</td><td>' + esc(s.location || '—') + '</td><td>' + fmtDate(s.eta) + '</td></tr>').join('') : '<tr><td colspan="7">' + empty('Вантажів немає') + '</td></tr>';
  };
  v.innerHTML = '<div class="head"><h1>Вантажі</h1><button class="btn" id="add" type="button">+ Вантаж для клієнта</button></div><div class="toolbar"><select id="st"><option value="">Усі статуси</option><option value="open">Активні</option>' + Object.keys(STATUS).map((k) => '<option value="' + k + '">' + esc(STATUS[k].label) + '</option>').join('') + '</select></div>' +
    '<div class="tablewrap"><table class="t"><thead><tr><th>№</th><th>Клієнт</th><th>Вантаж</th><th>Палет</th><th>Статус</th><th>Місце</th><th>Дата</th></tr></thead><tbody id="tb"></tbody></table></div>';
  draw();
  v.querySelector('#st').addEventListener('change', (e) => { st = e.target.value; draw(); });
  v.querySelector('#tb').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) editShipment(list.find((s) => s.id === tr.dataset.id), name[list.find((s) => s.id === tr.dataset.id).client_id]); });
  v.querySelector('#add').addEventListener('click', () => addShipment(cl));
}

async function editShipment(s, clientName) {
  const events = await api().listEvents(s.id);
  const m = modal(s.number + ' · ' + clientName,
    '<div class="sh-head">' + badge(s.status) + '</div><p>' + esc(s.title || '') + ' · ' + esc(ARRIVAL_TYPES[s.arrival_type] || '') + ' · палет: ' + esc(s.pallets || '—') + ' · вага: ' + esc(s.weight || '—') + ' кг</p>' +
    '<p class="muted">Одержувачі: ' + esc(s.receivers || '—') + (s.calc && s.calc.total ? ' · розрахунок клієнта: ' + money(s.calc.total) : '') + '</p>' +
    (s.calc && s.calc.offer ? '<div class="notice warn small"><b>Клієнт пропонує свою ціну: ' + money(s.calc.offer.price) + '</b> без ПДВ (' + (s.calc.offer.pct > 0 ? '+' : '') + s.calc.offer.pct + '% до розрахунку)' + (s.calc.offer.comment ? '<br>' + esc(s.calc.offer.comment) : '') + '</div>' : '') +
    '<form id="sf" class="form"><div class="grid2"><label>Новий статус<select name="status">' + Object.keys(STATUS).map((k) => '<option value="' + k + '"' + (k === s.status ? ' selected' : '') + '>' + esc(STATUS[k].label) + '</option>').join('') + '</select></label>' +
    '<label>Місце на складі<input name="location" value="' + esc(s.location || '') + '" placeholder="Ряд 3, стелаж B"></label>' +
    '<label>Очікувана дата<input name="eta" type="date" value="' + esc((s.eta || '').slice(0, 10)) + '"></label><label>Палет (факт)<input name="pallets" type="number" min="0" value="' + esc(s.pallets || '') + '"></label>' +
    '<label class="wide">Коментар для клієнта (потрапить в історію)<input name="comment" placeholder="Наприклад: прийнято 480 місць, пошкоджень немає"></label></div><button class="btn" type="submit">Зберегти</button></form>' +
    '<h3>Історія</h3><ul class="timeline2">' + events.map((e) => '<li>' + badge(e.status) + ' <span>' + esc(e.comment || '') + '</span><small>' + fmtDate(e.created_at, true) + '</small></li>').join('') + '</ul>', { wide: true });
  m.el.querySelector('#sf').addEventListener('submit', async (e) => {
    e.preventDefault(); const d = formData(e.target);
    try {
      await api().updateShipment(s.id, { location: d.location, eta: d.eta || null, pallets: d.pallets === '' ? null : Number(d.pallets) }, d.status, d.comment);
      toast('Збережено'); m.close(); window.__route();
    } catch (er) { toast(er.message, 'err'); }
  });
}

function addShipment(clients) {
  const act = clients.filter((c) => c.status === 'active');
  const m = modal('Новий вантаж для клієнта', '<form id="af" class="form"><div class="grid2"><label class="wide">Клієнт *<select name="client_id" required>' + act.map((c) => '<option value="' + esc(c.id) + '">' + esc(c.company_name) + '</option>').join('') + '</select></label>' +
    '<label>Тип прибуття<select name="arrival_type">' + Object.keys(ARRIVAL_TYPES).map((k) => '<option value="' + k + '">' + esc(ARRIVAL_TYPES[k]) + '</option>').join('') + '</select></label><label>Дата<input name="eta" type="date"></label>' +
    '<label class="wide">Опис *<input name="title" required></label><label>Палет<input name="pallets" type="number" min="0"></label><label>Вага, кг<input name="weight" type="number" min="0"></label></div><button class="btn" type="submit">Створити</button></form>');
  m.el.querySelector('#af').addEventListener('submit', async (e) => {
    e.preventDefault(); const d = formData(e.target); if (!d.client_id) return toast('Немає активних клієнтів', 'err');
    ['pallets', 'weight'].forEach((k) => { d[k] = d[k] === '' ? null : Number(d[k]); }); if (!d.eta) delete d.eta;
    try { await api().createShipment(d); toast('Вантаж створено'); m.close(); window.__route(); } catch (er) { toast(er.message, 'err'); }
  });
}

// ================= ДОГОВОРИ =================
async function contracts(v) {
  const [list, cl] = await Promise.all([api().listContracts(), api().listProfiles()]);
  const name = Object.fromEntries(cl.map((c) => [c.id, c.company_name || c.email]));
  v.innerHTML = '<h1>Договори</h1><div class="tablewrap"><table class="t"><thead><tr><th>№</th><th>Клієнт</th><th>Дата</th><th>Статус</th><th></th></tr></thead><tbody>' +
    (list.length ? list.map((c) => '<tr><td><b>' + esc(c.number) + '</b></td><td>' + esc(name[c.client_id] || '') + '</td><td>' + fmtDate(c.data && c.data.date) + '</td><td>' + conBadge(c.status) + '</td><td><button class="btn small ghost-dark2" data-id="' + esc(c.id) + '" type="button">Відкрити</button></td></tr>').join('') : '<tr><td colspan="5">' + empty('Договорів немає') + '</td></tr>') + '</tbody></table></div>';
  v.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => {
    const c = list.find((x) => x.id === b.dataset.id);
    const res = window.ContractCore.build(c.data, c.calc); // генеруємо з даних, збережений HTML не відображаємо
    const m = modal('Договір ' + c.number + ' · ' + (name[c.client_id] || ''),
      '<div class="actions-row sticky">' + conBadge(c.status) + Object.keys(CONTRACT_STATUS).filter((k) => k !== c.status).map((k) => '<button class="btn small ghost-dark2" data-set="' + k + '" type="button">→ ' + esc(CONTRACT_STATUS[k].label) + '</button>').join('') +
      '<button class="btn small ghost-dark2" id="pp" type="button">Друк / PDF</button><button class="btn small ghost-dark2" id="pd" type="button">.doc</button></div><article class="doc docview" id="d">' + res.html + '</article>', { wide: true });
    const el = m.el.querySelector('#d');
    m.el.querySelector('#pp').addEventListener('click', () => window.ContractCore.print(el));
    m.el.querySelector('#pd').addEventListener('click', () => window.ContractCore.download(el, res.num));
    m.el.querySelectorAll('[data-set]').forEach((x) => x.addEventListener('click', async () => { try { await api().setContractStatus(c.id, x.dataset.set); toast('Статус змінено'); m.close(); window.__route(); } catch (e) { toast(e.message, 'err'); } }));
  }));
}

// ================= ДОКУМЕНТИ =================
async function documents(v) {
  const [docs, cl, sh] = await Promise.all([api().listDocuments(), api().listProfiles(), api().listShipments()]);
  const name = Object.fromEntries(cl.map((c) => [c.id, c.company_name || c.email]));
  v.innerHTML = '<div class="head"><h1>Документи</h1><button class="btn" id="add" type="button">+ Додати документ</button></div><p class="sub">Вкажіть посилання на файл (Google Drive, Dropbox, Supabase Storage). Клієнт отримає сповіщення.</p>' +
    '<div class="tablewrap"><table class="t"><thead><tr><th>Документ</th><th>Клієнт</th><th>Тип</th><th>Дата</th></tr></thead><tbody>' + (docs.length ? docs.map((d) => '<tr><td><a href="' + esc(d.url || '#') + '" target="_blank" rel="noopener">' + esc(d.name) + '</a></td><td>' + esc(name[d.client_id] || '') + '</td><td>' + esc(DOC_KINDS[d.kind] || '') + '</td><td>' + fmtDate(d.created_at) + '</td></tr>').join('') : '<tr><td colspan="4">' + empty('Документів немає') + '</td></tr>') + '</tbody></table></div>';
  v.querySelector('#add').addEventListener('click', () => {
    const m = modal('Новий документ', '<form id="df" class="form"><div class="grid2"><label class="wide">Клієнт *<select name="client_id" required>' + cl.map((c) => '<option value="' + esc(c.id) + '">' + esc(c.company_name || c.email) + '</option>').join('') + '</select></label>' +
      '<label>Тип<select name="kind">' + Object.keys(DOC_KINDS).map((k) => '<option value="' + k + '">' + esc(DOC_KINDS[k]) + '</option>').join('') + '</select></label>' +
      '<label>Вантаж (необов\'язково)<select name="shipment_id"><option value="">—</option>' + sh.map((s) => '<option value="' + esc(s.id) + '">' + esc(s.number) + '</option>').join('') + '</select></label>' +
      '<label class="wide">Назва *<input name="name" required></label><label class="wide">Посилання на файл *<input name="url" type="url" required placeholder="https://"></label></div><button class="btn" type="submit">Додати</button></form>');
    m.el.querySelector('#df').addEventListener('submit', async (e) => {
      e.preventDefault(); const d = formData(e.target); if (!d.shipment_id) d.shipment_id = null;
      if (!/^https?:\/\//i.test(d.url)) return toast('Посилання має починатися з http:// або https://', 'err');
      try { await api().addDocument(d); toast('Документ додано'); m.close(); window.__route(); } catch (er) { toast(er.message, 'err'); }
    });
  });
}

// ================= КАМЕРИ =================
async function cameras(v) {
  const [cams, views] = await Promise.all([api().listCameras(), api().listCameraViews()]);
  v.innerHTML = '<div class="head"><h1>Камери</h1><button class="btn" id="add" type="button">+ Додати камеру</button></div>' +
    '<div class="notice small"><b>Безпека.</b> Посилання на потік має бути захищеним (одноразовий токен або авторизація на вашому відеосервері). Інакше будь-хто з посиланням зможе дивитися трансляцію. Див. cabinet/README.md.</div>' +
    '<div class="tablewrap"><table class="t"><thead><tr><th>Камера</th><th>Зона</th><th>Тип</th><th>Активна</th><th></th></tr></thead><tbody>' + (cams.length ? cams.map((c) => '<tr><td><b>' + esc(c.name) + '</b></td><td>' + esc(c.zone || '') + '</td><td>' + esc(CAMERA_KINDS[c.kind] || c.kind) + '</td><td>' + (c.active ? 'так' : 'ні') + '</td><td><button class="btn small ghost-dark2" data-id="' + esc(c.id) + '" type="button">Змінити</button></td></tr>').join('') : '<tr><td colspan="5">' + empty('Камер ще немає') + '</td></tr>') + '</tbody></table></div>' +
    '<h2>Журнал переглядів</h2>' + (views.length ? '<ul class="feed">' + views.map((x) => '<li><div><b>' + esc(x.who || '') + '</b> → ' + esc((cams.find((c) => c.id === x.camera_id) || {}).name || 'камера') + '</div><small>' + fmtDate(x.created_at, true) + '</small></li>').join('') + '</ul>' : empty('Переглядів ще не було'));
  const form = (c) => {
    c = c || { active: true, kind: 'hls' };
    const m = modal(c.id ? 'Редагувати камеру' : 'Нова камера', '<form id="cf" class="form"><div class="grid2"><label>Назва *<input name="name" required value="' + esc(c.name || '') + '"></label><label>Зона<input name="zone" value="' + esc(c.zone || '') + '"></label>' +
      '<label>Тип потоку<select name="kind">' + Object.keys(CAMERA_KINDS).map((k) => '<option value="' + k + '"' + (c.kind === k ? ' selected' : '') + '>' + esc(CAMERA_KINDS[k]) + '</option>').join('') + '</select></label>' +
      '<label class="check"><input type="checkbox" name="active"' + (c.active ? ' checked' : '') + '> Активна</label><label class="wide">Адреса потоку (https://…)<input name="url" value="' + esc(c.url || '') + '" placeholder="https://cam.example.com/stream/index.m3u8"></label></div><button class="btn" type="submit">Зберегти</button></form>');
    m.el.querySelector('#cf').addEventListener('submit', async (e) => {
      e.preventDefault(); const d = formData(e.target); const row = { name: d.name, zone: d.zone, kind: d.kind, url: d.url, active: !!d.active };
      if (row.kind !== 'demo' && row.url && !/^https:\/\//i.test(row.url)) return toast('Адреса потоку має починатися з https://', 'err');
      if (c.id) row.id = c.id;
      try { await api().saveCamera(row); toast('Збережено'); m.close(); window.__route(); } catch (er) { toast(er.message, 'err'); }
    });
  };
  v.querySelector('#add').addEventListener('click', () => form());
  v.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => form(cams.find((c) => c.id === b.dataset.id))));
}

// ================= ПОВІДОМЛЕННЯ =================
async function messages(v) {
  const [all, cl] = await Promise.all([api().listAllMessages(), api().listProfiles()]);
  const name = Object.fromEntries(cl.map((c) => [c.id, c.company_name || c.email]));
  const last = {}; all.forEach((m) => { if (!last[m.client_id]) last[m.client_id] = m; });
  const ids = Object.keys(last);
  v.innerHTML = '<h1>Повідомлення</h1>' + (ids.length ? '<div class="tablewrap"><table class="t"><thead><tr><th>Клієнт</th><th>Останнє повідомлення</th><th>Час</th><th></th></tr></thead><tbody>' +
    ids.map((id) => '<tr><td><b>' + esc(name[id] || id) + '</b></td><td>' + (last[id].from_role === 'client' ? '<span class="badge amber">очікує відповіді</span> ' : '') + esc(last[id].text.slice(0, 90)) + '</td><td>' + ago(last[id].created_at) + '</td><td><button class="btn small ghost-dark2" data-id="' + esc(id) + '" type="button">Відкрити</button></td></tr>').join('') + '</tbody></table></div>' : empty('Повідомлень немає'));
  v.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', async () => {
    const cid = b.dataset.id; let timer;
    const m = modal(name[cid] || 'Чат', '<div class="chat in-modal"><div class="thread" id="th"></div><form id="mf" class="compose"><input name="text" placeholder="Відповідь клієнту…" autocomplete="off" required><button class="btn" type="submit">Надіслати</button></form></div>', { wide: true, onClose: () => clearInterval(timer) });
    const th = m.el.querySelector('#th');
    const load = async () => { const list = await api().listMessages(cid); th.innerHTML = list.map((x) => '<div class="bubble ' + (x.from_role === 'manager' ? 'client' : 'manager') + '"><p>' + esc(x.text) + '</p><small>' + fmtDate(x.created_at, true) + '</small></div>').join(''); th.scrollTop = th.scrollHeight; };
    await load(); timer = setInterval(() => load().catch(() => {}), 8000);
    m.el.querySelector('#mf').addEventListener('submit', async (e) => { e.preventDefault(); const i = e.target.elements.text; const t = i.value.trim(); if (!t) return; i.value = ''; try { await api().sendMessage(cid, t); await load(); } catch (er) { toast(er.message, 'err'); } });
  }));
}

export const managerViews = { 'm-overview': overview, 'm-clients': clients, 'm-shipments': shipments, 'm-contracts': contracts, 'm-documents': documents, 'm-cameras': cameras, 'm-messages': messages };
