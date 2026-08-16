/**
 * Tailwind-Compatible Blog Engine & Truncated Pagination Renderer with In-Feed Ads
 */

const BLOG_CONFIG = {
  pageSize: 12,
  currentPage: 1,
  adInterval: 6, // Inject an ad card after every N articles
  allBlogs: [],
  filteredBlogs: [],
  searchQuery: '',
  selectedCategory: 'all',
  containerId: 'blog-grid',
  paginationContainerId: 'pagination-container'
};

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

async function loadBlogGrid(page = 1) {
  BLOG_CONFIG.currentPage = page;
  const gridContainer = document.getElementById(BLOG_CONFIG.containerId);
  const paginationContainer = document.getElementById(BLOG_CONFIG.paginationContainerId);

  if (!gridContainer) return;

  try {
    // Fetch blogs array if not cached
    if (BLOG_CONFIG.allBlogs.length === 0) {
      const res = await fetch('./data/blogs.json');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      BLOG_CONFIG.allBlogs = await res.json();
      BLOG_CONFIG.filteredBlogs = [...BLOG_CONFIG.allBlogs];
    }

    const totalBlogs = BLOG_CONFIG.filteredBlogs.length;
    if (totalBlogs === 0) {
      gridContainer.innerHTML = `
        <div class="col-span-full text-center text-gray-500 py-16 bg-white rounded-2xl border border-gray-100 p-8">
          <i class="fa-solid fa-newspaper text-4xl text-gray-300 mb-3 block"></i>
          <p class="text-lg font-semibold text-gray-700">No blog articles found</p>
          <p class="text-sm text-gray-400 mt-1">Try resetting your search filters or selecting a different category.</p>
        </div>`;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    // Slice blogs per page
    const startIndex = (page - 1) * BLOG_CONFIG.pageSize;
    const endIndex = Math.min(startIndex + BLOG_CONFIG.pageSize, totalBlogs);
    const paginatedBlogs = BLOG_CONFIG.filteredBlogs.slice(startIndex, endIndex);

    // Render Cards in Tailwind CSS with In-Feed Ads
    let gridContentHtml = '';
    paginatedBlogs.forEach((blog, index) => {
      const imageUrl = blog.featuredImage || blog.thumbnail || 'https://via.placeholder.com/600x400?text=No+Image';
      const blogUrl = `/public/blogs/${encodeURIComponent(blog.slug || blog.id)}.html`;

      gridContentHtml += `
        <article class="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full">
          <a href="${blogUrl}" class="block overflow-hidden">
            <img src="${imageUrl}" alt="${escapeHtml(blog.title)}" class="w-full h-48 object-cover hover:scale-105 transition-transform duration-300" onerror="this.src='https://via.placeholder.com/600x400?text=Image+Unavailable'">
          </a>
          <div class="p-5 flex flex-col flex-grow">
            <div class="flex justify-between items-center text-xs font-semibold mb-3">
              <span class="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md uppercase tracking-wider">${escapeHtml(blog.category || 'General')}</span>
              <span class="text-gray-400">${blog.readingTime ? escapeHtml(blog.readingTime) + ' min read' : ''}</span>
            </div>
            <h2 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600">
              <a href="${blogUrl}">${escapeHtml(blog.title)}</a>
            </h2>
            <p class="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
              ${escapeHtml(blog.excerpt || blog.summary || '')}
            </p>
            <div class="pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
              <span>By ${escapeHtml(blog.author || 'JK Enterprises')}</span>
              <span>${escapeHtml(blog.publishDate || '')}</span>
            </div>
          </div>
        </article>
      `;

      // Inject In-Feed Ad Card after every N articles (unless it's the last item in the page)
      if ((index + 1) % BLOG_CONFIG.adInterval === 0 && (index + 1) !== paginatedBlogs.length) {
        gridContentHtml += createBlogAdCardTemplate(`blog-ad-slot-${page}-${index + 1}`);
      }
    });

    gridContainer.innerHTML = gridContentHtml;

    // Render Clean Truncated Pagination Controls
    if (paginationContainer) {
      paginationContainer.innerHTML = renderPaginationControls(totalBlogs, page, BLOG_CONFIG.pageSize);
    }

  } catch (error) {
    console.error('Blog load error:', error);
    gridContainer.innerHTML = `<div class="col-span-full text-center text-red-500 py-12">Unable to load blog articles. Please try again later.</div>`;
  }
}

/**
 * Filter Blogs by Search Keyword and Category
 */
function filterBlogGrid(searchQuery = '', category = 'all') {
  BLOG_CONFIG.searchQuery = searchQuery.trim().toLowerCase();
  BLOG_CONFIG.selectedCategory = category;

  BLOG_CONFIG.filteredBlogs = BLOG_CONFIG.allBlogs.filter(blog => {
    const matchesSearch = !BLOG_CONFIG.searchQuery || 
      (blog.title && blog.title.toLowerCase().includes(BLOG_CONFIG.searchQuery)) ||
      (blog.excerpt && blog.excerpt.toLowerCase().includes(BLOG_CONFIG.searchQuery)) ||
      (blog.category && blog.category.toLowerCase().includes(BLOG_CONFIG.searchQuery));

    const matchesCategory = BLOG_CONFIG.selectedCategory === 'all' || 
      (blog.category && blog.category.toLowerCase() === BLOG_CONFIG.selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  loadBlogGrid(1);
}

/**
 * Native Ad Card Template matching Grid Design
 */
function createBlogAdCardTemplate(slotId = 'blog-ad-slot') {
  return `
    <article class="bg-gray-50 rounded-2xl border border-dashed border-gray-300 shadow-sm p-5 flex flex-col justify-between h-full relative text-center">
      <div>
        <div class="flex justify-between items-center text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-3">
          <span>Sponsored Article</span>
          <i class="fa-solid fa-rectangle-ad text-gray-400 text-xs"></i>
        </div>
        
        <div id="${slotId}" class="py-10 bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center my-2 px-4">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wide">Advertisement</span>
          <p class="text-[11px] text-gray-400 mt-1">Your Banner or Google AdSense Block</p>
        </div>
      </div>

      <div class="pt-3 border-t border-gray-200/60 flex justify-between items-center text-xs text-gray-400 mt-4">
        <span>Promoted Content</span>
        <span class="text-blue-600 font-medium hover:underline cursor-pointer">Learn More &rarr;</span>
      </div>
    </article>
  `;
}

/**
 * Truncated Pagination Builder
 */
function renderPaginationControls(totalItems, currentPage, pageSize) {
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
      <button onclick="loadBlogGrid(${page})" 
              class="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }">
        ${page}
      </button>
    `;
  }).join('');

  return `
    <div class="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 mt-10 border-t border-gray-200">
      <div class="text-sm text-gray-500">
        Showing <span class="font-semibold text-gray-900">${startItem}</span> to <span class="font-semibold text-gray-900">${endItem}</span> of <span class="font-semibold text-gray-900">${totalItems}</span> articles
      </div>

      <nav class="flex items-center gap-2" aria-label="Pagination">
        <button onclick="loadBlogGrid(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''} 
                class="px-3 h-9 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          <i class="fa-solid fa-arrow-left text-xs"></i> Previous
        </button>

        <div class="flex items-center gap-1.5">
          ${pageButtonsHtml}
        </div>

        <button onclick="loadBlogGrid(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''} 
                class="px-3 h-9 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          Next <i class="fa-solid fa-arrow-right text-xs"></i>
        </button>
      </nav>
    </div>
  `;
}

/**
 * Helper to bind search input and category filter DOM elements if present
 */
function bindBlogSearchControls(searchInputId = 'blog-search-input', categorySelectId = 'blog-category-select') {
  const searchInput = document.getElementById(searchInputId);
  const categorySelect = document.getElementById(categorySelectId);

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterBlogGrid(e.target.value, categorySelect ? categorySelect.value : 'all');
      }, 300);
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      filterBlogGrid(searchInput ? searchInput.value : '', e.target.value);
    });
  }
}

// Auto-run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById(BLOG_CONFIG.containerId)) {
    loadBlogGrid(1);
    bindBlogSearchControls();
  }
});