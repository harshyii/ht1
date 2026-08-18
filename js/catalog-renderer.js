/**
 * Utility function to escape HTML entities
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const CATALOG_CONFIG = {
  pageSize: 8,         // Total cards per page (products + ads combined)
  currentPage: 1,
  adInterval: 4,       // Insert an ad card after every N items
  filteredProducts: []
};

/**
 * Initializes listeners and initial filter execution
 */
function initCatalog() {
  const urlParams = new URLSearchParams(window.location.search);
  const selectedCat = urlParams.get('cat') || urlParams.get('category') || 'all';
  const selectedBrand = urlParams.get('brand') || '';
  const searchQuery = urlParams.get('q') || urlParams.get('search') || '';

  const categorySelect = document.getElementById('category-select');
  if (categorySelect && selectedCat) {
    categorySelect.value = selectedCat;
  }

  const searchInput = document.getElementById('catalog-search-input') || document.getElementById('search-input');
  if (searchInput && searchQuery) {
    searchInput.value = searchQuery;
  }

  if (categorySelect && !categorySelect.dataset.bound) {
    categorySelect.addEventListener('change', () => applyCatalogFilters());
    categorySelect.dataset.bound = "true";
  }

  if (searchInput && !searchInput.dataset.bound) {
    searchInput.addEventListener('input', () => applyCatalogFilters());
    searchInput.dataset.bound = "true";
  }

  const searchForm = document.getElementById('catalog-search-form') || document.getElementById('search-form');
  if (searchForm && !searchForm.dataset.bound) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      applyCatalogFilters();
    });
    searchForm.dataset.bound = "true";
  }

  // Pass URL params to initial filter execution
  applyCatalogFilters(selectedCat, searchQuery, selectedBrand);
}

// Attach lifecycle loaders
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCatalog);
} else {
  initCatalog();
}
window.addEventListener('productsLoaded', initCatalog);
window.addEventListener('load', initCatalog);

/**
 * Reads UI inputs or URL params to filter products by category, brand, and search keyword
 */
function applyCatalogFilters(overrideCat, overrideSearch, overrideBrand) {
  const allProducts = window.ALL_PRODUCTS || (typeof ALL_PRODUCTS !== 'undefined' ? ALL_PRODUCTS : []);
  
  // If ALL_PRODUCTS is empty or hasn't loaded yet, attempt retry
  if (!Array.isArray(allProducts) || allProducts.length === 0) {
    const grid = document.getElementById('products-grid');
    if (grid && !grid.dataset.loading) {
      grid.dataset.loading = "true";
      grid.innerHTML = `<div class="col-span-full py-16 text-center text-gray-400">Loading products...</div>`;
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        const readyProducts = window.ALL_PRODUCTS || (typeof ALL_PRODUCTS !== 'undefined' ? ALL_PRODUCTS : []);
        if (Array.isArray(readyProducts) && readyProducts.length > 0) {
          clearInterval(checkInterval);
          delete grid.dataset.loading;
          applyCatalogFilters(overrideCat, overrideSearch, overrideBrand);
        } else if (attempts > 20) {
          clearInterval(checkInterval);
          delete grid.dataset.loading;
          renderCatalogPage(1, false);
        }
      }, 150);
    }
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);

  // 1. Resolve active category filter
  const categorySelect = document.getElementById('category-select');
  const categoryKey = overrideCat !== undefined 
    ? overrideCat 
    : (categorySelect && categorySelect.value ? categorySelect.value : (urlParams.get('cat') || urlParams.get('category') || 'all'));

  // 2. Resolve active search text query
  const searchInput = document.getElementById('catalog-search-input') || document.getElementById('search-input');
  const searchQuery = overrideSearch !== undefined 
    ? overrideSearch 
    : (searchInput && searchInput.value ? searchInput.value : (urlParams.get('q') || urlParams.get('search') || ''));

  // 3. Resolve active brand query parameter
  const brandQuery = overrideBrand !== undefined 
    ? overrideBrand 
    : (urlParams.get('brand') || '');

  const normalizedSearch = searchQuery.toLowerCase().trim();
  const normalizedCategory = decodeURIComponent(categoryKey || '').toLowerCase().trim();
  const normalizedBrand = decodeURIComponent(brandQuery || '').toLowerCase().trim();

  CATALOG_CONFIG.filteredProducts = allProducts.filter(product => {
    // 1. Category Matching
    let matchesCategory = true;
    if (normalizedCategory && normalizedCategory !== 'all') {
      const prodCat = (product.category || '').toLowerCase().trim();
      matchesCategory = prodCat === normalizedCategory || prodCat.includes(normalizedCategory);
    }

    // 2. Brand Parameter Matching
    let matchesBrand = true;
    if (normalizedBrand) {
      const prodBrand = (product.brand || '').toLowerCase().trim();
      matchesBrand = prodBrand === normalizedBrand || prodBrand.includes(normalizedBrand);
    }

    // 3. Search Term Matching (Title, Brand, Category, SKU/ID)
    let matchesSearch = true;
    if (normalizedSearch) {
      const titleMatch = (product.title || '').toLowerCase().includes(normalizedSearch);
      const brandMatch = (product.brand || '').toLowerCase().includes(normalizedSearch);
      const catMatch = (product.category || '').toLowerCase().includes(normalizedSearch);
      const skuMatch = String(product.id || product.asin || '').toLowerCase().includes(normalizedSearch);

      matchesSearch = titleMatch || brandMatch || catMatch || skuMatch;
    }

    return matchesCategory && matchesBrand && matchesSearch;
  });

  updateUrlParams(categoryKey, searchQuery, brandQuery);
  updateFilterBadges(categoryKey, searchQuery, brandQuery);
  renderCatalogPage(1, false);
}

