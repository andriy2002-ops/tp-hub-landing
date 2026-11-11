import { FLOW, STATUS, CLOSED, STORED_STATES, ARRIVAL_TYPES, DOC_KINDS } from './data.js';
import { ctx, esc, money, fmtDate, ago, badge, accBadge, conBadge, toast, modal, formData, empty, icon, notifyManager } from './ui.js';
import { CABINET_CONFIG } from './config.js';

const api = () => ctx.api;
const isActive = () => ctx.profile.status === 'active';
const savedCalc = () => { try { const c = JSON.parse(sessionStorage.getItem('calc') || 'null'); return c && c.lines && c.lines.length ? c : null; } catch (_) { return null; } };

const pendingBanner = () => ctx.profile.status === 'pending'
  ? '<div class="notice warn"><h3>Обліковий запис очікує підтвердження</h3><p>Менеджер перевіряє ваші дані. Після активації відкриються заявки, документи та відеоспостереження. Поки що можна користуватися калькулятором і готувати договір.</p></div>' : '';
const locked = (what) => '<div class="notice warn"><h3>' + icon('lock') + ' Розділ буде доступний після активації</h3><p>' + esc(what) + ' Менеджер активує кабінет після перевірки реквізитів. Для прискорення зателефонуйте: <a href="tel:+380673524745">+380 67 352 47 45</a>.</p></div>';

function stepper(status) {
  const i = FLOW.indexOf(status);
  if (i < 0) return '<p>' + badge(status) + '</p>';
  return '<ol class="stepper">' + FLOW.map((s, k) => '<li class="' + (k < i ? 'done' : k === i ? 'now' : '') + '"><i></i><span>' + esc(STATUS[s].label) + '</span></li>').join('') + '</ol>';
}

// ================= ОГЛЯД =================
async function dashboard(v) {
  const [sh, ev, cons, cams] = await Promise.all([api().listShipments(), api().listEvents(), api().listContracts(), api().listCameras()]);
  const active = sh.filter((s) => !CLOSED.includes(s.status));
  const pallets = sh.filter((s) => STORED_STATES.includes(s.status)).reduce((a, s) => a + (+s.pallets || 0), 0);
  const waiting = sh.filter((s) => ['requested', 'confirmed'].includes(s.status)).length;
  const num = Object.fromEntries(sh.map((s) => [s.id, s.number]));
  v.innerHTML = '<h1>Вітаємо, ' + esc((ctx.profile.contact_name || ctx.profile.company_name || '').split(' ')[0]) + '!</h1>' + pendingBanner() +
    '<div class="kpis2"><div class="kpi"><b>' + active.length + '</b><span>активних вантажів</span></div><div class="kpi"><b>' + pallets + '</b><span>палет на зберіганні</span></div>' +
    '<div class="kpi"><b>' + waiting + '</b><span>заявок на підтвердженні</span></div><div class="kpi"><b>' + cons.filter((c) => c.status === 'signed').length + '</b><span>підписаних договорів</span></div></div>' +
    '<div class="cols"><section class="card2"><h2>Останні події</h2>' +
    (ev.length ? '<ul class="feed">' + ev.slice(0, 8).map((e) => '<li><div>' + badge(e.status) + ' <b>' + esc(num[e.shipment_id] || '') + '</b></div><p>' + esc(e.comment || '') + '</p><small>' + ago(e.created_at) + '</small></li>').join('') + '</ul>' : empty('Подій поки немає. Створіть першу заявку.')) + '</section>' +
    '<section class="card2"><h2>Швидкі дії</h2><div class="quick">' +
    '<a class="qa" href="#/new">' + icon('plus') + '<b>Нова заявка</b><small>Повідомити про вантаж</small></a>' +
    '<a class="qa" href="#/calculator">' + icon('calc') + '<b>Калькулятор</b><small>Орієнтовна вартість</small></a>' +
    '<a class="qa" href="#/contracts/new">' + icon('file') + '<b>Скласти договір</b><small>За реквізитами компанії</small></a>' +
    '<a class="qa" href="#/cameras">' + icon('cam') + '<b>Камери</b><small>' + cams.length + ' доступно</small></a></div>' +
    '<div class="contact-mini"><b>Ваш менеджер</b><p><a href="tel:+380673524745">+380 67 352 47 45</a> · <a href="mailto:ternopilhubcom@gmail.com">ternopilhubcom@gmail.com</a></p><p><a href="#/messages">Написати в чат →</a></p></div></section></div>';
}

