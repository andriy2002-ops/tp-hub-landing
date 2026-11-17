// Калькулятор на головній сторінці
(function () {
  const root = document.getElementById('calc');
  if (!root || !window.Calc) return;
  // Подія calculator_use: один раз за завантаження сторінки, коли користувач вперше змінив параметри (без сум і даних)
  let used = false;
  const used_ = () => { if (used) return; used = true; if (window.Analytics) Analytics.event('calculator_use'); };
  root.addEventListener('input', used_); root.addEventListener('change', used_);
  const cta = (name) => { if (window.Analytics) Analytics.event('calculator_cta_click', { cta: name }); };
  Calc.mount(root, {
    persist: true,
    actions: [
      { label: 'Скласти договір', onClick: () => { cta('contract'); location.href = 'contract.html'; } },
      { label: 'Надіслати розрахунок у запиті', kind: 'ghost', onClick: (st) => {
        cta('request');
        const msg = document.getElementById('message');
        msg.value = 'Розрахунок з сайту:\n' + st.lines.map((l) => '- ' + l.name + ': ' + l.qty + ' ' + l.unit + ' = ' + Calc.fmt(l.sum)).join('\n') +
          '\nРазом (без ПДВ): ' + Calc.fmt(st.total) + (st.offer ? '\nПропозиція клієнта: ' + Calc.fmt(st.offer.price) + (st.offer.comment ? ' (' + st.offer.comment + ')' : '') : '') + '\n\nНапрямки та одержувачі: ';
        document.getElementById('contacts').scrollIntoView({ behavior: 'smooth' });
        msg.focus();
      } }
    ]
  });
})();
