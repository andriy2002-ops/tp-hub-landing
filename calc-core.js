(function () {
  const P = window.PRICES;
  const fmt = (n) => Math.round(n).toLocaleString('uk-UA').replace(/\u00a0/g, ' ') + ' грн';
  const st = P.storage;

  // Розрахунок за введеними даними (чиста функція)
  function compute(v) {
    const lines = [];
    P.items.forEach((it) => {
      const q = Math.max(0, parseFloat(v.items && v.items[it.id]) || 0);
      if (q > 0) lines.push({ name: it.name, qty: q, unit: it.unit, price: it.price, sum: q * it.price });
    });
    const pallets = Math.max(0, parseFloat(v.pallets) || 0);
    const days = Math.max(0, parseFloat(v.days) || 0);
    if (pallets > 0 && days > 0) {
      const billable = Math.max(0, days - P.freeStorageDays);
      const per = billable === 0 ? 0 : Math.min(billable * st.perPalletDay, Math.ceil(billable / 30) * st.perPalletMonth);
      lines.push({ name: 'Відповідальне зберігання (' + days + ' діб, з них ' + Math.min(days, P.freeStorageDays) + ' безкоштовно)', qty: pallets, unit: 'палета', price: per, sum: pallets * per });
    }
    const veh = P.vehicles.find((x) => x.id === v.vehicle);
    const km = Math.max(0, parseFloat(v.km) || 0);
    if (veh && km > 0) {
      const trips = Math.max(1, Math.floor(parseFloat(v.trips)) || 1);
      const per = Math.max(veh.min, km * veh.perKm);
      lines.push({ name: 'Доставка: ' + veh.name + ', ' + (v.cityName ? v.cityName + ' (~' + km + ' км)' : km + ' км'), qty: trips, unit: 'рейс', price: per, sum: trips * per });
    }
    const total = lines.reduce((s, l) => s + l.sum, 0);
    const out = { lines, total, vatRate: P.vatRate };
    const offer = Math.max(0, parseFloat(v.offer) || 0);
    if (offer > 0 && total > 0) {
      out.offer = { price: offer, comment: String(v.offerComment || '').trim().slice(0, 300), diff: offer - total, pct: Math.round(((offer - total) / total) * 100) };
    }
    return out;
  }

  // Віджет: mount(контейнер, { persist, actions:[{label, kind, onClick(state)}] })
  function mount(root, opts) {
    opts = opts || {};
    root.classList.add('calc');
    let html = '';
    let group = '';
    P.items.forEach((it) => {
      if (it.group !== group) { group = it.group; html += '<h3 class="calc-group">' + group + '</h3>'; }
      html += '<label class="calc-row"><span class="calc-name">' + it.name + '<small>' + it.price.toLocaleString('uk-UA') + ' грн / ' + it.unit + (it.usd ? ' (≈ $' + it.usd + ')' : '') + '</small></span>' +
        '<input type="number" min="0" step="1" inputmode="numeric" data-id="' + it.id + '" placeholder="0" aria-label="' + it.name + ', ' + it.unit + '"></label>';
    });
    const storageHtml = '<h3 class="calc-group">Відповідальне зберігання</h3>' +
      '<div class="calc-row"><span class="calc-name">Зберігання на стелажах<small>' + st.perPalletDay + ' грн / палета / доба або ' + st.perPalletMonth + ' грн / палета / міс (вигідніше). Перші ' + P.freeStorageDays + ' доби безкоштовно.</small></span>' +
      '<span class="calc-pair"><label class="mini">палет<input type="number" min="0" step="1" data-k="pallets" placeholder="0"></label><label class="mini">діб<input type="number" min="0" step="1" data-k="days" placeholder="0"></label></span></div>';
    const vehicleOpts = P.vehicles.map((x) => '<option value="' + x.id + '">' + x.name + ' — ' + x.perKm + ' грн/км</option>').join('');
    const cityOpts = P.cities.map((c) => '<option value="' + c[1] + '">' + c[0] + ' (~' + c[1] + ' км)</option>').join('') + '<option value="custom">Інша відстань…</option>';
    const deliveryHtml = '<h3 class="calc-group">Доставка по Україні</h3>' +
      '<div class="calc-row calc-delivery"><span class="calc-name">Міжміська доставка<small>Ціна за км в один бік, мінімальна вартість рейсу залежить від авто.</small></span>' +
      '<span class="calc-stack"><select data-k="vehicle" aria-label="Тип авто"><option value="">— не потрібна —</option>' + vehicleOpts + '</select>' +
      '<select data-k="city" aria-label="Місто">' + cityOpts + '</select>' +
      '<label class="mini" data-k="kmwrap" hidden>відстань, км<input type="number" min="1" step="1" data-k="km" placeholder="км"></label>' +
      '<label class="mini">рейсів<input type="number" min="1" step="1" data-k="trips" value="1"></label></span></div>';
    root.innerHTML = '<div class="calc-inputs">' + html + storageHtml + deliveryHtml + '</div>' +
      '<aside class="calc-result" aria-live="polite"><h3>Ваш розрахунок</h3><ul class="calc-lines" data-k="lines"></ul><div class="calc-total" data-k="total"></div>' +
      '<label class="calc-vat"><input type="checkbox" data-k="vat"> Показати з ПДВ 20%</label>' +
      '<div class="calc-offer"><label>Запропонувати свою ціну (за весь розрахунок, грн без ПДВ)<input type="number" min="1" step="1" inputmode="numeric" data-k="offer" placeholder="наприклад, 20000"></label>' +
      '<label>Коментар до пропозиції<input type="text" maxlength="300" data-k="offerComment" placeholder="обсяг, регулярність, умови"></label><div class="offer-line" data-k="offerLine"></div></div>' +
      '<div data-k="actions"></div>' +
      '<p class="calc-note">Ціни орієнтовні, у гривнях. Обробка поверхонь та інші операції — за погодженням.</p></aside>';

    const q = (k) => root.querySelector('[data-k="' + k + '"]');
    const cityEl = q('city');
    let state = compute({});
    const actionsEl = q('actions');
    const btns = (opts.actions || []).map((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = a.kind === 'ghost' ? 'btn ghost-dark' : 'btn';
      b.textContent = a.label;
      b.addEventListener('click', () => a.onClick(state));
      actionsEl.appendChild(b);
      return b;
    });

    function read() {
      const items = {};
      root.querySelectorAll('[data-id]').forEach((el) => { items[el.dataset.id] = el.value; });
      const custom = cityEl.value === 'custom';
      return {
        items, pallets: q('pallets').value, days: q('days').value, vehicle: q('vehicle').value, trips: q('trips').value,
        offer: q('offer').value, offerComment: q('offerComment').value,
        km: custom ? q('km').value : cityEl.value,
        cityName: custom ? '' : cityEl.options[cityEl.selectedIndex].text.replace(/\s*\(.*\)/, '')
      };
    }
    function render() {
      const has = state.lines.length > 0;
      q('lines').innerHTML = has
        ? state.lines.map((l) => '<li><span>' + l.name + ' <em>' + l.qty.toLocaleString('uk-UA') + ' ' + l.unit + '</em></span><b>' + fmt(l.sum) + '</b></li>').join('')
        : '<li class="empty">Вкажіть кількість у потрібних послугах, і розрахунок з\'явиться тут.</li>';
      const vat = state.total * P.vatRate;
      q('total').innerHTML = q('vat').checked
        ? '<span>Без ПДВ: ' + fmt(state.total) + ' · ПДВ ' + Math.round(P.vatRate * 100) + '%: ' + fmt(vat) + '</span><strong>' + fmt(state.total + vat) + '</strong>'
        : '<span>Орієнтовно, без ПДВ</span><strong>' + fmt(state.total) + '</strong>';
      const ol = q('offerLine');
      if (state.offer) {
        const o = state.offer;
        ol.innerHTML = 'Ваша пропозиція: <b>' + fmt(o.price) + '</b> (' + (o.pct > 0 ? '+' : '') + o.pct + '% до розрахунку). Менеджер розгляне її й зв\'яжеться з вами.';
        ol.className = 'offer-line on';
      } else { ol.textContent = ''; ol.className = 'offer-line'; }
      btns.forEach((b, i) => { if ((opts.actions[i] || {}).needsLines !== false) b.disabled = !has; });
    }
    function update() {
      state = compute(read());
      q('kmwrap').hidden = cityEl.value !== 'custom';
      render();
      if (opts.persist) { try { sessionStorage.setItem('calc', JSON.stringify(state)); } catch (_) {} }
      if (opts.onChange) opts.onChange(state);
    }
    root.addEventListener('input', update);
    root.addEventListener('change', update);
    update();
    return { getState: () => state, fmt };
  }

  window.Calc = { compute, mount, fmt };
})();
