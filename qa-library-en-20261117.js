(() => {
  'use strict';
  const input = document.getElementById('qa-search');
  const count = document.getElementById('qa-result-count');
  const empty = document.getElementById('qa-empty');
  const items = Array.from(document.querySelectorAll('[data-search-item]'));
  const groups = Array.from(document.querySelectorAll('[data-search-group]'));
  const number = new Intl.NumberFormat('en');
  const normalize = value => value.normalize('NFKC').replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase().replace(/\s+/g, ' ').trim();
  const searchable = items.map(item => normalize((item.dataset.searchExtra || '') + ' ' + item.textContent));
  function filter() {
    const terms = normalize(input?.value || '').split(' ').filter(Boolean);
    let visible = 0;
    items.forEach((item, index) => {
      const matches = terms.every(term => searchable[index].includes(term));
      item.hidden = !matches;
      if (matches) visible++;
    });
    groups.forEach(group => { group.hidden = !Array.from(group.querySelectorAll('[data-search-item]')).some(item => !item.hidden); });
    if (count) count.textContent = 'Showing ' + number.format(visible) + ' of ' + number.format(items.length) + ' questions';
    if (empty) empty.hidden = visible !== 0;
  }
  input?.addEventListener('input', filter);
  document.querySelector('[data-reset-search]')?.addEventListener('click', () => { input.value = ''; filter(); input.focus(); });
  document.querySelector('[data-open-all]')?.addEventListener('click', () => document.querySelectorAll('.qa-item:not([hidden])').forEach(item => { item.open = true; }));
  document.querySelector('[data-close-all]')?.addEventListener('click', () => document.querySelectorAll('.qa-item').forEach(item => { item.open = false; }));
  function openTarget() {
    if (!/^#q-\d{1,3}$/.test(location.hash)) return;
    const target = document.getElementById(location.hash.slice(1));
    if (!target?.matches('.qa-item')) return;
    if (input?.value) { input.value = ''; filter(); }
    target.open = true;
    requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
  }
  window.addEventListener('hashchange', openTarget);
  filter();
  openTarget();
})();
