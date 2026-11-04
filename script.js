// Поточний рік у футері
document.getElementById('year').textContent = new Date().getFullYear();

// Куди надсилати запити
const PHONE = '380673524745';
const EMAIL = 'brokgroup1@gmail.com';

// ===== Реклама й аналітика =====
// Вставте свої ID. Порожнє значення = інструмент вимкнено.
const TRACKING = {
  GA4_ID: '',          // Google Analytics 4, напр. 'G-XXXXXXXXXX'
  GADS_ID: '',         // Google Ads, напр. 'AW-123456789'
  GADS_LEAD_LABEL: '', // мітка конверсії, напр. 'AbCdEf'
  META_PIXEL_ID: ''    // Meta (Facebook/Instagram) Pixel
};

// Джерело трафіку (UTM, gclid, fbclid) запам'ятовуємо і додаємо до запиту
const params = new URLSearchParams(location.search);
['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach((k) => {
  if (params.get(k)) { try { sessionStorage.setItem(k, params.get(k)); } catch (_) {} }
});
function sourceInfo() {
  const out = [];
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach((k) => {
    let v = null; try { v = sessionStorage.getItem(k); } catch (_) {}
    if (v) out.push(k + '=' + v);
  });
  return out.join(', ');
}

let trackingOn = false;
function loadScript(src) { const s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); }
function startTracking() {
  if (trackingOn) return; trackingOn = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  const gid = TRACKING.GA4_ID || TRACKING.GADS_ID;
  if (gid) {
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + gid);
    gtag('js', new Date());
    if (TRACKING.GA4_ID) gtag('config', TRACKING.GA4_ID);
    if (TRACKING.GADS_ID) gtag('config', TRACKING.GADS_ID);
  }
  if (TRACKING.META_PIXEL_ID) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', TRACKING.META_PIXEL_ID); fbq('track', 'PageView');
  }
}
// Подія-ліда: канал = call | email | whatsapp | viber | form
function trackLead(channel) {
  if (!trackingOn) return;
  if (window.gtag) {
    gtag('event', 'generate_lead', { method: channel });
    if (TRACKING.GADS_ID && TRACKING.GADS_LEAD_LABEL) gtag('event', 'conversion', { send_to: TRACKING.GADS_ID + '/' + TRACKING.GADS_LEAD_LABEL });
  }
  if (window.fbq) fbq('track', 'Lead', { channel: channel });
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-track]');
  if (t) trackLead(t.dataset.track);
});

// Згода на cookie
const consent = document.getElementById('consent');
let saved = null; try { saved = localStorage.getItem('cookie-consent'); } catch (_) {}
if (saved === 'yes') startTracking();
else if (saved !== 'no') consent.hidden = false;
function setConsent(v) { try { localStorage.setItem('cookie-consent', v); } catch (_) {} consent.hidden = true; if (v === 'yes') startTracking(); }
document.getElementById('consent-yes').addEventListener('click', () => setConsent('yes'));
document.getElementById('consent-no').addEventListener('click', () => setConsent('no'));

const form = document.getElementById('contact-form');
const status = document.getElementById('form-status');

function buildText() {
  const f = form.elements;
  return 'Запит із сайту\nІм\'я: ' + f.name.value.trim() +
    '\nКонтакт: ' + f.contact.value.trim() +
    '\n\n' + f.message.value.trim() +
    (sourceInfo() ? '\n\nДжерело: ' + sourceInfo() : '');
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (_) { return false; }
}

form.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-channel]');
  if (!btn) return;
  if (!form.reportValidity()) return;

  const text = buildText();
  const channel = btn.dataset.channel;
  trackLead(channel);

  if (channel === 'whatsapp') {
    window.open('https://wa.me/' + PHONE + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
    status.textContent = 'Відкриваємо WhatsApp. Натисніть «Надіслати» в чаті.';
  } else if (channel === 'viber') {
    // Viber не підтримує попередньо заповнений текст, тому копіюємо запит у буфер
    const copied = await copyText(text);
    window.location.href = 'viber://chat?number=%2B' + PHONE;
    status.textContent = copied
      ? 'Відкриваємо Viber. Текст запиту скопійовано: вставте його в чат (Ctrl+V).'
      : 'Відкриваємо Viber. Опишіть вантаж у чаті.';
  } else {
    const subject = encodeURIComponent('Запит із сайту від ' + form.elements.name.value.trim());
    window.location.href = 'mailto:' + EMAIL + '?subject=' + subject + '&body=' + encodeURIComponent(text);
    status.textContent = 'Відкриваємо поштовий застосунок.';
  }
});
