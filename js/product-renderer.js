/**
 * Utility function to escape HTML entities and prevent XSS
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

const CLICKABLE_SPECS = [
  'Brand Name',
  'Manufacturer',
  'Set Name',
  'Model Name',
  'Item Type Name',
  'Colour'
];

// Configuration for Reviews & Ads
const REVIEWS_CONFIG = {
  pageSize: 5,
  currentPage: 1,
  adInterval: 3, // Insert an ad card after every N reviews
  allReviews: []
};

document.addEventListener('DOMContentLoaded', async () => {
  const params = typeof getQueryParams === 'function' ? getQueryParams() : {};
  const urlParams = new URLSearchParams(window.location.search);
  const productId = params.id || urlParams.get('id');

  // 1. Soft Fallback: Do not force redirect if missing ID
  if (!productId) {
    console.warn('product-renderer: No product ID provided in query parameters.');
    renderMissingProductState('No Product Selected', 'Please navigate back to the catalog to choose a product.');
    return;
  }

  try {
    const res = await fetch('data/products.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const products = await res.json();
    // Compare string representations to prevent type mismatch bugs (e.g., number vs string ID)
    const product = products.find(p => String(p.id) === String(productId) || p.asin === productId);

    if (!product) {
      renderMissingProductState('Product Not Found', 'The requested product ID does not exist in our catalog.');
      return;
    }

    window.currentProduct = product;

    // Render Product Details, Page Ads & Reviews
    renderProductDetails(product);
    renderPageAdPlaceholders();
    await loadProductReviews(productId);

  } catch (err) {
    console.error('Error fetching product detail:', err);
    renderMissingProductState('Error Loading Product', 'Could not fetch product catalog data. Please verify data/products.json exists.');
  }
});

/**
 * Display graceful inline error/fallback state
 */
function renderMissingProductState(title, message) {
  const detailsContainer = document.getElementById('product-details');
  if (detailsContainer) {
    detailsContainer.innerHTML = `
      <div class="col-span-full py-12 text-center">
        <h2 class="text-2xl font-bold text-gray-800">${escapeHtml(title)}</h2>
        <p class="text-gray-500 mt-2">${escapeHtml(message)}</p>
        <a href="catalog.html" class="inline-block mt-4 bg-blue-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-sm">
          Return to Catalog
        </a>
      </div>`;
  }
}

/**
 * Core Product Renderer
 */