/**
 * Dynamically updates URL query parameters to reflect active filters
 */
function updateUrlParams(category, query, brand) {
  const url = new URL(window.location.href);
  
  if (category && category.toLowerCase() !== 'all') {
    url.searchParams.set('cat', category);
  } else {
    url.searchParams.delete('cat');
    url.searchParams.delete('category');
  }

  if (query && query.trim() !== '') {
    url.searchParams.set('q', query.trim());
  } else {
    url.searchParams.delete('q');
    url.searchParams.delete('search');
  }

  if (brand && brand.trim() !== '') {
    url.searchParams.set('brand', brand.trim());
  } else {
    url.searchParams.delete('brand');
  }

  window.history.replaceState({}, '', url.toString());
}

/**
 * Updates UI filter status indicators and badges safely
 */
function updateFilterBadges(category, query, brand) {
  const container = document.getElementById('active-filters');
  const badge = document.getElementById('filter-badge');

  if (!container || !badge) return;

  const labels = [];
  if (category && category.toLowerCase() !== 'all') {
    labels.push(`Category: ${category}`);
  }
  if (brand && brand.trim() !== '') {
    labels.push(`Brand: ${brand}`);
  }
  if (query && query.trim() !== '') {
    labels.push(`Search: "${query.trim()}"`);
  }

  if (labels.length > 0) {
    badge.innerHTML = `
      ${escapeHtml(labels.join(' | '))}
      <button onclick="resetCatalogFilters()" class="hover:text-red-600 font-bold ml-2 cursor-pointer" aria-label="Clear filters">×</button>
    `;
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}

/**
 * Clears active search, category, and brand filters
 */
function resetCatalogFilters() {
  const categorySelect = document.getElementById('category-select');
  const searchInput = document.getElementById('catalog-search-input') || document.getElementById('search-input');

  if (categorySelect) categorySelect.value = 'all';
  if (searchInput) searchInput.value = '';

  applyCatalogFilters('all', '', '');
}

/**
 * Generates an Ad Card HTML string styled like product cards
 */
function createAdCardTemplate(adSlotId = 'infeed-ad-slot') {
  return `
    <div class="bg-gray-50 border border-dashed border-gray-300 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative min-h-[360px] p-4 text-center">
      <div class="flex justify-between items-center text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
        <span>Sponsored</span>
        <i class="fa-solid fa-rectangle-ad text-gray-400 text-xs"></i>
      </div>

      <div class="flex-grow flex flex-col items-center justify-center py-6">
        <div id="${adSlotId}" class="w-full h-full flex flex-col items-center justify-center rounded bg-white border border-gray-200 p-4">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wide">Advertisement</span>
          <p class="text-[11px] text-gray-400 mt-1">Your Banner or AdSense Script Here</p>
        </div>
      </div>

      <div class="mt-2 pt-2 border-t border-gray-200 text-left flex items-center justify-between text-xs text-gray-400">
        <span>Promoted Item</span>
        <span class="text-blue-600 hover:underline cursor-pointer font-medium">Learn More &rarr;</span>
      </div>
    </div>
  `;
}

/**
 * Renders a specific page of catalog products with injected ad cards
 */
function renderCatalogPage(page = 1, scrollToTop = true) {
  CATALOG_CONFIG.currentPage = page;
  const grid = document.getElementById('products-grid');
  const totalProducts = CATALOG_CONFIG.filteredProducts.length;

  if (!grid) return;

  if (totalProducts === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <i class="fa-solid fa-box-open text-4xl text-gray-300 mb-3"></i>
        <h3 class="text-lg font-bold text-gray-700">No Products Found</h3>
        <p class="text-sm text-gray-500 mt-1">Try adjusting your search criteria or resetting filters.</p>
        <button onclick="resetCatalogFilters()" class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition cursor-pointer">Clear Filters</button>
      </div>`;
    
    const pagContainer = document.getElementById('catalog-pagination-container');
    if (pagContainer) pagContainer.innerHTML = '';
    return;
  }

  // Slice array for current page
  const startIndex = (page - 1) * CATALOG_CONFIG.pageSize;
  const endIndex = Math.min(startIndex + CATALOG_CONFIG.pageSize, totalProducts);
  const paginatedProducts = CATALOG_CONFIG.filteredProducts.slice(startIndex, endIndex);

  // Build grid items (products + injected ad cards)
  let gridCardsHtml = '';
  paginatedProducts.forEach((p, index) => {
    const mainImg = (Array.isArray(p.images) && p.images[0]) || p.featuredImage || p.thumbnail || p.image || 'https://via.placeholder.com/300';
    const detailUrl = `product.html?id=${encodeURIComponent(p.id || p.asin || '')}`;

    const formattedPrice = typeof p.currentPrice === 'number' 
      ? '₹' + p.currentPrice.toLocaleString() 
      : (p.price ? '₹' + p.price : 'Price on Request');

    const formattedMrp = typeof p.mrp === 'number' && p.mrp > (p.currentPrice || p.price)
      ? `<span class="text-xs text-gray-400 line-through ml-1">₹${p.mrp.toLocaleString()}</span>` 
      : '';

    // Product Card Markup
    gridCardsHtml += `
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
        <a href="${detailUrl}" class="block group p-4 bg-gray-50 flex items-center justify-center h-48 overflow-hidden relative">
          <img src="${escapeHtml(mainImg)}" alt="${escapeHtml(p.title)}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300" />
        </a>
        <div class="p-4 flex-grow flex flex-col justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">${escapeHtml(p.brand || 'Generic')}</span>
            <a href="${detailUrl}" class="block mt-2 font-bold text-gray-900 hover:text-blue-600 transition line-clamp-2 text-sm">
              ${escapeHtml(p.title)}
            </a>
          </div>

          <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div>
              <span class="text-base font-extrabold text-gray-900">${formattedPrice}</span>
              ${formattedMrp}
            </div>
            <a href="${detailUrl}" class="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition flex items-center gap-1">
              View <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </a>
          </div>
        </div>
      </div>
    `;

    // Inject Ad Card every N items
    if ((index + 1) % CATALOG_CONFIG.adInterval === 0 && (index + 1) !== paginatedProducts.length) {
      gridCardsHtml += createAdCardTemplate(`ad-slot-page-${page}-item-${index + 1}`);
    }
  });

  grid.innerHTML = gridCardsHtml;

  // Render pagination controls
  renderCatalogPaginationControls(totalProducts, page, CATALOG_CONFIG.pageSize);

  // Scroll to top of grid on page switch if triggered manually
  if (scrollToTop) {
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Builds and renders pagination controls
 */
function renderCatalogPaginationControls(totalItems, currentPage, pageSize) {
  const container = document.getElementById('catalog-pagination-container');
  if (!container) return;

  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const delta = 1;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  const pageButtonsHtml = pages.map(page => {
    if (page === '...') {
      return `<span class="px-2 py-1 text-gray-400 text-sm">…</span>`;
    }
    
    const isActive = page === currentPage;
    return `
      <button onclick="renderCatalogPage(${page}, true)" 
              class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }">
        ${page}
      </button>
    `;
  }).join('');

  container.innerHTML = `
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
      <div class="text-xs text-gray-500">
        Showing <span class="font-semibold text-gray-900">${startItem}</span> to <span class="font-semibold text-gray-900">${endItem}</span> of <span class="font-semibold text-gray-900">${totalItems}</span> products
      </div>

      <nav class="flex items-center gap-1.5" aria-label="Pagination">
        <button onclick="renderCatalogPage(${currentPage - 1}, true)" 
                ${currentPage === 1 ? 'disabled' : ''} 
                class="px-2.5 h-8 flex items-center gap-1 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          <i class="fa-solid fa-arrow-left text-[10px]"></i> Prev
        </button>

        <div class="flex items-center gap-1">
          ${pageButtonsHtml}
        </div>

        <button onclick="renderCatalogPage(${currentPage + 1}, true)" 
                ${currentPage === totalPages ? 'disabled' : ''} 
                class="px-2.5 h-8 flex items-center gap-1 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          Next <i class="fa-solid fa-arrow-right text-[10px]"></i>
        </button>
      </nav>
    </div>
  `;
}