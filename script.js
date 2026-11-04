// Поточний рік у футері
document.getElementById('year').textContent = new Date().getFullYear();

// Куди надсилати запити
const PHONE = '380673524745';
const EMAIL = 'brokgroup1@gmail.com';

const form = document.getElementById('contact-form');
const status = document.getElementById('form-status');

function buildText() {
  const f = form.elements;
  return 'Запит із сайту\nІм\'я: ' + f.name.value.trim() +
    '\nКонтакт: ' + f.contact.value.trim() +
    '\n\n' + f.message.value.trim();
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