// ================= ВАНТАЖІ =================
async function shipments(v, parts) {
  const list = await api().listShipments();
  let q = '', st = '';
  const draw = () => {
    const rows = list.filter((s) => (!st || (st === 'open' ? !CLOSED.includes(s.status) : s.status === st)) && (!q || (s.number + ' ' + (s.title || '')).toLowerCase().includes(q)));
    v.querySelector('#tb').innerHTML = rows.length ? rows.map((s) =>
      '<tr data-id="' + esc(s.id) + '" tabindex="0"><td><b>' + esc(s.number) + '</b></td><td>' + esc(s.title || '—') + '</td><td>' + esc(ARRIVAL_TYPES[s.arrival_type] || '—') + '</td><td>' + esc(s.pallets || '—') + '</td><td>' + badge(s.status) + '</td><td>' + fmtDate(s.updated_at || s.created_at) + '</td></tr>').join('')
      : '<tr><td colspan="6">' + empty('Нічого не знайдено') + '</td></tr>';
  };
  v.innerHTML = '<div class="head"><h1>Мої вантажі</h1><a class="btn" href="#/new">+ Нова заявка</a></div>' + pendingBanner() +
    '<div class="toolbar"><input id="q" type="search" placeholder="Пошук за номером або описом"><select id="st"><option value="">Усі статуси</option><option value="open">Активні</option>' +
    Object.keys(STATUS).map((k) => '<option value="' + k + '">' + esc(STATUS[k].label) + '</option>').join('') + '</select></div>' +
    '<div class="tablewrap"><table class="t"><thead><tr><th>№</th><th>Вантаж</th><th>Тип</th><th>Палет</th><th>Статус</th><th>Оновлено</th></tr></thead><tbody id="tb"></tbody></table></div>';
  draw();
  v.querySelector('#q').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
  v.querySelector('#st').addEventListener('change', (e) => { st = e.target.value; draw(); });
  const open = (id) => openShipment(list.find((s) => s.id === id));
  v.querySelector('#tb').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) open(tr.dataset.id); });
  v.querySelector('#tb').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const tr = e.target.closest('tr[data-id]'); if (tr) open(tr.dataset.id); } });
  if (parts[0]) { const s = list.find((x) => x.id === parts[0]); if (s) open(s.id); }
}

async function openShipment(s) {
  const [events, docs] = await Promise.all([api().listEvents(s.id), api().listDocuments()]);
  const sd = docs.filter((d) => d.shipment_id === s.id);
  const m = modal(s.number + ' · ' + (s.title || 'Вантаж'),
    '<div class="sh-head">' + badge(s.status) + '<span class="muted">' + esc((STATUS[s.status] || {}).hint || '') + '</span></div>' + stepper(s.status) +
    '<dl class="info">' +
    '<div><dt>Тип прибуття</dt><dd>' + esc(ARRIVAL_TYPES[s.arrival_type] || '—') + '</dd></div><div><dt>Очікувана дата</dt><dd>' + fmtDate(s.eta) + '</dd></div>' +
    '<div><dt>Місць / палет</dt><dd>' + esc(s.places || '—') + ' / ' + esc(s.pallets || '—') + '</dd></div><div><dt>Вага / об\'єм</dt><dd>' + esc(s.weight || '—') + ' кг / ' + esc(s.volume || '—') + ' м³</dd></div>' +
    '<div><dt>Оголошена вартість</dt><dd>' + (s.declared_value ? money(s.declared_value) : '—') + '</dd></div><div><dt>Місце на складі</dt><dd>' + esc(s.location || '—') + '</dd></div>' +
    '<div class="wide"><dt>Одержувачі / напрямки</dt><dd>' + esc(s.receivers || '—') + '</dd></div></dl>' +
    (s.calc && s.calc.lines ? '<p class="muted">Орієнтовна вартість послуг у заявці: <b>' + money(s.calc.total) + '</b> без ПДВ' + (s.calc.offer ? '<br>Ваша пропозиція ціни: <b>' + money(s.calc.offer.price) + '</b>' + (s.calc.offer.comment ? ' (' + esc(s.calc.offer.comment) + ')' : '') : '') + '</p>' : '') +
    '<h3>Історія</h3><ul class="timeline2">' + (events.length ? events.map((e) => '<li>' + badge(e.status) + ' <span>' + esc(e.comment || '') + '</span><small>' + fmtDate(e.created_at, true) + '</small></li>').join('') : '<li class="muted">Подій немає</li>') + '</ul>' +
    (sd.length ? '<h3>Документи</h3><ul class="doclist">' + sd.map((d) => '<li><a href="' + esc(d.url || '#') + '" target="_blank" rel="noopener">' + icon('file') + esc(d.name) + '</a><small>' + esc(DOC_KINDS[d.kind] || '') + ' · ' + fmtDate(d.created_at) + '</small></li>').join('') + '</ul>' : '') +
    '<div class="actions-row"><button class="btn small" data-a="msg" type="button">Написати менеджеру</button>' +
    (['stored', 'ready', 'accepted', 'processing'].includes(s.status) ? '<button class="btn small ghost-dark2" data-a="dispatch" type="button">Запросити відвантаження</button>' : '') +
    (s.status === 'requested' ? '<button class="btn small ghost-dark2 danger" data-a="cancel" type="button">Скасувати заявку</button>' : '') + '</div>', { wide: true });
  m.el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    try {
      if (a.dataset.a === 'msg') { m.close(); ctx.go('#/messages'); }
      if (a.dataset.a === 'dispatch') {
        await api().sendMessage(null, 'Прошу підготувати до відвантаження вантаж ' + s.number + '. Одержувачі / напрямки: ' + (s.receivers || 'уточню в чаті') + '.', s.id);
        notifyManager(CABINET_CONFIG.notifyEndpoint, 'Запит на відвантаження', ctx.profile.company_name + ': ' + s.number);
        toast('Запит надіслано менеджеру'); m.close();
      }
      if (a.dataset.a === 'cancel' && confirm('Скасувати заявку ' + s.number + '?')) { await api().cancelShipment(s.id); toast('Заявку скасовано'); m.close(); window.__route(); }
    } catch (er) { toast(er.message, 'err'); }
  });
}

