// Cloudflare Worker: приймає заявку з сайту і надсилає її в Telegram.
// Секрети (Settings → Variables and Secrets): BOT_TOKEN, CHAT_ID
// Змінна (не секрет): ALLOWED_ORIGIN, напр. https://andriy2002-ops.github.io

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST' || origin !== env.ALLOWED_ORIGIN) {
      return new Response('Forbidden', { status: 403, headers: cors });
    }

    let d;
    try { d = await request.json(); } catch { return new Response('Bad request', { status: 400, headers: cors }); }
    const clean = (v, n) => String(v || '').replace(/[<>&]/g, '').trim().slice(0, n);
    const name = clean(d.name, 100), contact = clean(d.contact, 100), message = clean(d.message, 2000), source = clean(d.source, 300);
    if (!name || !contact || !message) return new Response('Missing fields', { status: 422, headers: cors });
    if (d.website) return new Response('OK', { status: 200, headers: cors }); // honeypot для ботів

    const text = '📦 Нова заявка з сайту\n\n' +
      '👤 ' + name + '\n📞 ' + contact + '\n\n' + message + (source ? '\n\n🔎 ' + source : '');
    const r = await fetch('https://api.telegram.org/bot' + env.BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text })
    });
    return new Response(r.ok ? 'OK' : 'Telegram error', { status: r.ok ? 200 : 502, headers: cors });
  }
};
