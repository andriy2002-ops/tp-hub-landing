// Демо-бекенд: усі дані зберігаються тільки в localStorage цього браузера.
import { STATUS } from './data.js';

const KEY = 'rlk_demo_db_v1';
const SES = 'rlk_demo_session';
const uid = () => 'id' + Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const dago = (d, h) => new Date(Date.now() - d * 864e5 - (h || 0) * 36e5).toISOString();
const clone = (x) => JSON.parse(JSON.stringify(x));

function seed() {
  const mgr = { id: 'mgr1', email: 'manager@demo.ua', password: 'demo', role: 'manager', status: 'active', company_name: 'РЛК Тернопіль', contact_name: 'Менеджер хабу', phone: '+380 67 352 47 45', created_at: dago(90) };
  const c1 = { id: 'cli1', email: 'client@demo.ua', password: 'demo', role: 'client', status: 'active', type: 'le', company_name: 'ТОВ «Демо-Імпорт»', edrpou: '12345678', contact_name: 'Олена Коваленко', position: 'директора', basis: 'Статуту', phone: '+380 50 111 22 33', address: '79000, м. Львів, вул. Зелена, 10', tax: 'є платником ПДВ', iban: 'UA213223130000026007233566001', bank: 'АТ «Демо-Банк»', prefs: { email: true, telegram: false }, created_at: dago(40) };
  const c2 = { id: 'cli2', email: 'cargo@demo.ua', password: 'demo', role: 'client', status: 'pending', type: 'fop', company_name: 'ФОП Мельник Андрій', edrpou: '3012345678', contact_name: 'Андрій Мельник', phone: '+380 63 000 11 22', address: 'м. Київ', tax: 'є платником єдиного податку', prefs: { email: true }, created_at: dago(1) };
  const sh = [
    { id: 's1', number: 'TP-000101', client_id: 'cli1', arrival_type: 'c40', title: 'Одяг, коробки (партія з Китаю)', places: 480, pallets: 22, weight: 9800, volume: 62, declared_value: 650000, eta: dago(-2).slice(0, 10), status: 'stored', location: 'Ряд 3, стелаж B, рівні 1–3', receivers: 'Розподіл по 6 магазинах', created_at: dago(12), updated_at: dago(8) },
    { id: 's2', number: 'TP-000102', client_id: 'cli1', arrival_type: 'truck', title: 'Побутова техніка', places: 120, pallets: 12, weight: 4100, volume: 48, declared_value: 420000, eta: dago(0).slice(0, 10), status: 'unloading', location: '', receivers: 'Київ, Львів, Харків', created_at: dago(4), updated_at: dago(0, 2) },
    { id: 's3', number: 'TP-000103', client_id: 'cli1', arrival_type: 'c20', title: 'Запчастини', places: 60, pallets: 6, weight: 2300, volume: 24, declared_value: 190000, eta: dago(-6).slice(0, 10), status: 'requested', location: '', receivers: 'Склад клієнта, Одеса', created_at: dago(0, 5), updated_at: dago(0, 5) },
    { id: 's4', number: 'TP-000099', client_id: 'cli1', arrival_type: 'van', title: 'Зразки продукції', places: 14, pallets: 1, weight: 220, volume: 3, declared_value: 30000, eta: dago(25).slice(0, 10), status: 'delivered', location: '', receivers: 'Рівне', created_at: dago(30), updated_at: dago(22) }
  ];
  const ev = [];
  const push = (sid, status, comment, d, h) => ev.push({ id: uid(), shipment_id: sid, status, comment, created_at: dago(d, h), by_role: status === 'requested' ? 'client' : 'manager' });
  push('s1', 'requested', 'Заявку створено', 12); push('s1', 'confirmed', 'Підтверджено на ' + dago(-2).slice(0, 10), 11); push('s1', 'received', 'Контейнер на території хабу', 9);
  push('s1', 'unloading', 'Розвантаження розпочато', 9, -1); push('s1', 'accepted', 'Прийнято 480 місць, пошкоджень немає', 8, 6); push('s1', 'stored', 'Розміщено: ряд 3, стелаж B', 8);
  push('s2', 'requested', 'Заявку створено', 4); push('s2', 'confirmed', 'Підтверджено', 3); push('s2', 'arriving', 'Фура виїхала з кордону', 1); push('s2', 'received', 'Фура під рампою №2', 0, 3); push('s2', 'unloading', 'Розвантаження: 12 палет', 0, 2);
  push('s3', 'requested', 'Заявку створено', 0, 5);
  push('s4', 'requested', 'Заявку створено', 30); push('s4', 'stored', 'На зберіганні', 28); push('s4', 'dispatched', 'Передано електрофургоном', 22, 4); push('s4', 'delivered', 'Вручено одержувачу, Рівне', 22);
  return {
    users: [mgr, c1, c2], shipments: sh, events: ev,
    contracts: [{ id: 'k1', client_id: 'cli1', number: 'Л-20260901/1', status: 'signed', data: { type: 'le', name: 'ТОВ «Демо-Імпорт»', code: '12345678', address: '79000, м. Львів, вул. Зелена, 10', rep: 'Коваленко Олена Миколаївна', position: 'директора', basis: 'Статуту', tax: 'є платником ПДВ', iban: 'UA213223130000026007233566001', bank: 'АТ «Демо-Банк»', phone: '+380 50 111 22 33', email: 'client@demo.ua', num: 'Л-20260901/1', date: dago(40).slice(0, 10), until: '2026-12-31', pay: '100', payDays: '3' }, calc: null, created_at: dago(40), updated_at: dago(38) }],
    documents: [
      { id: uid(), client_id: 'cli1', shipment_id: 's1', kind: 'act', name: 'Акт приймання TP-000101', url: '#', created_at: dago(8) },
      { id: uid(), client_id: 'cli1', shipment_id: 's1', kind: 'photo', name: 'Фото розвантаження контейнера', url: '#', created_at: dago(9) },
      { id: uid(), client_id: 'cli1', shipment_id: null, kind: 'invoice', name: 'Рахунок № 214 за вересень', url: '#', created_at: dago(5) }
    ],
    cameras: [
      { id: 'cam1', name: 'Рампа №1', zone: 'Приймання', kind: 'demo', url: '', active: true },
      { id: 'cam2', name: 'Стелажі, ряд 3', zone: 'Зберігання', kind: 'demo', url: '', active: true },
      { id: 'cam3', name: 'Зона відвантаження', zone: 'Відправка', kind: 'demo', url: '', active: true }
    ],
    access: [{ camera_id: 'cam1', client_id: 'cli1' }, { camera_id: 'cam2', client_id: 'cli1' }],
    messages: [
      { id: uid(), client_id: 'cli1', shipment_id: null, from_role: 'manager', text: 'Вітаємо в кабінеті! Якщо потрібна допомога, пишіть тут.', created_at: dago(38) },
      { id: uid(), client_id: 'cli1', shipment_id: 's2', from_role: 'client', text: 'Фура вже під рампою? Скільки триватиме розвантаження?', created_at: dago(0, 3) },
      { id: uid(), client_id: 'cli1', shipment_id: 's2', from_role: 'manager', text: 'Так, рампа №2. Орієнтовно 2–3 години, повідомимо про завершення.', created_at: dago(0, 2) }
    ],
    notifications: [
      { id: uid(), client_id: 'cli1', text: 'TP-000102: Розвантаження', link: '#/shipments', read: false, created_at: dago(0, 2) },
      { id: uid(), client_id: 'cli1', text: 'Новий документ: Рахунок № 214 за вересень', link: '#/documents', read: false, created_at: dago(5) }
    ],
    views: [], counter: 103
  };
}