// ================= НОВА ЗАЯВКА =================
async function newRequest(v) {
  if (!isActive()) { v.innerHTML = '<h1>Нова заявка</h1>' + locked('Створювати заявки можна після підтвердження облікового запису.'); return; }
  const calc = savedCalc();
  v.innerHTML = '<h1>Нова заявка на приймання вантажу</h1><form id="nf" class="card2 form" novalidate>' +
    '<div class="grid2"><label>Тип прибуття<select name="arrival_type">' + Object.keys(ARRIVAL_TYPES).map((k) => '<option value="' + k + '">' + esc(ARRIVAL_TYPES[k]) + '</option>').join('') + '</select></label>' +
    '<label>Очікувана дата прибуття *<input name="eta" type="date" required></label>' +
    '<label class="wide">Що за вантаж (опис) *<input name="title" required placeholder="наприклад, одяг у коробках"></label>' +
    '<label>Кількість місць<input name="places" type="number" min="0"></label><label>Кількість палет<input name="pallets" type="number" min="0"></label>' +
    '<label>Загальна вага, кг<input name="weight" type="number" min="0"></label><label>Об\'єм, м³<input name="volume" type="number" min="0" step="0.1"></label>' +
    '<label>Оголошена вартість, грн<input name="declared_value" type="number" min="0"></label>' +
    '<label class="wide">Одержувачі та напрямки (куди розподіляти / доставляти)<textarea name="receivers" rows="3"></textarea></label></div>' +
    '<div class="calc-attach">' + (calc ? '<label class="check"><input type="checkbox" id="useCalc" checked> Додати розрахунок з калькулятора: <b>' + money(calc.total) + '</b> без ПДВ (' + calc.lines.length + ' поз.)' + (calc.offer ? ', ваша пропозиція: <b>' + money(calc.offer.price) + '</b>' : '') + '</label>' : '<p class="muted">Хочете додати до заявки розрахунок послуг? <a href="#/calculator">Відкрити калькулятор</a></p>') + '</div>' +
    '<button class="btn" type="submit">Створити заявку</button><p class="msg" id="msg"></p></form>';
  const f = v.querySelector('#nf');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!f.checkValidity()) { f.reportValidity(); return; }
    const d = formData(f);
    ['places', 'pallets', 'weight', 'volume', 'declared_value'].forEach((k) => { d[k] = d[k] === '' ? null : Number(d[k]); });
    if (!d.eta) delete d.eta;
    const uc = v.querySelector('#useCalc'); d.calc = uc && uc.checked ? calc : null;
    try {
      const s = await api().createShipment(d);
      notifyManager(CABINET_CONFIG.notifyEndpoint, 'Нова заявка ' + s.number, ctx.profile.company_name + '\n' + (d.title || '') + '\nПалет: ' + (d.pallets || '-') + ', дата: ' + (d.eta || '-'));
      toast('Заявку ' + s.number + ' створено'); ctx.go('#/shipments/' + s.id);
    } catch (er) { const m = v.querySelector('#msg'); m.className = 'msg err'; m.textContent = er.message; }
  });
}

