// Реальний бекенд на Supabase (Auth + Postgres + Row Level Security). Схема: cabinet/supabase.sql
const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';

function loadScript(src) {
  return new Promise((res, rej) => {
    if (window.supabase) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('Не вдалося завантажити Supabase'));
    document.head.appendChild(s);
  });
}
const friendly = (m) => {
  const t = String(m || '');
  if (/Invalid login/i.test(t)) return 'Невірна пошта або пароль';
  if (/already registered|already been registered/i.test(t)) return 'Користувач із такою поштою вже існує';
  if (/Email not confirmed/i.test(t)) return 'Підтвердіть пошту за посиланням у листі';
  if (/row-level security|permission denied/i.test(t)) return 'Немає доступу до цієї дії';
  if (/Password should be/i.test(t)) return 'Пароль занадто простий (мінімум 8 символів)';
  return t;
};

export async function createSupa(cfg) {
  await loadScript(CDN);
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const must = (r) => { if (r.error) throw new Error(friendly(r.error.message)); return r.data; };
  const uidNow = async () => { const { data } = await sb.auth.getUser(); return data.user && data.user.id; };
  const profileCache = {};
  const myRole = async () => {
    const id = await uidNow();
    if (!profileCache[id]) profileCache[id] = must(await sb.from('profiles').select('*').eq('id', id).single());
    return profileCache[id].role;
  };
  const notify = async (client_id, text, link) => { await sb.from('notifications').insert({ client_id, text, link }); };
  const LABEL = {}; // підписи статусів підставляє UI через comment

  return {
    mode: 'supabase',
    async signUp(d) {
      const { email, password, ...meta } = d;
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: meta, emailRedirectTo: location.origin + location.pathname } });
      if (error) throw new Error(friendly(error.message));
      return { needsConfirm: !data.session };
    },
    async signIn(email, password) { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw new Error(friendly(error.message)); },
    async signOut() { await sb.auth.signOut(); Object.keys(profileCache).forEach((k) => delete profileCache[k]); },
    async resetPassword(email) { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); if (error) throw new Error(friendly(error.message)); },
    async changePassword(pw) { const { error } = await sb.auth.updateUser({ password: pw }); if (error) throw new Error(friendly(error.message)); },
    async getSession() { const { data } = await sb.auth.getSession(); return data.session ? { id: data.session.user.id } : null; },
    async getProfile() { const id = await uidNow(); delete profileCache[id]; return must(await sb.from('profiles').select('*').eq('id', id).single()); },
    async updateProfile(patch) {
      const id = await uidNow();
      const allowed = ['company_name', 'edrpou', 'contact_name', 'position', 'basis', 'phone', 'address', 'tax', 'iban', 'bank', 'prefs', 'type'];
      const p = {}; allowed.forEach((k) => { if (k in patch) p[k] = patch[k]; });
      const r = must(await sb.from('profiles').update(p).eq('id', id).select().single()); delete profileCache[id]; return r;
    },
    async listProfiles() { return must(await sb.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false })); },
    async setProfileStatus(id, status) {
      must(await sb.from('profiles').update({ status }).eq('id', id));
      if (status === 'active') await notify(id, 'Ваш обліковий запис активовано. Доступні заявки, документи та камери.', '#/dashboard');
    },

    async listShipments() { return must(await sb.from('shipments').select('*').order('created_at', { ascending: false })); },
    async getShipment(id) { return must(await sb.from('shipments').select('*').eq('id', id).single()); },
    async createShipment(d) {
      const uid = await uidNow(); const role = await myRole();
      const row = { ...d, client_id: role === 'manager' ? d.client_id : uid };
      const s = must(await sb.from('shipments').insert(row).select().single());
      must(await sb.from('shipment_events').insert({ shipment_id: s.id, status: 'requested', comment: 'Заявку створено', by_role: role }));
      return s;
    },
    async updateShipment(id, patch, status, comment) {
      const cur = must(await sb.from('shipments').select('*').eq('id', id).single());
      const upd = { ...patch, updated_at: new Date().toISOString() };
      if (status) upd.status = status;
      must(await sb.from('shipments').update(upd).eq('id', id));
      if ((status && status !== cur.status) || comment) {
        must(await sb.from('shipment_events').insert({ shipment_id: id, status: status || cur.status, comment: comment || '', by_role: 'manager' }));
        await notify(cur.client_id, cur.number + ': ' + (comment || 'змінено статус'), '#/shipments');
      }
    },
    async cancelShipment(id) {
      must(await sb.from('shipments').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id));
      must(await sb.from('shipment_events').insert({ shipment_id: id, status: 'cancelled', comment: 'Скасовано клієнтом', by_role: 'client' }));
    },
    async listEvents(shipmentId) {
      let q = sb.from('shipment_events').select('*').order('created_at', { ascending: false });
      if (shipmentId) q = q.eq('shipment_id', shipmentId); else q = q.limit(100);
      return must(await q);
    },

    async listContracts() { return must(await sb.from('contracts').select('*').order('created_at', { ascending: false })); },
    async saveContract(c) {
      const uid = await uidNow();
      if (c.id) return must(await sb.from('contracts').update({ data: c.data, calc: c.calc, number: c.number, updated_at: new Date().toISOString() }).eq('id', c.id).select().single());
      return must(await sb.from('contracts').insert({ client_id: uid, number: c.number, status: c.status || 'draft', data: c.data, calc: c.calc }).select().single());
    },
    async setContractStatus(id, status) {
      const k = must(await sb.from('contracts').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single());
      if (status === 'signed') await notify(k.client_id, 'Договір ' + k.number + ' підписано', '#/contracts');
    },

    async listDocuments() { return must(await sb.from('documents').select('*').order('created_at', { ascending: false })); },
    async addDocument(d) {
      const r = must(await sb.from('documents').insert(d).select().single());
      await notify(d.client_id, 'Новий документ: ' + d.name, '#/documents'); return r;
    },

    async listCameras() { return must(await sb.from('cameras').select('*').order('name')); },
    async saveCamera(c) { const { id, ...rest } = c; if (id) must(await sb.from('cameras').update(rest).eq('id', id)); else must(await sb.from('cameras').insert(rest)); },
    async getCameraAccess(clientId) { return must(await sb.from('camera_access').select('camera_id').eq('client_id', clientId)).map((r) => r.camera_id); },
    async setCameraAccess(clientId, ids) {
      must(await sb.from('camera_access').delete().eq('client_id', clientId));
      if (ids.length) must(await sb.from('camera_access').insert(ids.map((camera_id) => ({ camera_id, client_id: clientId }))));
      await notify(clientId, 'Оновлено доступ до відеоспостереження', '#/cameras');
    },
    async logCameraView(cameraId) { const p = await this.getProfile(); await sb.from('camera_views').insert({ camera_id: cameraId, client_id: p.id, who: p.company_name || p.email }); },
    async listCameraViews() { return must(await sb.from('camera_views').select('*').order('created_at', { ascending: false }).limit(40)); },

    async listMessages(clientId) {
      const role = await myRole(); const cid = role === 'manager' ? clientId : await uidNow();
      return must(await sb.from('messages').select('*').eq('client_id', cid).order('created_at'));
    },
    async listAllMessages() { return must(await sb.from('messages').select('*').order('created_at', { ascending: false }).limit(300)); },
    async sendMessage(clientId, text, shipmentId) {
      const role = await myRole(); const cid = role === 'manager' ? clientId : await uidNow();
      const m = must(await sb.from('messages').insert({ client_id: cid, shipment_id: shipmentId || null, from_role: role, text }).select().single());
      if (role === 'manager') await notify(cid, 'Нове повідомлення від менеджера', '#/messages');
      return m;
    },

    async listNotifications() { const id = await uidNow(); return must(await sb.from('notifications').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(30)); },
    async markNotificationsRead() { const id = await uidNow(); await sb.from('notifications').update({ read: true }).eq('client_id', id).eq('read', false); }
  };
}
