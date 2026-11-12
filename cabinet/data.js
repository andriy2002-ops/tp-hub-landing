// Статуси та довідники кабінету
export const FLOW = ['requested', 'confirmed', 'arriving', 'received', 'unloading', 'accepted', 'stored', 'processing', 'ready', 'dispatched', 'delivered'];

export const STATUS = {
  requested:  { label: 'Заявка створена',        tone: 'gray',  hint: 'Очікує підтвердження менеджера' },
  confirmed:  { label: 'Підтверджено',           tone: 'blue',  hint: 'Дату та умови узгоджено' },
  arriving:   { label: 'Прямує до хабу',         tone: 'blue',  hint: 'Вантаж у дорозі до Тернополя' },
  received:   { label: 'Прибув на склад',        tone: 'blue',  hint: 'Транспорт на території хабу' },
  unloading:  { label: 'Розвантаження',          tone: 'amber', hint: 'Йде розвантаження' },
  accepted:   { label: 'Прийнято, перевірено',   tone: 'green', hint: 'Кількість місць і стан перевірено' },
  stored:     { label: 'На зберіганні',          tone: 'green', hint: 'Вантаж розміщено на стелажах' },
  processing: { label: 'Сортування / пакування', tone: 'amber', hint: 'Сортування, пакування, маркування' },
  ready:      { label: 'Готово до відправлення', tone: 'green', hint: 'Можна забирати або відправляти' },
  dispatched: { label: 'Передано в доставку',    tone: 'blue',  hint: 'Вантаж їде до одержувача' },
  delivered:  { label: 'Доставлено',             tone: 'green', hint: 'Вантаж вручено одержувачу' },
  issue:      { label: 'Є зауваження',           tone: 'red',   hint: 'Потрібна ваша увага' },
  cancelled:  { label: 'Скасовано',              tone: 'gray',  hint: 'Заявку скасовано' }
};
export const CLOSED = ['delivered', 'cancelled'];
export const STORED_STATES = ['accepted', 'stored', 'processing', 'ready'];

export const CONTRACT_STATUS = {
  draft:  { label: 'Чернетка',    tone: 'gray' },
  sent:   { label: 'На підписанні', tone: 'amber' },
  signed: { label: 'Підписано',   tone: 'green' }
};
export const ACCOUNT_STATUS = {
  pending: { label: 'Очікує підтвердження', tone: 'amber' },
  active:  { label: 'Активний',             tone: 'green' },
  blocked: { label: 'Заблокований',         tone: 'red' }
};
export const ARRIVAL_TYPES = {
  c40: 'Контейнер 40 фт', c20: 'Контейнер 20 фт', truck: 'Фура 80–120 м³', van: 'Бус / легкове авто', other: 'Інше'
};
export const DOC_KINDS = { act: 'Акт', invoice: 'Рахунок', photo: 'Фото приймання', contract: 'Договір', other: 'Інше' };
export const CAMERA_KINDS = { demo: 'Демо (імітація)', hls: 'HLS (.m3u8)', iframe: 'Вбудована сторінка (iframe)', image: 'Знімок (оновлюється)' };

// ===== Справа клієнта =====
export const FILE_CATEGORIES = {
  extract: 'Витяг з ЄДР', charter: 'Статут / установчі документи', tax: 'Довідка про податки / ПДВ', license: 'Ліцензії, дозволи',
  power: 'Довіреність / повноваження', dossier: 'Досьє / перевірка контрагента', court: 'Судові рішення', debt: 'Борги, виконавчі провадження',
  sanctions: 'Санкції та ризики', property: 'Реєстри майна / нерухомості', media: 'Публікації, відгуки', other: 'Інше'
};
export const CLIENT_CATEGORIES = ['charter', 'extract', 'tax', 'license', 'power', 'other'];
export const CASE_CHECKS = {
  edr: 'Дані в ЄДР звірено', head: 'Керівник і підписант підтверджені', owners: 'Кінцевих бенефіціарів з’ясовано',
  sanctions: 'Санкційні списки перевірено', courts: 'Судові справи та борги перевірено', tax: 'Податковий статус / ПДВ підтверджено',
  address: 'Адресу та вид діяльності підтверджено', docs: 'Статут і повноваження отримано'
};
export const RISK = {
  unknown: { label: 'Не оцінено', tone: 'gray' }, low: { label: 'Низький ризик', tone: 'green' },
  medium: { label: 'Середній ризик', tone: 'amber' }, high: { label: 'Високий ризик', tone: 'red' }
};
export const PROFILE_FIELDS = [
  ['company_name', 'Назва / ПІБ'], ['edrpou', 'ЄДРПОУ / ІПН'], ['contact_name', 'Контактна особа'], ['position', 'Посада підписанта'],
  ['basis', 'Підстава (статут тощо)'], ['phone', 'Телефон'], ['address', 'Адреса'], ['tax', 'Податковий статус'], ['iban', 'IBAN'], ['bank', 'Банк']
];
