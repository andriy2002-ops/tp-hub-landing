import { STATUS, ACCOUNT_STATUS, CONTRACT_STATUS } from './data.js';

export const ctx = { api: null, profile: null, demo: false, cleanup: null, go: (h) => { location.hash = h; } };

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => Math.round(n || 0).toLocaleString('uk-UA').replace(/ /g, ' ') + ' грн';
export function fmtDate(iso, withTime) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return esc(iso);
  const o = { day: '2-digit', month: '2-digit', year: 'numeric' };
  if (withTime) { o.hour = '2-digit'; o.minute = '2-digit'; }
  return d.toLocaleString('uk-UA', o);
}
export const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'щойно';
  if (m < 60) return m + ' хв тому';
  if (m < 1440) return Math.round(m / 60) + ' год тому';
  return Math.round(m / 1440) + ' дн тому';
};
export const badge = (id) => { const s = STATUS[id] || { label: id, tone: 'gray' }; return '<span class="badge ' + s.tone + '">' + esc(s.label) + '</span>'; };
export const accBadge = (id) => { const s = ACCOUNT_STATUS[id] || { label: id, tone: 'gray' }; return '<span class="badge ' + s.tone + '">' + esc(s.label) + '</span>'; };
export const conBadge = (id) => { const s = CONTRACT_STATUS[id] || { label: id, tone: 'gray' }; return '<span class="badge ' + s.tone + '">' + esc(s.label) + '</span>'; };

const ICONS = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4m0 10V11m9-4l-9 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calc: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h2m4 0h2M8 15h2m4 0h2M8 19h2m4 0h2"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  cam: '<path d="M23 7l-7 5 7 5zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>'
};
export const icon = (n) => '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';

export function toast(msg, type) {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3700);
}

export function modal(title, bodyHtml, opts) {
  opts = opts || {};
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = '<div class="modal ' + (opts.wide ? 'wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><header><h2>' + esc(title) + '</h2><button class="x" type="button" aria-label="Закрити">×</button></header><div class="mbody">' + bodyHtml + '</div></div>';
  document.body.appendChild(ov);
  document.body.classList.add('noscroll');
  const close = () => { if (opts.onClose) opts.onClose(); ov.remove(); document.body.classList.remove('noscroll'); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  ov.querySelector('.x').addEventListener('click', close);
  return { el: ov.querySelector('.mbody'), root: ov, close };
}

// Проста перевірка поля форми з показом помилки
export function formData(form) { return Object.fromEntries(new FormData(form)); }
export const empty = (text) => '<div class="empty-state">' + esc(text) + '</div>';

export async function notifyManager(cfgEndpoint, title, text) {
  if (ctx.demo || !cfgEndpoint) return;
  try {
    await fetch(cfgEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: title, contact: ctx.profile ? (ctx.profile.phone || ctx.profile.email || '-') : '-', message: text, source: 'cabinet', website: '' }) });
  } catch (_) { /* сповіщення необов'язкове */ }
}
