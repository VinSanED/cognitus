(() => {
  'use strict';

  const catalog = window.FREEEDUCA_CATALOG;
  const root = document.querySelector('#freeeduca-catalog');
  if (!catalog || !root) return;

  const elements = {
    search: root.querySelector('#freeeduca-search'),
    sort: root.querySelector('#freeeduca-sort'),
    clear: root.querySelector('#freeeduca-clear'),
    filters: root.querySelector('#freeeduca-filters'),
    grid: root.querySelector('#freeeduca-card-grid'),
    empty: root.querySelector('#freeeduca-empty'),
    resultCount: root.querySelector('#freeeduca-result-count'),
    pageInfo: root.querySelector('#freeeduca-page-info'),
    pagination: root.querySelector('#freeeduca-pagination')
  };

  const categoryColors = [
    '#6ef5ff', '#a8ff60', '#ffd166', '#c58cff', '#72ffc1', '#ff9f68',
    '#63d8ff', '#ff7aa8', '#c3f584', '#8ca8ff', '#f5d66e', '#aab8b7'
  ];
  const pageSize = 24;
  let activeCategory = 'all';
  let activePage = 1;

  const items = catalog.categories.flatMap((category, categoryIndex) =>
    category.items.map((item, itemIndex) => ({
      ...item,
      ordinal: itemIndex + 1,
      categoryId: category.id,
      categoryName: category.name,
      color: categoryColors[categoryIndex % categoryColors.length]
    }))
  );

  function normalize(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function escapeHtml(value) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function cleanTitle(value) {
    return value
      .replace(/\.pdf$/i, '')
      .replaceAll('_', ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function filteredItems() {
    const query = normalize(elements.search.value.trim());
    const filtered = items.filter(item => {
      const categoryMatch = activeCategory === 'all' || item.categoryId === activeCategory;
      const searchMatch = !query || normalize(`${item.title} ${item.categoryName}`).includes(query);
      return categoryMatch && searchMatch;
    });

    if (elements.sort.value === 'title') {
      filtered.sort((a, b) => cleanTitle(a.title).localeCompare(cleanTitle(b.title), 'pt-BR'));
    }

    if (elements.sort.value === 'category') {
      filtered.sort((a, b) => a.categoryId.localeCompare(b.categoryId) || a.ordinal - b.ordinal);
    }

    return filtered;
  }

  function renderFilters() {
    const allButton = `<button class="fe-filter active" type="button" data-category="all">
      <span>Todas as áreas</span><b>${catalog.total}</b>
    </button>`;
    const categoryButtons = catalog.categories.map(category => `
      <button class="fe-filter" type="button" data-category="${category.id}">
        <span>${category.id} · ${escapeHtml(category.name)}</span><b>${category.items.length}</b>
      </button>`).join('');
    elements.filters.innerHTML = allButton + categoryButtons;
  }

  function renderCards(pageItems) {
    elements.grid.innerHTML = pageItems.map(item => {
      const title = escapeHtml(cleanTitle(item.title));
      const category = escapeHtml(item.categoryName);
      const url = escapeHtml(item.url);
      return `<a class="fe-card panel" href="${url}" target="_blank" rel="noopener noreferrer" style="--fe-color:${item.color}">
        <div class="fe-card-top">
          <span class="fe-card-index">${item.categoryId}.${String(item.ordinal).padStart(3, '0')}</span>
          <span class="fe-card-format">PDF · EXTERNO</span>
        </div>
        <h4>${title}</h4>
        <p>${category}</p>
        <span class="fe-card-action">Abrir caminho no GitHub <span aria-hidden="true">↗</span></span>
      </a>`;
    }).join('');
  }

  function paginationSequence(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
    const pages = new Set([1, total, current - 1, current, current + 1]);
    const sequence = [...pages].filter(page => page > 0 && page <= total).sort((a, b) => a - b);
    const result = [];
    sequence.forEach((page, index) => {
      if (index && page - sequence[index - 1] > 1) result.push('…');
      result.push(page);
    });
    return result;
  }

  function renderPagination(totalResults) {
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
    activePage = Math.min(activePage, totalPages);
    const pageButtons = paginationSequence(activePage, totalPages).map(page => {
      if (page === '…') return '<span class="fe-page-gap">…</span>';
      const current = page === activePage;
      return `<button class="fe-page${current ? ' active' : ''}" type="button" data-page="${page}" ${current ? 'aria-current="page"' : ''}>${page}</button>`;
    }).join('');

    elements.pagination.innerHTML = `
      <button class="fe-page fe-page-nav" type="button" data-page="${activePage - 1}" ${activePage === 1 ? 'disabled' : ''}>← Anterior</button>
      ${pageButtons}
      <button class="fe-page fe-page-nav" type="button" data-page="${activePage + 1}" ${activePage === totalPages ? 'disabled' : ''}>Próxima →</button>`;
    elements.pageInfo.textContent = `Página ${activePage} de ${totalPages}`;
  }

  function render() {
    const results = filteredItems();
    const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
    activePage = Math.min(activePage, totalPages);
    const start = (activePage - 1) * pageSize;
    const pageItems = results.slice(start, start + pageSize);

    renderCards(pageItems);
    renderPagination(results.length);
    elements.empty.hidden = results.length !== 0;
    elements.grid.hidden = results.length === 0;
    elements.resultCount.textContent = `${results.length} ${results.length === 1 ? 'obra encontrada' : 'obras encontradas'}`;
    elements.clear.hidden = !elements.search.value && activeCategory === 'all' && elements.sort.value === 'category';
  }

  function resetPageAndRender() {
    activePage = 1;
    render();
  }

  elements.filters.addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    elements.filters.querySelectorAll('.fe-filter').forEach(filter => {
      filter.classList.toggle('active', filter === button);
    });
    resetPageAndRender();
  });

  elements.pagination.addEventListener('click', event => {
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;
    activePage = Number(button.dataset.page);
    render();
    root.querySelector('.fe-toolbar').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  elements.search.addEventListener('input', resetPageAndRender);
  elements.sort.addEventListener('change', resetPageAndRender);
  elements.clear.addEventListener('click', () => {
    elements.search.value = '';
    elements.sort.value = 'category';
    activeCategory = 'all';
    elements.filters.querySelectorAll('.fe-filter').forEach(filter => {
      filter.classList.toggle('active', filter.dataset.category === 'all');
    });
    resetPageAndRender();
    elements.search.focus();
  });

  renderFilters();
  render();
})();
