(function () {
  const P = window.PRICES;
  const root = document.getElementById('calc');
  if (!root) return;
  const fmt = (n) => Math.round(n).toLocaleString('uk-UA').replace(/ /g, ' ') + ' грн';
  const rowsEl = document.getElementById('calc-rows');
  const outEl = document.getElementById('calc-lines');
  const totalEl = document.getElementById('calc-total');
  const vatBox = document.getElementById('calc-vat');
  const btnContract = document.getElementById('calc-contract');
  const btnMessage = document.getElementById('calc-message');

  // --- побудова інтерфейсу ---
  let html = '';
  let group = '';
  P.items.forEach((it) => {
    if (it.group !== group) { group = it.group; html += '<h3 class="calc-group">' + group + '</h3>'; }
    html += '<label class="calc-row"><span class="calc-name">' + it.name + '<small>' + it.price.toLocaleString('uk-UA') + ' грн / ' + it.unit + '</small></span>' +
      '<input type="number" min="0" step="1" inputmode="numeric" data-id="' + it.id + '" placeholder="0" aria-label="' + it.name + ', ' + it.unit + '"></label>';
  });
  const st = P.storage;
  const storageHtml = '<h3 class="calc-group">Відповідальне зберігання</h3>' +
    '<div class="calc-row"><span class="calc-name">Зберігання на стелажах<small>' + st.perPalletDay + ' грн / палета / доба або ' + st.perPalletMonth + ' грн / палета / міс (вигідніше). Перші ' + P.freeStorageDays + ' доби безкоштовно.</small></span>' +
    '<span class="calc-pair"><label class="mini">палет<input type="number" min="0" step="1" id="st-pallets" placeholder="0"></label><label class="mini">діб<input type="number" min="0" step="1" id="st-days" placeholder="0"></label></span></div>';
  const vehicleOpts = P.vehicles.map((v) => '<option value="' + v.id + '">' + v.name + ' — ' + v.perKm + ' грн/км</option>').join('');
  const cityOpts = P.cities.map((c) => '<option value="' + c[1] + '">' + c[0] + ' (~' + c[1] + ' км)</option>').join('') + '<option value="custom">Інша відстань…</option>';
  const deliveryHtml = '<h3 class="calc-group">Доставка по Україні</h3>' +
    '<div class="calc-row calc-delivery"><span class="calc-name">Міжміська доставка<small>Ціна за км в один бік, мінімальна вартість рейсу залежить від авто.</small></span>' +
    '<span class="calc-stack"><select id="dl-vehicle" aria-label="Тип авто"><option value="">— не потрібна —</option>' + vehicleOpts + '</select>' +
    '<select id="dl-city" aria-label="Місто">' + cityOpts + '</select>' +
    '<label class="mini" id="dl-km-wrap" hidden>відстань, км<input type="number" min="1" step="1" id="dl-km" placeholder="км"></label>' +
    '<label class="mini">рейсів<input type="number" min="1" step="1" id="dl-trips" value="1"></label></span></div>';
  rowsEl.innerHTML = html + storageHtml + deliveryHtml;

  const cityEl = document.getElementById('dl-city');
  const kmEl = document.getElementById('dl-km');
  cityEl.addEventListener('change', () => { document.getElementById('dl-km-wrap').hidden = cityEl.value !== 'custom'; });

  // --- розрахунок ---
  let state = { lines: [], total: 0 };
  const num = (el) => Math.max(0, parseFloat(el && el.value) || 0);

  function calculate() {
    const lines = [];
    P.items.forEach((it) => {
      const q = num(rowsEl.querySelector('[data-id="' + it.id + '"]'));
      if (q > 0) lines.push({ name: it.name, qty: q, unit: it.unit, price: it.price, sum: q * it.price });
    });
    const pallets = num(document.getElementById('st-pallets'));
    const days = num(document.getElementById('st-days'));
    if (pallets > 0 && days > 0) {
      const billable = Math.max(0, days - P.freeStorageDays);
      const perPallet = billable === 0 ? 0 : Math.min(billable * st.perPalletDay, Math.ceil(billable / 30) * st.perPalletMonth);
      lines.push({ name: 'Відповідальне зберігання (' + days + ' діб, з них ' + Math.min(days, P.freeStorageDays) + ' безкоштовно)', qty: pallets, unit: 'палета', price: perPallet, sum: pallets * perPallet });
    }
    const veh = P.vehicles.find((v) => v.id === document.getElementById('dl-vehicle').value);
    if (veh) {
      const km = cityEl.value === 'custom' ? num(kmEl) : parseFloat(cityEl.value);
      const trips = Math.max(1, Math.floor(num(document.getElementById('dl-trips'))) || 1);
      if (km > 0) {
        const cityName = cityEl.value === 'custom' ? km + ' км' : cityEl.options[cityEl.selectedIndex].text.replace(/\s*\(.*\)/, '') + ' (~' + km + ' км)';
        const per = Math.max(veh.min, km * veh.perKm);
        lines.push({ name: 'Доставка: ' + veh.name + ', ' + cityName, qty: trips, unit: 'рейс', price: per, sum: trips * per });
      }
    }
    const total = lines.reduce((s, l) => s + l.sum, 0);
    state = { lines, total };
    render();
    try { sessionStorage.setItem('calc', JSON.stringify({ lines, total, vatRate: P.vatRate })); } catch (_) {}
  }

  function render() {
    const hasLines = state.lines.length > 0;
    outEl.innerHTML = hasLines
      ? state.lines.map((l) => '<li><span>' + l.name + ' <em>' + l.qty.toLocaleString('uk-UA') + ' ' + l.unit + '</em></span><b>' + fmt(l.sum) + '</b></li>').join('')
      : '<li class="empty">Вкажіть кількість у потрібних послугах, і розрахунок з\'явиться тут.</li>';
    const withVat = vatBox.checked;
    const vat = state.total * P.vatRate;
    totalEl.innerHTML = withVat
      ? '<span>Без ПДВ: ' + fmt(state.total) + ' · ПДВ ' + Math.round(P.vatRate * 100) + '%: ' + fmt(vat) + '</span><strong>' + fmt(state.total + vat) + '</strong>'
      : '<span>Орієнтовно, без ПДВ</span><strong>' + fmt(state.total) + '</strong>';
    btnContract.disabled = btnMessage.disabled = !hasLines;
  }

  root.addEventListener('input', calculate);
  root.addEventListener('change', calculate);
  vatBox.addEventListener('change', render);
  calculate();

  btnContract.addEventListener('click', () => { calculate(); location.href = 'contract.html'; });
  btnMessage.addEventListener('click', () => {
    const msg = document.getElementById('message');
    const text = 'Розрахунок з сайту:\n' + state.lines.map((l) => '- ' + l.name + ': ' + l.qty + ' ' + l.unit + ' = ' + fmt(l.sum)).join('\n') +
      '\nРазом (без ПДВ): ' + fmt(state.total) + '\n\nНапрямки та одержувачі: ';
    msg.value = text;
    document.getElementById('contacts').scrollIntoView({ behavior: 'smooth' });
    msg.focus();
  });
})();
