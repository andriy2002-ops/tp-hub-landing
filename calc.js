// Калькулятор на головній сторінці
(function () {
  const root = document.getElementById('calc');
  if (!root || !window.Calc) return;
  Calc.mount(root, {
    persist: true,
    actions: [
      { label: 'Скласти договір', onClick: () => { location.href = 'contract.html'; } },
      { label: 'Надіслати розрахунок у запиті', kind: 'ghost', onClick: (st) => {
        const msg = document.getElementById('message');
        msg.value = 'Розрахунок з сайту:\n' + st.lines.map((l) => '- ' + l.name + ': ' + l.qty + ' ' + l.unit + ' = ' + Calc.fmt(l.sum)).join('\n') +
          '\nРазом (без ПДВ): ' + Calc.fmt(st.total) + (st.offer ? '\nПропозиція клієнта: ' + Calc.fmt(st.offer.price) + (st.offer.comment ? ' (' + st.offer.comment + ')' : '') : '') + '\n\nНапрямки та одержувачі: ';
        document.getElementById('contacts').scrollIntoView({ behavior: 'smooth' });
        msg.focus();
      } }
    ]
  });
})();