// ================= КАЛЬКУЛЯТОР =================
async function calculator(v) {
  v.innerHTML = '<h1>Калькулятор вартості</h1><p class="sub">Орієнтовний розрахунок за актуальними тарифами. Його можна додати до заявки або договору.</p><div id="calc"></div>';
  window.Calc.mount(v.querySelector('#calc'), {
    persist: true,
    actions: [
      { label: 'Створити заявку з розрахунком', onClick: () => ctx.go('#/new') },
      { label: 'Скласти договір', kind: 'ghost', onClick: () => ctx.go('#/contracts/new') }
    ]
  });
}

// ================= ДОГОВОРИ =================
async function contracts(v, parts) {
  if (parts[0] === 'new') return contractEditor(v, null);
  if (parts[0] === 'view') { const list = await api().listContracts(); return contractEditor(v, list.find((c) => c.id === parts[1])); }
  const list = await api().listContracts();
  v.innerHTML = '<div class="head"><h1>Договори</h1><a class="btn" href="#/contracts/new">+ Новий договір</a></div>' + pendingBanner() +
    (list.length ? '<div class="tablewrap"><table class="t"><thead><tr><th>№ договору</th><th>Дата</th><th>Діє до</th><th>Статус</th><th></th></tr></thead><tbody>' +
      list.map((c) => '<tr><td><b>' + esc(c.number) + '</b></td><td>' + fmtDate(c.data && c.data.date) + '</td><td>' + fmtDate(c.data && c.data.until) + '</td><td>' + conBadge(c.status) + '</td><td><a href="#/contracts/view/' + esc(c.id) + '">Відкрити</a></td></tr>').join('') + '</tbody></table></div>'
      : empty('Договорів ще немає. Створіть перший: реквізити підставляться з профілю.'));
}