export function createDemo() {
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) {}
  if (!db) db = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (_) {} };
  const sid = () => sessionStorage.getItem(SES);
  const me = () => db.users.find((u) => u.id === sid());
  const need = () => { const u = me(); if (!u) throw new Error('Потрібен вхід'); return u; };
  const isMgr = () => need().role === 'manager';
  const pub = (u) => { const c = clone(u); delete c.password; return c; };
  const notify = (client_id, text, link) => { db.notifications.push({ id: uid(), client_id, text, link, read: false, created_at: now() }); };
  const own = (list) => (isMgr() ? list : list.filter((x) => x.client_id === need().id));

  return {
    mode: 'demo',
    async signUp(d) {
      if (db.users.some((u) => u.email.toLowerCase() === d.email.toLowerCase())) throw new Error('Користувач із такою поштою вже існує');
      const u = { id: uid(), role: 'client', status: 'pending', prefs: { email: true }, created_at: now(), ...d };
      db.users.push(u); save();
      sessionStorage.setItem(SES, u.id);
      return { needsConfirm: false };
    },
    async signIn(email, password) {
      const u = db.users.find((x) => x.email.toLowerCase() === String(email).toLowerCase() && x.password === password);
      if (!u) throw new Error('Невірна пошта або пароль');
      if (u.status === 'blocked') throw new Error('Обліковий запис заблоковано. Зверніться до менеджера.');
      sessionStorage.setItem(SES, u.id);
    },
    async signOut() { sessionStorage.removeItem(SES); },
    async resetPassword() { return true; },
    async changePassword(pw) { need().password = pw; save(); },
    async getSession() { return me() ? { id: me().id } : null; },
    async getProfile() { return pub(need()); },
    async updateProfile(patch) {
      const u = need();
      ['company_name', 'edrpou', 'contact_name', 'position', 'basis', 'phone', 'address', 'tax', 'iban', 'bank', 'prefs', 'type'].forEach((k) => { if (k in patch) u[k] = patch[k]; });
      save(); return pub(u);
    },
    async listProfiles() { if (!isMgr()) throw new Error('Немає доступу'); return db.users.filter((u) => u.role === 'client').map(pub); },
    async setProfileStatus(id, status) {
      if (!isMgr()) throw new Error('Немає доступу');
      const u = db.users.find((x) => x.id === id); u.status = status;
      if (status === 'active') notify(id, 'Ваш обліковий запис активовано. Доступні заявки, документи та камери.', '#/dashboard');
      save();
    },

    async listShipments() { return clone(own(db.shipments)).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async getShipment(id) { const s = db.shipments.find((x) => x.id === id); if (!s || (!isMgr() && s.client_id !== need().id)) throw new Error('Не знайдено'); return clone(s); },
    async createShipment(d) {
      const u = need();
      const client_id = isMgr() ? d.client_id : u.id;
      if (!isMgr() && u.status !== 'active') throw new Error('Обліковий запис ще не підтверджено');
      db.counter += 1;
      const s = { id: uid(), number: 'TP-' + String(db.counter).padStart(6, '0'), client_id, status: 'requested', location: '', created_at: now(), updated_at: now(), ...d, client_id };
      db.shipments.push(s);
      db.events.push({ id: uid(), shipment_id: s.id, status: 'requested', comment: 'Заявку створено', created_at: now(), by_role: u.role });
      save(); return clone(s);
    },
    async updateShipment(id, patch, status, comment) {
      if (!isMgr()) throw new Error('Немає доступу');
      const s = db.shipments.find((x) => x.id === id);
      Object.assign(s, patch, { updated_at: now() });
      if (status && status !== s.status) {
        s.status = status;
        db.events.push({ id: uid(), shipment_id: id, status, comment: comment || '', created_at: now(), by_role: 'manager' });
        notify(s.client_id, s.number + ': ' + (STATUS[status] || {}).label, '#/shipments');
      } else if (comment) {
        db.events.push({ id: uid(), shipment_id: id, status: s.status, comment, created_at: now(), by_role: 'manager' });
        notify(s.client_id, s.number + ': ' + comment, '#/shipments');
      }
      save();
    },
    async cancelShipment(id) {
      const s = db.shipments.find((x) => x.id === id);
      if (!s || s.client_id !== need().id || s.status !== 'requested') throw new Error('Скасувати можна лише нову заявку');
      s.status = 'cancelled'; s.updated_at = now();
      db.events.push({ id: uid(), shipment_id: id, status: 'cancelled', comment: 'Скасовано клієнтом', created_at: now(), by_role: 'client' });
      save();
    },
    async listEvents(shipmentId) {
      const ids = new Set(own(db.shipments).map((s) => s.id));
      return clone(db.events.filter((e) => ids.has(e.shipment_id) && (!shipmentId || e.shipment_id === shipmentId))).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async listContracts() { return clone(own(db.contracts)).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async saveContract(c) {
      const u = need();
      if (c.id) {
        const k = db.contracts.find((x) => x.id === c.id);
        if (!isMgr() && k.client_id !== u.id) throw new Error('Немає доступу');
        Object.assign(k, { data: c.data, calc: c.calc, number: c.number, status: c.status || k.status, updated_at: now() });
        save(); return clone(k);
      }
      const k = { id: uid(), client_id: u.id, number: c.number, status: c.status || 'draft', data: c.data, calc: c.calc, created_at: now(), updated_at: now() };
      db.contracts.push(k); save(); return clone(k);
    },
    async setContractStatus(id, status) {
      const k = db.contracts.find((x) => x.id === id);
      if (!k) throw new Error('Не знайдено');
      if (isMgr()) { k.status = status; if (status === 'signed') notify(k.client_id, 'Договір ' + k.number + ' підписано', '#/contracts'); }
      else if (k.client_id === need().id && status === 'sent' && k.status === 'draft') k.status = 'sent';
      else throw new Error('Немає доступу');
      k.updated_at = now(); save();
    },

    async listDocuments() { return clone(own(db.documents)).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async addDocument(d) {
      if (!isMgr()) throw new Error('Немає доступу');
      const doc = { id: uid(), created_at: now(), shipment_id: null, ...d }; db.documents.push(doc);
      notify(d.client_id, 'Новий документ: ' + d.name, '#/documents'); save(); return clone(doc);
    },

    async listCameras() {
      const u = need();
      if (u.role === 'manager') return clone(db.cameras);
      if (u.status !== 'active') return [];
      const ids = new Set(db.access.filter((a) => a.client_id === u.id).map((a) => a.camera_id));
      return clone(db.cameras.filter((c) => c.active && ids.has(c.id)));
    },
    async saveCamera(c) {
      if (!isMgr()) throw new Error('Немає доступу');
      if (c.id) Object.assign(db.cameras.find((x) => x.id === c.id), c); else db.cameras.push({ id: uid(), active: true, ...c });
      save();
    },
    async getCameraAccess(clientId) { return db.access.filter((a) => a.client_id === clientId).map((a) => a.camera_id); },
    async setCameraAccess(clientId, cameraIds) {
      if (!isMgr()) throw new Error('Немає доступу');
      db.access = db.access.filter((a) => a.client_id !== clientId).concat(cameraIds.map((id) => ({ camera_id: id, client_id: clientId })));
      notify(clientId, 'Оновлено доступ до відеоспостереження', '#/cameras'); save();
    },
    async logCameraView(cameraId) {
      const u = need(); db.views.push({ id: uid(), camera_id: cameraId, client_id: u.id, who: u.company_name || u.email, created_at: now() }); save();
    },
    async listCameraViews() { if (!isMgr()) throw new Error('Немає доступу'); return clone(db.views).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 40); },

    async listMessages(clientId) {
      const u = need(); const cid = u.role === 'manager' ? clientId : u.id;
      return clone(db.messages.filter((m) => m.client_id === cid)).sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
    async listAllMessages() { if (!isMgr()) throw new Error('Немає доступу'); return clone(db.messages).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async sendMessage(clientId, text, shipmentId) {
      const u = need(); const cid = u.role === 'manager' ? clientId : u.id;
      const m = { id: uid(), client_id: cid, shipment_id: shipmentId || null, from_role: u.role, text, created_at: now() };
      db.messages.push(m);
      if (u.role === 'manager') notify(cid, 'Нове повідомлення від менеджера', '#/messages');
      save(); return clone(m);
    },

    async listNotifications() { return clone(db.notifications.filter((n) => n.client_id === need().id)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30); },
    async markNotificationsRead() { db.notifications.forEach((n) => { if (n.client_id === need().id) n.read = true; }); save(); },
    resetDemo() { localStorage.removeItem(KEY); sessionStorage.removeItem(SES); db = seed(); save(); }
  };
}
