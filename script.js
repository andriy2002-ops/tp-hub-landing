// Поточний рік у футері
document.getElementById('year').textContent = new Date().getFullYear();

// Куди надсилати запити
const PHONE = '380673524745';
const EMAIL = 'ternopilhubcom@gmail.com';
// Адреса Cloudflare Worker (див. telegram-worker/README.md). Порожньо = кнопка «Надіслати зараз» прихована.
const TELEGRAM_ENDPOINT = 'https://tp-hub-leads.andriy2002.workers.dev';

// Аналітика, згода на cookie, UTM і події — у analytics.js (window.Analytics)
const sourceInfo = () => (window.Analytics ? Analytics.sourceInfo() : '');

const form = document.getElementById('contact-form');
const status = document.getElementById('form-status');
if (TELEGRAM_ENDPOINT) {
  form.querySelector('[data-channel=telegram]').hidden = false;
  const alt = form.querySelector('.send-alt');
  if (alt) alt.hidden = false;
}

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
  if (channel !== 'telegram' && window.Analytics) Analytics.lead(channel, 'handoff'); // Telegram рахуємо після успішної відправки

  if (channel === 'telegram') {
    btn.disabled = true; status.textContent = 'Надсилаємо...';
    try {
      const f = form.elements;
      const res = await fetch(TELEGRAM_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.name.value, contact: f.contact.value, message: f.message.value, source: sourceInfo(), website: f.website.value })
      });
      if (!res.ok) throw new Error(res.status);
      if (window.Analytics) Analytics.lead('telegram', 'sent');
      status.textContent = 'Дякуємо! Запит надіслано, ми зв\'яжемося з вами найближчим часом.';
      form.reset();
    } catch (_) {
      status.textContent = 'Не вдалося надіслати. Скористайтеся WhatsApp, Viber або Email, або зателефонуйте: +380 67 352 47 45.';
    }
    btn.disabled = false;
  } else if (channel === 'whatsapp') {
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

// Меню на телефоні
const burger = document.getElementById('burger');
const menu = document.getElementById('menu');
burger.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
});
menu.addEventListener('click', (e) => {
  if (e.target.closest('a')) { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
});

// Плавна поява блоків
if ('IntersectionObserver' in window) {
  document.documentElement.classList.add('js');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.08 });
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
}
