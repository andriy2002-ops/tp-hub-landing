// Cloudflare Worker: приймає заявку з сайту і надсилає її в Telegram.
// Секрети (Settings → Variables and Secrets): BOT_TOKEN, CHAT_ID
// Змінна (не секрет): ALLOWED_ORIGIN, напр. https://andriy2002-ops.github.io

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    // ALLOWED_ORIGIN: один або кілька origin через кому
    const allowed = (env.ALLOWED_ORIGIN || '').split(',').map((x) => x.trim()).filter(Boolean).includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': allowed ? origin : '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST' || !allowed) {
      return new Response('Forbidden', { status: 403, headers: cors });
    }
    if (new URL(request.url).pathname === '/analyze') return analyze(request, env, cors);

    let d;
    try { d = await request.json(); } catch { return new Response('Bad request', { status: 400, headers: cors }); }
    const clean = (v, n) => String(v || '').replace(/[<>&]/g, '').trim().slice(0, n);
    const name = clean(d.name, 100), contact = clean(d.contact, 100), message = clean(d.message, 2000), source = clean(d.source, 300);
    if (!name || !contact || !message) return new Response('Missing fields', { status: 422, headers: cors });
    if (d.website) return new Response('OK', { status: 200, headers: cors }); // honeypot для ботів

    const head = d.kind === 'registration' ? '🆕 Новий клієнт у кабінеті' : '📦 Нова заявка з сайту';
    const text = head + '\n\n' +
      '👤 ' + name + '\n📞 ' + contact + '\n\n' + message + (source ? '\n\n🔎 ' + source : '');
    const r = await fetch('https://api.telegram.org/bot' + env.BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text })
    });
    return new Response(r.ok ? 'OK' : 'Telegram error', { status: r.ok ? 200 : 502, headers: cors });
  }
};

// ===== ШІ-розбір документів справи клієнта (лише для менеджера) =====
const SB = 'https://tqpptgfgzjzxxlphtiic.supabase.co';
const SB_KEY = 'sb_publishable_90VcU8-Vivr1JbiJgQpEFg_D7R4q-te';
const CATS = 'extract (витяг з ЄДР), charter (статут/установчі), tax (довідка про податки/ПДВ), license (ліцензії), power (довіреність/повноваження), dossier (досьє), court (судові рішення), debt (борги/виконавчі провадження), sanctions (санкції/ризики), property (реєстри майна), media (публікації), other';
const FIELDS = 'company_name (повна назва або ПІБ ФОП), edrpou (код ЄДРПОУ або ІПН), contact_name (ПІБ керівника/підписанта), position (посада підписанта), basis (підстава: статут/довіреність), phone, address (юридична адреса), tax (податковий статус, напр. платник ПДВ/єдиний податок), iban, bank';
const CHECKS = 'edr (дані ЄДР звірено), head (керівник/підписант підтверджені), owners (бенефіціари з’ясовано), sanctions (санкції перевірено), courts (суди/борги перевірено), tax (податковий статус підтверджено), address (адресу і вид діяльності підтверджено), docs (статут/повноваження отримано)';

function jres(obj, status, cors) { return new Response(JSON.stringify(obj), { status: status || 200, headers: { ...cors, 'Content-Type': 'application/json' } }); }

async function analyze(request, env, cors) {
  if (!env.GEMINI_API_KEY && !env.ANTHROPIC_API_KEY) return jres({ error: 'ШІ не налаштовано (немає GEMINI_API_KEY)' }, 503, cors);
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return jres({ error: 'Потрібен вхід' }, 401, cors);
  const hdr = { apikey: SB_KEY, Authorization: 'Bearer ' + token };
  const ur = await fetch(SB + '/auth/v1/user', { headers: hdr });
  if (!ur.ok) return jres({ error: 'Сесію не підтверджено' }, 401, cors);
  const user = await ur.json();
  const pr = await fetch(SB + '/rest/v1/profiles?select=role&id=eq.' + encodeURIComponent(user.id), { headers: hdr });
  const prof = pr.ok ? await pr.json() : [];
  if (!prof[0] || prof[0].role !== 'manager') return jres({ error: 'Лише для менеджера' }, 403, cors);

  let d; try { d = await request.json(); } catch { return jres({ error: 'Bad request' }, 400, cors); }
  const mime = String(d.mime || ''); const b64 = String(d.data || '');
  if (!b64 || b64.length > 14000000) return jres({ error: 'Файл порожній або завеликий для ШІ (до 10 МБ)' }, 413, cors);
  let block;
  if (mime === 'application/pdf') block = { type: 'document', source: { type: 'base64', media_type: mime, data: b64 } };
  else if (/^image\/(jpeg|png|webp)$/.test(mime)) block = { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } };
  else if (mime === 'text/plain') { let t = ''; try { t = decodeURIComponent(escape(atob(b64))); } catch { t = atob(b64); } block = { type: 'text', text: 'ТЕКСТ ДОКУМЕНТА:\n' + t.slice(0, 60000) }; }
  else return jres({ error: 'ШІ читає PDF, фото та TXT. Word/Excel додано без розбору' }, 415, cors);

  const known = d.client || {};
  const prompt = 'Ти помічник менеджера логістичного хабу в Україні. Проаналізуй документ з відкритих джерел про контрагента.\n' +
    'Відомо про клієнта: назва «' + clean2(known.company_name) + '», код «' + clean2(known.edrpou) + '».\n' +
    'Поверни ЛИШЕ JSON без пояснень і без markdown:\n' +
    '{"category": одне з [' + CATS + '], "title": "коротка назва документа з датою, до 100 символів", "summary": "2-3 речення українською: що це, ключові факти, ризики", ' +
    '"matches_client": true/false/null (чи документ стосується саме цього клієнта; null якщо не можна визначити), ' +
    '"fields": {лише ті з [' + FIELDS + '], які ТОЧНО є в документі про самого клієнта}, ' +
    '"checks": [ключі з [' + CHECKS + '], які цей документ підтверджує], "risk": "low"|"medium"|"high"|null (лише якщо документ містить явні ознаки: борги, санкції, судові справи, ліквідація), "flags": ["короткі попередження, якщо є"]}\n' +
    'Не вигадуй. Якщо даних немає, не додавай поле.';
  let txt = '';
  if (env.GEMINI_API_KEY) {
    const part = block.type === 'text' ? { text: block.text } : { inline_data: { mime_type: block.source.media_type, data: block.source.data } };
    const gr = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + (env.AI_MODEL || 'gemini-2.5-flash') + ':generateContent', {
      method: 'POST',
      headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [part, { text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 1500 } })
    });
    if (!gr.ok) return jres({ error: 'ШІ недоступний (' + gr.status + ')' }, 502, cors);
    const go = await gr.json();
    txt = (((go.candidates || [])[0] || {}).content || { parts: [] }).parts.map((x) => x.text || '').join('');
  } else {
    const ar = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.AI_MODEL || 'claude-haiku-5-5', max_tokens: 1200, messages: [{ role: 'user', content: [block, { type: 'text', text: prompt }] }] })
    });
    if (!ar.ok) return jres({ error: 'ШІ недоступний (' + ar.status + ')' }, 502, cors);
    const out = await ar.json();
    txt = ((out.content || []).find((c) => c.type === 'text') || {}).text || '';
  }
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) return jres({ error: 'ШІ не повернув результат' }, 502, cors);
  try { return jres(JSON.parse(m[0]), 200, cors); } catch { return jres({ error: 'ШІ повернув некоректний результат' }, 502, cors); }
}
function clean2(v) { return String(v || '').replace(/["«»<>]/g, '').slice(0, 120); }
