// Поточний рік у футері
document.getElementById('year').textContent = new Date().getFullYear();

// Форма-заглушка: формує mailto-лист з кодуванням UTF-8 (кирилиця)
// TODO: замініть email отримувача
const RECIPIENT = 'hello@example.com';

document.getElementById('contact-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  const subject = encodeURIComponent('Повідомлення з сайту від ' + f.elements.name.value);
  const body = encodeURIComponent(
    f.elements.message.value + "\n\nІм'я: " + f.elements.name.value + '\nКонтакт: ' + f.elements.contact.value
  );
  window.location.href = 'mailto:' + RECIPIENT + '?subject=' + subject + '&body=' + body;
});
