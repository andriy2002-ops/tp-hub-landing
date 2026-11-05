// Налаштування кабінету. Поки поля порожні, кабінет працює в демо-режимі (лише за адресою cabinet.html?demo=1).
// Після створення проєкту Supabase (див. cabinet/README.md) впишіть сюди адресу й ПУБЛІЧНИЙ anon-ключ.
// Секретний service_role ключ сюди вписувати НЕ можна.
export const CABINET_CONFIG = {
  supabaseUrl: 'https://tqpptgfgzjzxxlphtiic.supabase.co',      // напр. https://abcdxyz.supabase.co
  supabaseAnonKey: 'sb_publishable_90VcU8-Vivr1JbiJgQpEFg_D7R4q-te',  // публічний (publishable) ключ
  // Адреса Cloudflare Worker для сповіщень менеджеру в Telegram (та сама, що для форми)
  notifyEndpoint: 'https://tp-hub-leads.andriy2002.workers.dev'
};
