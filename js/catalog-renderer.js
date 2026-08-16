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

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const brandFilter = urlParams.get('brand');
  const categoryFilter = urlParams.get('category');
  const searchQuery = urlParams.get('search');

  try {
    const res = await fetch('data/products.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const allProducts = await res.json();
    let products = allProducts;

    // Apply active filters with resilient string matching
    if (brandFilter) {
      const targetBrand = brandFilter.trim().toLowerCase();
      products = products.filter(p => {
        const productBrand = (p.brand || p.specs?.['Brand Name'] || '').trim().toLowerCase();
        return productBrand === targetBrand;
      });
      updateFilterBadge(`Brand: ${brandFilter}`);
    } else if (categoryFilter) {
      const targetCategory = categoryFilter.trim().toLowerCase();
      products = products.filter(p => {
        const productCategory = (p.category || p.specs?.['Category'] || '').trim().toLowerCase();
        return productCategory === targetCategory;
      });
      updateFilterBadge(`Category: ${categoryFilter}`);
    } else if (searchQuery) {
      const query = searchQuery.trim().toLowerCase();
      products = products.filter(p => 
        (p.title || '').toLowerCase().includes(query) ||
        (p.brand || '').toLowerCase().includes(query) ||
        (p.category || '').toLowerCase().includes(query)
      );
      updateFilterBadge(`Search: "${searchQuery}"`);
    }

    CATALOG_CONFIG.filteredProducts = products;

    // Subtitle update
    const subTitle = document.getElementById('catalog-subtitle');
    if (subTitle) {
      subTitle.textContent = `Showing ${products.length} product${products.length !== 1 ? 's' : ''}`;
    }

    // Initial render
    renderCatalogPage(1, false);

  } catch (err) {
    console.error('Error fetching catalog data:', err);
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = `<div class="col-span-full py-12 text-center text-red-500 font-medium">Failed to load product catalog. Please verify data/products.json exists.</div>`;
    }
  }
});

/**
 * Generates an Ad Card HTML string styled like product/blog cards
 */
function createAdCardTemplate(adSlotId = 'infeed-ad-slot') {
  return `
    <div class="bg-gray-50 border border-dashed border-gray-300 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between relative min-h-[360px] p-4 text-center">
      <!-- Top Tag -->
      <div class="flex justify-between items-center text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
        <span>Sponsored</span>
        <i class="fa-solid fa-rectangle-ad text-gray-400 text-xs"></i>
      </div>

      <!-- Main Ad Container (Google AdSense / Custom Script Anchor) -->
      <div class="flex-grow flex flex-col items-center justify-center py-6">
        <!-- Replace this inner block with your ad script tag (e.g., <ins class="adsbygoogle" ...></ins>) -->
        <div id="${adSlotId}" class="w-full h-full flex flex-col items-center justify-center rounded bg-white border border-gray-200 p-4">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wide">Advertisement</span>
          <p class="text-[11px] text-gray-400 mt-1">Your Banner or AdSense Script Here</p>
        </div>
      </div>

      <!-- Bottom Spacer / CTA Placeholder -->
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
        <p class="text-sm text-gray-500 mt-1">Try resetting your search or filter criteria.</p>
        <a href="catalog.html" class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">View All Products</a>
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
    const mainImg = (Array.isArray(p.images) && p.images[0]) || p.featuredImage || p.thumbnail || 'https://via.placeholder.com/300';
    const detailUrl = `product.html?id=${encodeURIComponent(p.id || p.asin)}`;

    // Product Card Markup
    gridCardsHtml += `
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
        <a href="${detailUrl}" class="block group p-4 bg-gray-50 flex items-center justify-center h-48 overflow-hidden relative">
          <img src="${mainImg}" alt="${escapeHtml(p.title)}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300" />
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
              <span class="text-base font-extrabold text-gray-900">${p.currentPrice ? '₹' + p.currentPrice.toLocaleString() : 'Price on Request'}</span>
              ${p.mrp && p.mrp > p.currentPrice ? `<span class="text-xs text-gray-400 line-through ml-1">₹${p.mrp.toLocaleString()}</span>` : ''}
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

/**
 * Updates active filter pill UI badge
 */
function updateFilterBadge(label) {
  const container = document.getElementById('active-filters');
  const badge = document.getElementById('filter-badge');

  if (container && badge) {
    badge.innerHTML = `
      ${escapeHtml(label)}
      <a href="catalog.html" class="hover:text-red-600 font-bold ml-1">×</a>
    `;
    container.classList.remove('hidden');
  }
}