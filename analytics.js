// Спільний модуль аналітики й реклами: згода (Consent Mode v2), Google tag, Google Ads, Meta, події.
// Без згоди користувача жодні сторонні скрипти не завантажуються. Персональні дані в події не передаємо.
(function () {
  'use strict';

  // Вставте свої ID. Порожнє значення = інструмент вимкнено.
  const TRACKING = {
    GA4_ID: 'G-4FXM8YJRBP',
    GADS_ID: 'AW-18573284006',
    GADS_LEAD_LABEL: 'DVkOCI2Rn7gdEKalt5hF', // основна конверсія «Заявка з сайту» (форма)
    GADS_CALL_LABEL: 'nW_oCM-psr8dEKalt5hF', // необов'язково: другорядна «Клік по телефону»
    GADS_CHAT_LABEL: 'ZyZmCNKpsr8dEKalt5hF', // необов'язково: другорядна «Клік Telegram / WhatsApp / пошта»
    META_PIXEL_ID: ''
  };
  const CONSENT_KEY = 'cookie-consent'; // yes | no (назву не змінювати)
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];

  // ---------- безпечне сховище ----------
  const ls = {
    get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* ignore */ } },
    del: (k) => { try { localStorage.removeItem(k); } catch (_) { /* ignore */ } }
  };
  const ss = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (_) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (_) { /* ignore */ } },
    del: (k) => { try { sessionStorage.removeItem(k); } catch (_) { /* ignore */ } }
  };

  // ---------- службові параметри: ?internal=1|0, ?debug=1 ----------
  const params = new URLSearchParams(location.search);
  if (params.get('internal') === '1') ls.set('ga-internal', '1');
  if (params.get('internal') === '0') ls.del('ga-internal');
  if (params.get('debug') === '1') ss.set('ga-debug', '1');
  const internal = ls.get('ga-internal') === '1';
  const debug = ss.get('ga-debug') === '1';

  // ---------- джерело трафіку (UTM, gclid, fbclid) ----------
  UTM_KEYS.forEach((k) => { if (params.get(k)) ss.set(k, params.get(k)); });
  function sourceInfo() {
    const out = [];
    UTM_KEYS.forEach((k) => { const v = ss.get(k); if (v) out.push(k + '=' + v); });
    return out.join(', ');
  }

  // ---------- Consent Mode v2 (за замовчуванням усе заборонено) ----------
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  const DENIED = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
  const GRANTED = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' };
  window.gtag('consent', 'default', DENIED);

  let on = false;
  const queue = [];

  function loadScript(src) { const s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); }

  function start() {
    if (on) return; on = true;
    window.gtag('consent', 'update', GRANTED);
    const gid = TRACKING.GA4_ID || TRACKING.GADS_ID;
    if (gid) {
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + gid);
      window.gtag('js', new Date());
      if (TRACKING.GA4_ID) {
        const cfg = {};
        if (internal) cfg.traffic_type = 'internal';
        if (debug) cfg.debug_mode = true;
        const ref = ss.get('orig_ref');
        if (ref) { cfg.page_referrer = ref; ss.del('orig_ref'); }
        window.gtag('config', TRACKING.GA4_ID, cfg);
      }
      if (TRACKING.GADS_ID && !internal) window.gtag('config', TRACKING.GADS_ID);
    }
    if (TRACKING.META_PIXEL_ID && !internal) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', TRACKING.META_PIXEL_ID); window.fbq('track', 'PageView');
    }
    while (queue.length) { const q = queue.shift(); window.gtag('event', q[0], q[1]); }
  }

  function clearCookies() {
    const host = location.hostname; const doms = [host, '.' + host]; const p = host.split('.');
    if (p.length > 2) doms.push('.' + p.slice(-2).join('.'));
    document.cookie.split(';').forEach((c) => {
      const n = c.split('=')[0].trim();
      if (!/^(_ga|_gcl|_gac|_gid|_fbp|_fbc)/.test(n)) return;
      [null].concat(doms).forEach((d) => { document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : ''); });
    });
  }

  // ---------- публічні події ----------
  function event(name, p, opts) {
    if (!on) { if (opts && opts.queue) queue.push([name, p || {}]); return; }
    window.gtag('event', name, p || {});
  }
  function adsConversion(label) {
    if (on && !internal && TRACKING.GADS_ID && label) window.gtag('event', 'conversion', { send_to: TRACKING.GADS_ID + '/' + label });
  }
  // Лід: відправлена форма. leadType: 'sent' (Telegram після успіху) | 'handoff' (відкрито месенджер/пошту)
  function lead(method, leadType) {
    event('generate_lead', { method: method, lead_type: leadType || 'sent' });
    adsConversion(TRACKING.GADS_LEAD_LABEL);
    if (on && !internal && window.fbq) window.fbq('track', 'Lead', { channel: method });
  }
  // Клік по контакту (телефон, пошта, Telegram, WhatsApp) — не лід
  function contactClick(method, location_) {
    event('contact_click', { method: method, link_location: location_ || 'page' });
    adsConversion(method === 'call' ? TRACKING.GADS_CALL_LABEL : TRACKING.GADS_CHAT_LABEL);
  }

  // ---------- банер згоди ----------
  function banner() {
    let el = document.getElementById('consent');
    if (el) return el;
    el = document.createElement('div');
    el.className = 'consent'; el.id = 'consent'; el.hidden = true;
    el.innerHTML = '<p>Ми використовуємо cookie для аналітики та реклами. <a href="/privacy.html">Докладніше</a></p>' +
      '<div><button type="button" id="consent-yes" class="btn">Прийняти</button> <button type="button" id="consent-no" class="btn ghost">Відхилити</button></div>';
    document.body.appendChild(el);
    el.querySelector('#consent-yes').addEventListener('click', () => setConsent('yes'));
    el.querySelector('#consent-no').addEventListener('click', () => setConsent('no'));
    return el;
  }
  function setConsent(v) {
    const prev = ls.get(CONSENT_KEY);
    ls.set(CONSENT_KEY, v);
    banner().hidden = true;
    if (v === 'yes') { start(); return; }
    if (on || prev === 'yes') {
      window.gtag('consent', 'update', DENIED);
      clearCookies();
      location.reload();
    }
  }
  function openConsent() { banner().hidden = false; }

  // ---------- делеговані кліки ----------
  document.addEventListener('click', (e) => {
    const cs = e.target.closest('[data-cookie-settings]');
    if (cs) { e.preventDefault(); openConsent(); return; }
    const t = e.target.closest('[data-track]');
    if (t) {
      const sec = t.closest('section[id], header, footer');
      contactClick(t.dataset.track, sec ? (sec.id || sec.tagName.toLowerCase()) : 'page');
    }
  });

  // ---------- старт ----------
  function init() {
    const saved = ls.get(CONSENT_KEY);
    if (saved === 'yes') start();
    else if (saved !== 'no') banner().hidden = false;
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);

  window.Analytics = { event: event, lead: lead, contactClick: contactClick, openConsent: openConsent, sourceInfo: sourceInfo, isInternal: () => internal };
})();
