# Заявки з сайту в Telegram

Токен бота НЕ зберігається в коді сайту. Він живе тільки в секретах Cloudflare Worker.

1. @BotFather → `/newbot` → збережіть токен. Напишіть боту будь-яке повідомлення.
2. Відкрийте `https://api.telegram.org/bot<ТОКЕН>/getUpdates` і знайдіть `"chat":{"id":...}` — це `CHAT_ID`
   (для групи: додайте бота в групу, напишіть там; id починається з мінуса).
3. cloudflare.com → Workers & Pages → Create Worker → вставте код з `worker.js` → Deploy.
4. Settings → Variables and Secrets:
   - `BOT_TOKEN` (Secret), `CHAT_ID` (Secret)
   - `ALLOWED_ORIGIN` = `https://andriy2002-ops.github.io` (адреса сайту без шляху; для власного домену — він)
5. Скопіюйте адресу Worker (`https://....workers.dev`) у `script.js`, константа `TELEGRAM_ENDPOINT`.
   Після цього на сайті з'явиться кнопка «Надіслати зараз».
