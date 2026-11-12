// Спільні засоби для файлів справи клієнта: перевірка, таблиця, перегляд
import { ctx, esc, fmtDate, modal, toast, icon } from './ui.js';
import { FILE_CATEGORIES } from './data.js';

export const MAX_SIZE = 15 * 1024 * 1024;
export const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt';
const EXT = /\.(pdf|jpe?g|png|webp|docx?|xlsx?|txt)$/i;

export function checkFile(f) {
  if (!f) return 'Оберіть файл';
  if (f.size > MAX_SIZE) return 'Файл завеликий (максимум 15 МБ)';
  if (!EXT.test(f.name)) return 'Дозволені формати: PDF, JPG, PNG, WEBP, DOC(X), XLS(X), TXT';
  return '';
}
export const fmtSize = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round((n || 0) / 1024)) + ' КБ');

// Таблиця файлів. opts.canDelete — показувати кнопку видалення
export function filesTable(files, opts) {
  opts = opts || {};
  if (!files.length) return '<div class="empty-state">' + esc(opts.emptyText || 'Файлів поки немає') + '</div>';
  return '<div class="tablewrap"><table class="t"><thead><tr><th>Документ</th><th>Тип</th><th>Додано</th><th></th></tr></thead><tbody>' +
    files.map((f) => '<tr><td><b>' + esc(f.title || f.file_name) + '</b><small class="blk">' + esc(f.file_name || '') + ' · ' + fmtSize(f.size) + '</small>' +
      (f.note ? '<small class="blk">' + esc(f.note) + '</small>' : '') +
      (f.source_url && /^https?:\/\//i.test(f.source_url) ? '<small class="blk">Джерело: <a href="' + esc(f.source_url) + '" target="_blank" rel="noopener noreferrer">' + esc(f.source_url.replace(/^https?:\/\//i, '').slice(0, 48)) + '</a></small>' : '') + '</td>' +
      '<td>' + esc(FILE_CATEGORIES[f.category] || 'Інше') + '</td><td>' + fmtDate(f.created_at) + '</td>' +
      '<td class="nowrap"><button class="btn small ghost-dark2" data-view="' + esc(f.id) + '" type="button">' + icon('eye') + ' Переглянути</button>' +
      (opts.canDelete ? ' <button class="btn small ghost-dark2 danger" data-del="' + esc(f.id) + '" type="button">Видалити</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>';
}

// Підключає кнопки «Переглянути» / «Видалити» усередині root
export function bindFiles(root, files, onChange) {
  root.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => previewFile(files.find((f) => f.id === b.dataset.view))));
  root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const f = files.find((x) => x.id === b.dataset.del);
    if (!f || !window.confirm('Видалити «' + (f.title || f.file_name) + '»? Цю дію не можна скасувати.')) return;
    try { await ctx.api.deleteClientFile(f); toast('Файл видалено'); if (onChange) onChange(); } catch (e) { toast(e.message, 'err'); }
  }));
}

export async function previewFile(f) {
  if (!f) return;
  const m = modal(f.title || f.file_name || 'Файл', '<div class="filepv"><p class="muted">Завантаження…</p></div>', { wide: true });
  const box = m.el.querySelector('.filepv');
  try {
    const [url, dl] = await Promise.all([ctx.api.getFileUrl(f), ctx.api.getFileUrl(f, true)]);
    const mime = f.mime || '';
    const isImg = /^image\//.test(mime) || /\.(jpe?g|png|webp)$/i.test(f.file_name || '');
    const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(f.file_name || '');
    box.innerHTML = '<p class="muted small">' + esc(FILE_CATEGORIES[f.category] || '') + ' · ' + esc(f.file_name || '') + ' · ' + fmtSize(f.size) + ' · ' + fmtDate(f.created_at, true) + '</p>' +
      (f.note ? '<p>' + esc(f.note) + '</p>' : '') +
      (isImg ? '<img class="pv-img" alt="' + esc(f.title || '') + '">' : isPdf ? '<iframe class="pv-pdf" title="' + esc(f.title || 'Документ') + '"></iframe>' : '<div class="notice small">Перегляд цього формату в браузері недоступний. Завантажте файл.</div>') +
      '<p><a class="btn small" id="pv-dl" rel="noopener">Завантажити файл</a></p>';
    const img = box.querySelector('.pv-img'); if (img) img.src = url;
    const fr = box.querySelector('.pv-pdf'); if (fr) fr.src = url;
    box.querySelector('#pv-dl').href = dl;
  } catch (e) { box.innerHTML = '<div class="notice err"><p>' + esc(e.message) + '</p></div>'; }
}
