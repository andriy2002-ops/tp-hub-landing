// ШІ-розбір документа (менеджер). Файл читається в браузері і йде у Worker → Claude.
export const AI_TYPES = /^(application\/pdf|image\/(jpeg|png|webp)|text\/plain)$/;
export function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1] || '');
    r.onerror = () => rej(new Error('Не вдалося прочитати файл'));
    r.readAsDataURL(file);
  });
}
export async function analyzeViaWorker(endpoint, token, file, client) {
  if (!AI_TYPES.test(file.type || '')) return null;
  if (file.size > 10 * 1024 * 1024) throw new Error('Для ШІ файл має бути до 10 МБ');
  const r = await fetch(endpoint.replace(/\/$/, '') + '/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ mime: file.type, data: await fileToBase64(file), client: { company_name: client.company_name || '', edrpou: client.edrpou || '' } })
  });
  let j = {}; try { j = await r.json(); } catch (e) { /* ignore */ }
  if (!r.ok) throw new Error(j.error || 'ШІ недоступний (' + r.status + ')');
  return j;
}
