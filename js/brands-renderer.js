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

/**
 * Renders Brands Grid on homepage or brands page
 * @param {string} containerId - DOM container ID
 */
async function renderBrandsGrid(containerId = 'brands-grid') {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const res = await fetch('data/brands.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const brands = await res.json();

    if (!Array.isArray(brands) || brands.length === 0) {
      container.innerHTML = `<p class="text-gray-500 text-center py-4">No brands found.</p>`;
      return;
    }

    container.innerHTML = brands.map(brand => `
      <a href="${escapeHtml(brand.url)}" class="brand-card group block p-3 border rounded-lg bg-white hover:shadow-md transition">
        <!-- Reduced aspect box size using h-28 / max-h-24 -->
        <div class="h-28 w-full mb-2 overflow-hidden rounded bg-gray-50 flex items-center justify-center p-2">
          <img 
            src="${escapeHtml(brand.image)}" 
            alt="${escapeHtml(brand.name)}" 
            class="max-h-20 max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
        <h4 class="font-bold text-gray-900 text-center text-xs sm:text-sm group-hover:text-blue-600 truncate">
          ${escapeHtml(brand.name)}
        </h4>
        <p class="text-xs text-gray-500 text-center mt-0.5">
          ${brand.productCount} Product${brand.productCount !== 1 ? 's' : ''}
        </p>
      </a>
    `).join('');

  } catch (err) {
    console.error('Error rendering brands:', err);
    container.innerHTML = `<p class="text-red-500 text-center py-4">Failed to load brands.</p>`;
  }
}