function renderProductDetails(product) {
  // Gallery Handling
  const images = Array.isArray(product.images) && product.images.length > 0 
    ? product.images 
    : [product.featuredImage || product.thumbnail || 'https://via.placeholder.com/400?text=No+Image'];

  const mainImage = document.getElementById('main-product-image');
  if (mainImage) {
    mainImage.src = images[0];
    mainImage.alt = escapeHtml(product.title);
  }

  const thumbnailsContainer = document.getElementById('image-thumbnails');
  if (thumbnailsContainer) {
    if (images.length > 1) {
      thumbnailsContainer.innerHTML = images.map((img, index) => `
        <button onclick="changeMainImage('${img}', this)" class="thumbnail-btn border-2 ${index === 0 ? 'border-blue-600' : 'border-gray-200'} rounded-lg p-1 bg-white h-16 w-16 flex-shrink-0 flex items-center justify-center overflow-hidden hover:border-blue-400 transition">
          <img src="${img}" class="max-h-full max-w-full object-contain" alt="Thumbnail ${index + 1}" />
        </button>
      `).join('');
    } else {
      thumbnailsContainer.innerHTML = '';
    }
  }

  // Titles & Identifiers
  const titleElem = document.getElementById('product-title');
  if (titleElem) titleElem.textContent = product.title;

  const skuElem = document.getElementById('product-sku');
  if (skuElem) skuElem.textContent = `SKU: ${product.id || 'N/A'} | ASIN: ${product.asin || 'N/A'}`;

  const brandTag = document.getElementById('product-brand-tag');
  if (brandTag) brandTag.textContent = product.brand || 'Generic';

  // Breadcrumbs
  const brandLink = document.getElementById('brand-link');
  if (brandLink) {
    brandLink.textContent = product.brand || 'Catalog';
    if (typeof Navigation !== 'undefined' && Navigation.toCatalogByBrand) {
      brandLink.href = Navigation.toCatalogByBrand(product.brand);
    } else {
      brandLink.href = `catalog.html?brand=${encodeURIComponent(product.brand || '')}`;
    }
  }

  // Pricing
  const priceElem = document.getElementById('product-price');
  if (priceElem) {
    priceElem.textContent = product.currentPrice ? `₹${product.currentPrice.toLocaleString()}` : 'Price on Request';
  }

  const mrpElem = document.getElementById('product-mrp');
  const discountElem = document.getElementById('product-discount');

  if (product.mrp && product.currentPrice && product.mrp > product.currentPrice) {
    if (mrpElem) mrpElem.textContent = `₹${product.mrp.toLocaleString()}`;
    const savingsPct = Math.round(((product.mrp - product.currentPrice) / product.mrp) * 100);
    if (discountElem) {
      discountElem.textContent = `Save ${savingsPct}%`;
      discountElem.style.display = 'inline-block';
    }
  } else {
    if (mrpElem) mrpElem.textContent = '';
    if (discountElem) discountElem.style.display = 'none';
  }

  // Rating Badge
  const ratingElem = document.getElementById('product-rating');
  if (ratingElem) {
    ratingElem.innerHTML = `★ ${product.rating || '4.5'} <span class="text-gray-400">(${product.reviewCount || 0})</span>`;
  }

  // Description
  const descElem = document.getElementById('product-description');
  if (descElem) {
    descElem.textContent = product.description || product.summary || 'High-performance equipment engineered for reliability and long-term durability.';
  }

  // Action Button 1: Add to Cart
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  if (addToCartBtn) {
    addToCartBtn.onclick = () => {
      const qtyInput = document.getElementById('product-qty-input');
      const quantity = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;

      if (typeof App !== 'undefined' && App.addToCart) {
        App.addToCart(product, quantity);
      } else {
        alert(`Added ${quantity} x "${product.title}" to cart!`);
      }
    };
  }

  // Action Button 2: Bulk Order Inquiry (WhatsApp Link)
  const bulkBtn = document.getElementById('bulk-order-btn') || document.getElementById('amazon-buy-btn');
  if (bulkBtn) {
    const message = encodeURIComponent(
      `Hello JK Enterprises,\n\nI want to inquire about a Bulk Order for:\n` +
      `*Product:* ${product.title}\n` +
      `*SKU:* ${product.id || product.asin}\n` +
      `*Brand:* ${product.brand || 'N/A'}\n\n` +
      `Please share bulk pricing, stock availability, and delivery lead time.`
    );
    
    bulkBtn.href = `https://wa.me/919050623210?text=${message}`;
    bulkBtn.target = "_blank";
    bulkBtn.rel = "noopener noreferrer";
    bulkBtn.innerHTML = `<i class="fa-brands fa-whatsapp text-lg me-1"></i> Bulk Order Inquiry`;
  }

  // Specs Table
  const specs = product.specs || product.specifications || {
    'Brand Name': product.brand || 'JK Enterprises',
    'Model Name': product.id || product.asin,
    'Category': product.category || 'Industrial Equipment'
  };
  renderSpecifications(specs);
}

/**
 * Renders Specifications Table
 */