async function contractEditor(v, existing) {
  const all = await api().listContracts();
  const p = ctx.profile;
  const d0 = existing ? existing.data : {
    type: p.type, name: p.company_name, code: p.edrpou, address: p.address, rep: p.contact_name, position: p.position || 'директора', basis: p.basis || 'Статуту',
    tax: p.tax || 'є платником ПДВ', iban: p.iban, bank: p.bank, phone: p.phone, email: p.email,
    num: '', date: new Date().toISOString().slice(0, 10), until: new Date().getFullYear() + '-12-31', pay: '100', payDays: '3'
  };
  const calc = existing ? existing.calc : savedCalc();
  const ro = existing && existing.status !== 'draft';
  const val = (k) => esc(d0[k] || '');
  const sel = (k, opts) => opts.map((o) => '<option value="' + esc(o[0]) + '"' + (String(d0[k]) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('');
  v.innerHTML = '<div class="head"><h1>' + (existing ? 'Договір ' + esc(existing.number) : 'Новий договір') + '</h1>' + (existing ? conBadge(existing.status) : '') + '</div>' +
    '<div class="notice warn small">Шаблон-чернетка. Перед підписанням рекомендуємо показати його юристу. Реквізити підставлено з вашого профілю.</div>' +
    '<form id="cf" class="card2 form" novalidate><fieldset ' + (ro ? 'disabled' : '') + '><div class="grid2">' +
    '<label>Тип<select name="type">' + sel('type', [['le', 'Юридична особа'], ['fop', 'ФОП']]) + '</select></label>' +
    '<label>Назва / ПІБ ФОП *<input name="name" required value="' + val('name') + '"></label>' +
    '<label>ЄДРПОУ / РНОКПП *<input name="code" required value="' + val('code') + '"></label>' +
    '<label>Податковий статус<select name="tax">' + sel('tax', [['є платником ПДВ', 'платник ПДВ'], ['є платником єдиного податку', 'єдиний податок'], ['є платником податку на прибуток', 'податок на прибуток']]) + '</select></label>' +
    '<label class="wide">Адреса *<input name="address" required value="' + val('address') + '"></label>' +
    '<label>ПІБ підписанта *<input name="rep" required value="' + val('rep') + '"></label><label>Посада<input name="position" value="' + val('position') + '"></label>' +
    '<label>Діє на підставі<select name="basis">' + sel('basis', [['Статуту', 'Статуту'], ['виписки з ЄДР', 'виписки з ЄДР'], ['довіреності', 'довіреності']]) + '</select></label>' +
    '<label>IBAN<input name="iban" value="' + val('iban') + '"></label><label>Банк<input name="bank" value="' + val('bank') + '"></label>' +
    '<label>Телефон *<input name="phone" required value="' + val('phone') + '"></label><label>Email *<input name="email" type="email" required value="' + val('email') + '"></label>' +
    '<label>№ договору<input name="num" value="' + esc(d0.num || (existing ? existing.number : 'Л-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '/' + (all.length + 1))) + '"></label>' +
    '<label>Дата<input name="date" type="date" value="' + val('date') + '"></label><label>Діє до<input name="until" type="date" value="' + val('until') + '"></label>' +
    '<label>Оплата<select name="pay">' + sel('pay', [['100', '100% передоплата'], ['50', '50% / 50%'], ['post', 'Післяоплата за актом']]) + '</select></label>' +
    '<label>Строк оплати, банк. днів<input name="payDays" type="number" min="1" value="' + val('payDays') + '"></label></div></fieldset>' +
    (calc && calc.lines ? '<p class="muted">До договору буде додано розрахунок із калькулятора: <b>' + money(calc.total) + '</b> без ПДВ' + (calc.offer ? ', пропозиція ціни: <b>' + money(calc.offer.price) + '</b>' : '') + ' (Додаток 3).</p>' : '') +
    '<div class="actions-row">' + (ro ? '' : '<button class="btn" type="submit">Сформувати договір</button>') + '</div><p class="msg" id="msg"></p></form>' +
    '<div id="pv" hidden><div class="actions-row sticky">' +
    '<button class="btn small ghost-dark2" id="b-print" type="button">Друк / PDF</button><button class="btn small ghost-dark2" id="b-doc" type="button">Завантажити .doc</button>' +
    (ro ? '' : '<button class="btn small ghost-dark2" id="b-save" type="button">Зберегти чернетку</button><button class="btn small" id="b-send" type="button">Надіслати на підписання</button>') +
    '</div><article class="doc docview" id="doc"></article></div>';
  const f = v.querySelector('#cf'), doc = v.querySelector('#doc'), pv = v.querySelector('#pv');
  let cur = null;
  const build = () => {
    const d = Object.fromEntries(new FormData(f)); // disabled поля не потрапляють у FormData
    const data = Object.assign({}, d0, d);
    cur = { data, r: window.ContractCore.build(data, calc) };
    doc.innerHTML = cur.r.html; pv.hidden = false; return cur;
  };
  f.addEventListener('submit', (e) => { e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; } build(); pv.scrollIntoView({ behavior: 'smooth' }); });
  if (existing) build();
  v.querySelector('#b-print').addEventListener('click', () => window.ContractCore.print(doc));
  v.querySelector('#b-doc').addEventListener('click', () => window.ContractCore.download(doc, cur.r.num));
  const save = async () => {
    if (!f.checkValidity()) { f.reportValidity(); return null; }
    const c = build();
    return api().saveContract({ id: existing && existing.id, number: c.r.num, data: c.data, calc: calc });
  };
  const bs = v.querySelector('#b-save');
  if (bs) bs.addEventListener('click', async () => { try { const k = await save(); if (k) { toast('Чернетку збережено'); ctx.go('#/contracts'); } } catch (er) { toast(er.message, 'err'); } });
  const bn = v.querySelector('#b-send');
  if (bn) bn.addEventListener('click', async () => {
    try {
      const k = await save(); if (!k) return;
      await api().setContractStatus(k.id, 'sent');
      notifyManager(CABINET_CONFIG.notifyEndpoint, 'Договір на підписання', ctx.profile.company_name + ': ' + k.number);
      toast('Договір надіслано на підписання'); ctx.go('#/contracts');
    } catch (er) { toast(er.message, 'err'); }
  });
}

// ================= ДОКУМЕНТИ =================
async function documents(v) {
  const docs = await api().listDocuments();
  const sh = await api().listShipments(); const num = Object.fromEntries(sh.map((s) => [s.id, s.number]));
  v.innerHTML = '<h1>Документи</h1><p class="sub">Акти, рахунки та фото приймання, які завантажує менеджер.</p>' +
    (docs.length ? '<div class="tablewrap"><table class="t"><thead><tr><th>Документ</th><th>Тип</th><th>Вантаж</th><th>Дата</th></tr></thead><tbody>' +
      docs.map((d) => '<tr><td><a href="' + esc(d.url || '#') + '" target="_blank" rel="noopener">' + icon('file') + ' ' + esc(d.name) + '</a></td><td>' + esc(DOC_KINDS[d.kind] || '') + '</td><td>' + esc(num[d.shipment_id] || '—') + '</td><td>' + fmtDate(d.created_at) + '</td></tr>').join('') + '</tbody></table></div>'
      : empty('Документів поки немає.'));
}

// ================= ВІДЕОСПОСТЕРЕЖЕННЯ =================
const rafs = new Set();
function drawFeed(canvas, label, who) {
  const c = canvas.getContext('2d'); const W = canvas.width, H = canvas.height; let t = Math.random() * 100;
  const frame = () => {
    t += 0.016;
    c.fillStyle = '#2a2f38'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#383e49'; c.fillRect(0, H * 0.55, W, H * 0.45);
    c.strokeStyle = '#d4a017'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, H * 0.78); c.lineTo(W, H * 0.78); c.stroke();
    for (let i = 0; i < 4; i++) { c.fillStyle = '#c0392b'; c.fillRect(W * (0.05 + i * 0.25), H * 0.08, 5, H * 0.5); c.fillStyle = '#d35400'; for (let r = 0; r < 3; r++) c.fillRect(W * (0.05 + i * 0.25) + 8, H * (0.12 + r * 0.15), W * 0.17, H * 0.1); }
    const x = ((Math.sin(t * 0.6) + 1) / 2) * (W * 0.7) + W * 0.05;
    c.fillStyle = '#f39c12'; c.fillRect(x, H * 0.62, W * 0.14, H * 0.12); c.fillStyle = '#222'; c.fillRect(x + W * 0.02, H * 0.74, W * 0.03, H * 0.04); c.fillRect(x + W * 0.09, H * 0.74, W * 0.03, H * 0.04);
    c.fillStyle = '#e0c9a6'; c.fillRect(x + W * 0.14, H * 0.58, W * 0.07, H * 0.12);
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, 0, W, 22);
    c.fillStyle = '#fff'; c.font = '12px system-ui'; c.fillText(label + ' · ДЕМО', 8, 15);
    c.fillStyle = Math.floor(t * 2) % 2 ? '#ff3b30' : 'rgba(255,59,48,.2)'; c.beginPath(); c.arc(W - 14, 11, 5, 0, 7); c.fill();
    if (H > 150) { c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, H - 22, W, 22); c.fillStyle = '#fff'; c.fillText(new Date().toLocaleString('uk-UA') + '   ' + (who || ''), 8, H - 7); }
    const id = requestAnimationFrame(frame); rafs.add(id); canvas.__raf = id;
  };
  frame();
}
const stopFeeds = () => { rafs.forEach((id) => cancelAnimationFrame(id)); rafs.clear(); };
function loadHls() { return new Promise((res, rej) => { if (window.Hls) return res(); const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js'; s.onload = res; s.onerror = () => rej(new Error('Не вдалося завантажити плеєр')); document.head.appendChild(s); }); }

async function cameras(v) {
  if (!isActive()) { v.innerHTML = '<h1>Відеоспостереження</h1>' + locked('Доступ до камер відкривається для підтверджених клієнтів.'); return; }
  const list = await api().listCameras();
  v.innerHTML = '<h1>Відеоспостереження</h1><p class="sub">Камери зон вашого вантажу. Перегляд фіксується в журналі. Запис, знімки екрана та передача доступу третім особам заборонені.</p>' +
    (list.length ? '<div class="camgrid">' + list.map((c) => '<button class="cam" type="button" data-id="' + esc(c.id) + '"><canvas width="320" height="180" data-demo="' + (c.kind === 'demo' ? '1' : '') + '" data-name="' + esc(c.name) + '"></canvas><span><b>' + esc(c.name) + '</b><small>' + esc(c.zone || '') + '</small></span></button>').join('') + '</div>'
      : '<div class="notice"><h3>Камер поки не відкрито</h3><p>Доступ надає менеджер для зон, де зберігається ваш вантаж.</p><p><button class="btn small" id="req" type="button">Запросити доступ</button></p></div>');
  v.querySelectorAll('canvas[data-demo="1"]').forEach((cv) => drawFeed(cv, cv.dataset.name, ''));
  v.querySelectorAll('canvas:not([data-demo="1"])').forEach((cv) => { const x = cv.getContext('2d'); x.fillStyle = '#1c2230'; x.fillRect(0, 0, 320, 180); x.fillStyle = '#8d98b3'; x.font = '14px system-ui'; x.fillText('Натисніть, щоб відкрити трансляцію', 40, 95); });
  const rq = v.querySelector('#req');
  if (rq) rq.addEventListener('click', async () => { await api().sendMessage(null, 'Прошу відкрити доступ до камер відеоспостереження для моїх вантажів.'); notifyManager(CABINET_CONFIG.notifyEndpoint, 'Запит доступу до камер', ctx.profile.company_name); toast('Запит надіслано'); });
  v.querySelectorAll('.cam').forEach((b) => b.addEventListener('click', () => openCamera(list.find((c) => c.id === b.dataset.id))));
  return stopFeeds;
}

async function openCamera(cam) {
  const who = (ctx.profile.company_name || ctx.profile.email);
  let timer = null, hls = null, imgTimer = null;
  const m = modal(cam.name + (cam.zone ? ' · ' + cam.zone : ''), '<div class="player" id="pl"><div class="wm" id="wm"></div></div><p class="muted small">Перегляд фіксується. Не передавайте доступ третім особам.</p>', {
    wide: true, onClose: () => { clearInterval(timer); clearInterval(imgTimer); if (hls) hls.destroy(); stopFeeds(); }
  });
  const pl = m.el.querySelector('#pl'); const wm = m.el.querySelector('#wm');
  const tick = () => { wm.textContent = who + ' · ' + new Date().toLocaleString('uk-UA'); };
  tick(); timer = setInterval(tick, 1000);
  try { await api().logCameraView(cam.id); } catch (_) {}
  try {
    if (cam.kind === 'demo') { const cv = document.createElement('canvas'); cv.width = 960; cv.height = 540; pl.prepend(cv); drawFeed(cv, cam.name, who); }
    else if (cam.kind === 'hls') {
      const vid = document.createElement('video'); vid.controls = true; vid.autoplay = true; vid.muted = true; vid.playsInline = true; pl.prepend(vid);
      if (vid.canPlayType('application/vnd.apple.mpegurl')) vid.src = cam.url;
      else { await loadHls(); hls = new window.Hls(); hls.loadSource(cam.url); hls.attachMedia(vid); }
    } else if (cam.kind === 'iframe') {
      const fr = document.createElement('iframe'); fr.src = cam.url; fr.allow = 'autoplay'; fr.setAttribute('sandbox', 'allow-scripts allow-same-origin'); pl.prepend(fr);
    } else {
      const im = document.createElement('img'); pl.prepend(im);
      const upd = () => { im.src = cam.url + (cam.url.includes('?') ? '&' : '?') + 't=' + Date.now(); }; upd(); imgTimer = setInterval(upd, 2000);
    }
  } catch (e) { pl.insertAdjacentHTML('afterbegin', '<p class="pad err">' + esc(e.message) + '</p>'); }
}

// ================= ПОВІДОМЛЕННЯ =================
async function messages(v) {
  let timer = null;
  const sh = await api().listShipments(); const num = Object.fromEntries(sh.map((s) => [s.id, s.number]));
  v.innerHTML = '<h1>Повідомлення</h1><p class="sub">Чат із менеджером. Для термінових питань телефонуйте <a href="tel:+380673524745">+380 67 352 47 45</a>.</p>' +
    '<div class="chat"><div class="thread" id="th"></div><form id="mf" class="compose"><input name="text" placeholder="Напишіть повідомлення…" autocomplete="off" required><button class="btn" type="submit">Надіслати</button></form></div>';
  const th = v.querySelector('#th');
  const load = async () => {
    const list = await api().listMessages();
    const atEnd = th.scrollHeight - th.scrollTop - th.clientHeight < 60;
    th.innerHTML = list.length ? list.map((m) => '<div class="bubble ' + m.from_role + '"><p>' + esc(m.text) + '</p><small>' + (m.shipment_id && num[m.shipment_id] ? esc(num[m.shipment_id]) + ' · ' : '') + fmtDate(m.created_at, true) + '</small></div>').join('') : empty('Повідомлень поки немає. Напишіть першим.');
    if (atEnd) th.scrollTop = th.scrollHeight;
  };
  await load(); th.scrollTop = th.scrollHeight;
  v.querySelector('#mf').addEventListener('submit', async (e) => {
    e.preventDefault(); const inp = e.target.elements.text; const t = inp.value.trim(); if (!t) return;
    inp.value = '';
    try { await api().sendMessage(null, t); notifyManager(CABINET_CONFIG.notifyEndpoint, 'Нове повідомлення в кабінеті', ctx.profile.company_name + ': ' + t); await load(); th.scrollTop = th.scrollHeight; } catch (er) { toast(er.message, 'err'); }
  });
  timer = setInterval(() => load().catch(() => {}), 8000);
  return () => clearInterval(timer);
}

// ================= ПРОФІЛЬ =================
async function profile(v) {
  const p = ctx.profile; const pr = p.prefs || {};
  const val = (k) => esc(p[k] || '');
  v.innerHTML = '<h1>Профіль компанії</h1><div class="head2">' + accBadge(p.status) + '<span class="muted">' + esc(p.email) + '</span></div>' + pendingBanner() +
    '<form id="pf" class="card2 form" novalidate><div class="grid2">' +
    '<label>Тип<select name="type"><option value="le"' + (p.type === 'le' ? ' selected' : '') + '>Юридична особа</option><option value="fop"' + (p.type === 'fop' ? ' selected' : '') + '>ФОП</option></select></label>' +
    '<label>Назва / ПІБ ФОП<input name="company_name" value="' + val('company_name') + '"></label><label>ЄДРПОУ / РНОКПП<input name="edrpou" value="' + val('edrpou') + '"></label>' +
    '<label>Контактна особа<input name="contact_name" value="' + val('contact_name') + '"></label><label>Посада підписанта<input name="position" value="' + val('position') + '"></label>' +
    '<label>Діє на підставі<input name="basis" value="' + val('basis') + '" placeholder="Статуту"></label><label>Телефон<input name="phone" value="' + val('phone') + '"></label>' +
    '<label class="wide">Адреса<input name="address" value="' + val('address') + '"></label><label>IBAN<input name="iban" value="' + val('iban') + '"></label><label>Банк<input name="bank" value="' + val('bank') + '"></label>' +
    '<label>Податковий статус<input name="tax" value="' + val('tax') + '"></label></div>' +
    '<h3>Сповіщення</h3><label class="check"><input type="checkbox" name="pref_email"' + (pr.email !== false ? ' checked' : '') + '> На електронну пошту</label>' +
    '<label class="check"><input type="checkbox" name="pref_tg"' + (pr.telegram ? ' checked' : '') + '> У Telegram (менеджер підключить за запитом)</label>' +
    '<button class="btn" type="submit">Зберегти</button><p class="msg" id="msg"></p></form>' +
    '<form id="pw" class="card2 form" novalidate><h3>Безпека</h3><div class="grid2"><label>Новий пароль (мін. 8 символів)<input name="p1" type="password" minlength="8" autocomplete="new-password"></label><label>Повторіть пароль<input name="p2" type="password" minlength="8" autocomplete="new-password"></label></div>' +
    '<button class="btn ghost-dark2" type="submit">Змінити пароль</button><p class="msg" id="msg2"></p></form>' +
    '<p class="muted small">Щоб видалити обліковий запис і дані, напишіть менеджеру в <a href="#/messages">чат</a>.</p>';
  v.querySelector('#pf').addEventListener('submit', async (e) => {
    e.preventDefault(); const d = formData(e.target); const prefs = { email: !!d.pref_email, telegram: !!d.pref_tg };
    delete d.pref_email; delete d.pref_tg;
    try { ctx.profile = Object.assign(ctx.profile, await api().updateProfile(Object.assign(d, { prefs }))); toast('Профіль збережено'); } catch (er) { const m = v.querySelector('#msg'); m.className = 'msg err'; m.textContent = er.message; }
  });
  v.querySelector('#pw').addEventListener('submit', async (e) => {
    e.preventDefault(); const m = v.querySelector('#msg2'); const d = formData(e.target);
    if (!d.p1 || d.p1.length < 8) { m.className = 'msg err'; m.textContent = 'Пароль має містити щонайменше 8 символів'; return; }
    if (d.p1 !== d.p2) { m.className = 'msg err'; m.textContent = 'Паролі не збігаються'; return; }
    try { await api().changePassword(d.p1); e.target.reset(); m.className = 'msg ok'; m.textContent = 'Пароль змінено'; } catch (er) { m.className = 'msg err'; m.textContent = er.message; }
  });
}

export const clientViews = { dashboard, shipments, new: newRequest, calculator, contracts, documents, cameras, messages, profile };
