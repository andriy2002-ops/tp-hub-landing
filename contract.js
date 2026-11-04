(function () {
  const form = document.getElementById('cform');
  const docEl = document.getElementById('doc');
  const btnPrint = document.getElementById('btn-print');
  const btnDoc = document.getElementById('btn-doc');
  const status = document.getElementById('cstatus');
  const money = ContractCore.money;

  let calc = null;
  try { calc = JSON.parse(sessionStorage.getItem('calc') || 'null'); } catch (_) {}
  if (calc && calc.lines && !calc.lines.length) calc = null;
  document.getElementById('calc-hint').textContent = calc
    ? 'Ваш розрахунок з калькулятора (' + money(calc.total) + ' грн без ПДВ) буде додано як Додаток 3.'
    : 'Розрахунку з калькулятора немає. У договорі буде повний перелік тарифів (Додаток 1).';

  const today = new Date();
  form.elements.date.value = today.toISOString().slice(0, 10);
  form.elements.until.value = today.getFullYear() + '-12-31';

  let lastNum = '';
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); status.textContent = 'Заповніть обов\'язкові поля, позначені *.'; return; }
    const r = ContractCore.build(Object.fromEntries(new FormData(form)), calc);
    docEl.innerHTML = r.html;
    lastNum = r.num;
    docEl.hidden = false;
    btnPrint.disabled = btnDoc.disabled = false;
    status.textContent = 'Договір сформовано нижче. Можна друкувати або завантажити для Word.';
    docEl.scrollIntoView({ behavior: 'smooth' });
  });
  btnPrint.addEventListener('click', () => ContractCore.print(docEl));
  btnDoc.addEventListener('click', () => ContractCore.download(docEl, lastNum));
})();