function renderSpecifications(specs) {
  const specsTable = document.getElementById('specs-table-body');
  if (!specsTable) return;

  specsTable.innerHTML = Object.entries(specs).map(([key, value]) => {
    const isClickable = CLICKABLE_SPECS.includes(key);
    
    let filterUrl = '#';
    if (key === 'Brand Name' || key === 'Manufacturer') {
      filterUrl = typeof Navigation !== 'undefined' && Navigation.toCatalogByBrand
        ? Navigation.toCatalogByBrand(value) 
        : `catalog.html?brand=${encodeURIComponent(value)}`;
    } else {
      filterUrl = typeof Navigation !== 'undefined' && Navigation.toCatalogByCategory
        ? Navigation.toCatalogByCategory(value) 
        : `catalog.html?category=${encodeURIComponent(value)}`;
    }

    const valueDisplay = isClickable 
      ? `<a href="${filterUrl}" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition shadow-sm border border-blue-200">
           ${escapeHtml(value)} ↗
         </a>`
      : `<span class="text-gray-700">${escapeHtml(value)}</span>`;

    return `
      <tr class="hover:bg-gray-50 transition">
        <td class="py-3 px-4 font-semibold text-gray-700 w-1/3 border-r border-gray-100 bg-gray-50/50">
          ${escapeHtml(key)}
        </td>
        <td class="py-3 px-4 w-2/3">
          ${valueDisplay}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Renders In-Feed Ad Placeholder within Reviews
 */
function createReviewAdCardTemplate(slotId = 'review-ad-slot') {
  return `
    <div class="my-4 p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl flex flex-col justify-between relative text-center">
      <div class="flex justify-between items-center text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
        <span>Sponsored Ad</span>
        <i class="fa-solid fa-rectangle-ad text-gray-400 text-xs"></i>
      </div>
      
      <div id="${slotId}" class="py-4 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center">
        <span class="text-xs font-bold text-gray-400 uppercase tracking-wide">Advertisement</span>
        <p class="text-[11px] text-gray-400 mt-1">Your Banner or AdSense Script Here</p>
      </div>

      <div class="mt-2 text-right">
        <span class="text-[11px] text-blue-600 hover:underline cursor-pointer font-medium">Learn More &rarr;</span>
      </div>
    </div>
  `;
}

/**
 * Renders optional Page / Sidebar Ad Slots if containers exist in HTML
 */
function renderPageAdPlaceholders() {
  const sidebarAdContainer = document.getElementById('product-sidebar-ad');
  if (sidebarAdContainer) {
    sidebarAdContainer.innerHTML = `
      <div class="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 text-center my-6">
        <div class="flex justify-between items-center text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
          <span>Advertisement</span>
          <i class="fa-solid fa-rectangle-ad text-gray-400 text-xs"></i>
        </div>
        <div class="py-8 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wide">Sidebar Ad Slot</span>
          <p class="text-[11px] text-gray-400 mt-1">300x250 Banner Placeholder</p>
        </div>
      </div>`;
  }
}

/**
 * Loads Reviews and Initialises Paginated Review List
 */
async function loadProductReviews(productId) {
  const container = document.getElementById('reviews-container');
  const countBadge = document.getElementById('reviews-count-badge');
  if (!container) return;

  try {
    const res = await fetch('data/reviews.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const allReviews = await res.json();
    REVIEWS_CONFIG.allReviews = allReviews.filter(rev => String(rev.productId) === String(productId) || rev.asin === productId);

    if (countBadge) {
      countBadge.textContent = `${REVIEWS_CONFIG.allReviews.length} Review${REVIEWS_CONFIG.allReviews.length !== 1 ? 's' : ''}`;
    }

    renderPaginatedReviews(1);

  } catch (err) {
    if (countBadge) countBadge.textContent = `0 Reviews`;
    container.innerHTML = `<p class="text-sm text-gray-500 italic py-4">No customer reviews available at this time.</p>`;
  }
}

/**
 * Renders Reviews with In-Feed Ads & Pagination Controls
 */
function renderPaginatedReviews(page = 1) {
  REVIEWS_CONFIG.currentPage = page;
  const container = document.getElementById('reviews-container');
  const totalReviews = REVIEWS_CONFIG.allReviews.length;

  if (!container) return;

  if (totalReviews === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <p>No customer reviews yet for this product.</p>
      </div>`;
    return;
  }

  // Calculate slice
  const startIndex = (page - 1) * REVIEWS_CONFIG.pageSize;
  const endIndex = Math.min(startIndex + REVIEWS_CONFIG.pageSize, totalReviews);
  const paginatedReviews = REVIEWS_CONFIG.allReviews.slice(startIndex, endIndex);

  // Render review list HTML with injected ad cards
  let reviewsHtml = '';
  paginatedReviews.forEach((rev, index) => {
    reviewsHtml += `
      <div class="border-b border-gray-100 last:border-0 pb-6 mb-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
              ${escapeHtml(rev.userName ? rev.userName.charAt(0).toUpperCase() : 'U')}
            </div>
            <span class="font-bold text-sm text-gray-800">${escapeHtml(rev.userName || rev.author || 'Verified Buyer')}</span>
          </div>
          <span class="text-xs text-gray-400">${escapeHtml(rev.date || '')}</span>
        </div>

        <div class="flex items-center gap-2 mb-2">
          <span class="text-amber-500 text-xs">
            ${'★'.repeat(rev.rating || 5)}${'☆'.repeat(5 - (rev.rating || 5))}
          </span>
          <h4 class="font-semibold text-sm text-gray-900">${escapeHtml(rev.title || '')}</h4>
        </div>

        <p class="text-sm text-gray-600 leading-relaxed">
          ${escapeHtml(rev.comment || rev.text || '')}
        </p>
      </div>
    `;

    // Inject Ad Card after every N reviews
    if ((index + 1) % REVIEWS_CONFIG.adInterval === 0 && (index + 1) !== paginatedReviews.length) {
      reviewsHtml += createReviewAdCardTemplate(`review-ad-slot-${page}-${index + 1}`);
    }
  });

  // Append matching pagination controls at bottom
  const paginationControlsHtml = renderPaginationControls(
    totalReviews, 
    page, 
    REVIEWS_CONFIG.pageSize, 
    'renderPaginatedReviews'
  );

  container.innerHTML = reviewsHtml + paginationControlsHtml;
}

/**
 * Universal Shared Pagination Controls Renderer
 */
function renderPaginationControls(totalItems, currentPage, pageSize, callbackFuncName) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return '';

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
      <button onclick="${callbackFuncName}(${page})" 
              class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }">
        ${page}
      </button>
    `;
  }).join('');

  return `
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-gray-200">
      <div class="text-xs text-gray-500">
        Showing <span class="font-semibold text-gray-900">${startItem}</span> to <span class="font-semibold text-gray-900">${endItem}</span> of <span class="font-semibold text-gray-900">${totalItems}</span> reviews
      </div>

      <nav class="flex items-center gap-1.5" aria-label="Pagination">
        <button onclick="${callbackFuncName}(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''} 
                class="px-2.5 h-8 flex items-center gap-1 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          <i class="fa-solid fa-arrow-left text-[10px]"></i> Prev
        </button>

        <div class="flex items-center gap-1">
          ${pageButtonsHtml}
        </div>

        <button onclick="${callbackFuncName}(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''} 
                class="px-2.5 h-8 flex items-center gap-1 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          Next <i class="fa-solid fa-arrow-right text-[10px]"></i>
        </button>
      </nav>
    </div>
  `;
}

/**
 * Switch main hero image on thumbnail click
 */
function changeMainImage(src, btnElement) {
  const mainImage = document.getElementById('main-product-image');
  if (mainImage) mainImage.src = src;

  document.querySelectorAll('.thumbnail-btn').forEach(btn => {
    btn.classList.remove('border-blue-600');
    btn.classList.add('border-gray-200');
  });

  if (btnElement) {
    btnElement.classList.remove('border-gray-200');
    btnElement.classList.add('border-blue-600');
  }
}