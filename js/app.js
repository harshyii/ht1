/**
 * Global Application Engine (JK Enterprises)
 * Handles Cart Management, Dynamic Head/Header/Footer Component Injection, 
 * Home Page Blog Section Rendering, Ad Injection, and Global Events
 */
const App = {
  CART_KEY: 'jk_cart',
  COUPON_KEY: 'jke_applied_coupon',

  /**
   * Escape HTML utility to prevent XSS vulnerabilities
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  async init() {
    await this.injectHeadComponent();
    await this.renderHeader();
    
    // Render Sitewide Top Announcement Bar Ad Placement
    if (typeof AdManager !== 'undefined') {
      await AdManager.renderTopBar('top-announcement-bar');
    }

    await this.renderFooter();
    await this.renderHomeBlogsSection(); // Renders latest blogs on index/home page
    this.updateCartBadge();
    this.bindGlobalEvents();
  },

  // -------------------------------------------------------------
  // PARTIAL COMPONENTS INJECTION
  // -------------------------------------------------------------
  async injectHeadComponent() {
    const headTarget = document.getElementById('head-component');
    if (!headTarget) return;

    try {
      const res = await fetch('./components/head.html');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const html = await res.text();
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      Array.from(tempDiv.childNodes).forEach(node => {
        if (node.tagName === 'SCRIPT') {
          const script = document.createElement('script');
          if (node.src) script.src = node.src;
          if (node.innerHTML) script.innerHTML = node.innerHTML;
          if (node.type) script.type = node.type;
          if (node.async) script.async = true;
          if (node.defer) script.defer = true;
          document.head.appendChild(script);
        } else if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          document.head.appendChild(node.cloneNode(true));
        }
      });
    } catch (e) {
      console.warn('Head partial load skipped or failed:', e);
    }
  },

  async renderHeader() {
    const headerElem = document.getElementById('main-header') || document.getElementById('header-component');
    if (!headerElem) return;

    try {
      const res = await fetch('./components/header.html');
      if (res.ok) {
        headerElem.innerHTML = await res.text();
        this.updateCartBadge();
        return;
      }
    } catch (e) {
      console.warn('Fetching header.html failed, using fallback template.', e);
    }

    // Fallback Header Template (Includes top announcement container)
    headerElem.innerHTML = `
      <div id="top-announcement-bar"></div>
      <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm" aria-label="Main navigation">
        <div class="container">
          <a class="navbar-brand fw-bold text-uppercase tracking-wide" href="/index.html" aria-label="JK Enterprises Home">
            <span class="text-warning">JK</span> Enterprises
          </a>

          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent" aria-controls="navContent" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>

          <div class="collapse navbar-collapse" id="navContent">
            <form class="d-flex my-2 my-lg-0 mx-auto w-50" onsubmit="App.handleSearch(event)" role="search">
              <label for="global-search-input" class="visually-hidden">Search tools, equipment and brands</label>
              <input id="global-search-input" class="form-control me-2" type="search" name="search" placeholder="Search tools, solar, equipment..." autocomplete="off" aria-label="Search tools">
              <button class="btn btn-warning" type="submit">Search</button>
            </form>

            <ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center">
              <li class="nav-item"><a class="nav-link" href="/index.html">Home</a></li>
              <li class="nav-item"><a class="nav-link" href="/catalog.html">Catalog</a></li>
              <li class="nav-item"><a class="nav-link" href="/blogs.html">Blogs</a></li>
              <li class="nav-item">
                <a class="nav-link btn btn-outline-warning ms-lg-2 px-3 position-relative text-white" href="/cart.html" aria-label="Shopping cart">
                  🛒 Cart
                  <span class="cart-count-badge badge bg-danger rounded-pill position-absolute top-0 start-100 translate-middle">0</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    `;
    this.updateCartBadge();
  },

  async renderFooter() {
    const footerElem = document.getElementById('main-footer') || document.getElementById('footer-component');
    if (!footerElem) return;

    try {
      const res = await fetch('./components/footer.html');
      if (res.ok) {
        footerElem.innerHTML = await res.text();
        return;
      }
    } catch (e) {
      console.warn('Fetching footer.html failed, using fallback template.', e);
    }

    const currentYear = new Date().getFullYear();

    // Fallback Footer Template
    footerElem.innerHTML = `
      <footer class="bg-dark text-light pt-5 pb-3 mt-5 border-top border-secondary">
        <div class="container">
          <div class="row g-4">
            <div class="col-md-4">
              <h5 class="text-warning fw-bold mb-3">JK Enterprises</h5>
              <p class="text-light-emphasis small mb-0">
                Authorised Wholesaler & Retailer of Industrial Power Tools, On-Grid Solar Systems, and Machinery in Pehowa.
              </p>
            </div>
            <div class="col-md-4">
              <h6 class="fw-bold mb-3">Quick Links</h6>
              <ul class="list-unstyled small mb-0 space-y-1">
                <li><a href="/index.html" class="text-light-emphasis text-decoration-none">Home</a></li>
                <li><a href="/catalog.html" class="text-light-emphasis text-decoration-none">Browse Catalog</a></li>
                <li><a href="/blogs.html" class="text-light-emphasis text-decoration-none">Knowledge Hub / Blogs</a></li>
                <li><a href="/cart.html" class="text-light-emphasis text-decoration-none">Shopping Cart</a></li>
              </ul>
            </div>
            <div class="col-md-4">
              <h6 class="fw-bold mb-3">Accepted Payments & Contact</h6>
              <p class="text-light-emphasis small mb-1">Payments: UPI, Net Banking, Direct QR</p>
              <p class="text-light-emphasis small mb-0">Location: Pehowa, Haryana</p>
            </div>
          </div>
          <hr class="border-secondary mt-4">
          <p class="text-light-emphasis small mb-0 text-center">
            &copy; ${currentYear} JK Enterprises. All Rights Reserved.
          </p>
        </div>
      </footer>
    `;
  },

  // -------------------------------------------------------------
  // DYNAMIC HOME BLOGS SECTION RENDERER
  // -------------------------------------------------------------
  async renderHomeBlogsSection() {
    const blogContainer = document.getElementById('home-blogs-section');
    if (!blogContainer) return;

    try {
      const res = await fetch('./data/blogs.json');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const blogs = await res.json();

      // Take the 3 most recent blogs
      const latestBlogs = Array.isArray(blogs) ? blogs.slice(0, 3) : [];

      if (latestBlogs.length === 0) {
        blogContainer.style.display = 'none';
        return;
      }

      const blogCardsHtml = latestBlogs.map(blog => {
        const imageUrl = blog.featuredImage || blog.thumbnail || 'https://via.placeholder.com/600x400?text=No+Image';
        const staticBlogUrl = `/blogs/${encodeURIComponent(blog.slug || blog.id)}.html`;

        return `
          <div class="col-md-4">
            <div class="card h-100 shadow-sm border-0 rounded-3 overflow-hidden">
              <a href="${staticBlogUrl}">
                <img src="${imageUrl}" class="card-img-top" alt="${this.escapeHtml(blog.title)}" style="height: 200px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/600x400?text=Image+Unavailable'">
              </a>
              <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="badge bg-primary-subtle text-primary text-uppercase font-mono">${this.escapeHtml(blog.category || 'General')}</span>
                  <small class="text-muted">${blog.readingTime ? this.escapeHtml(blog.readingTime) + ' min read' : ''}</small>
                </div>
                <h5 class="card-title fw-bold">
                  <a href="${staticBlogUrl}" class="text-decoration-none text-dark hover-primary">${this.escapeHtml(blog.title)}</a>
                </h5>
                <p class="card-text text-secondary small flex-grow-1">
                  ${this.escapeHtml(blog.excerpt || blog.summary || '')}
                </p>
                <div class="pt-3 mt-2 border-top d-flex justify-content-between align-items-center text-muted small">
                  <span>By ${this.escapeHtml(blog.author || 'JK Enterprises')}</span>
                  <span>${this.escapeHtml(blog.publishDate || '')}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      blogContainer.innerHTML = `
        <section class="py-5 bg-light border-top border-bottom">
          <div class="container">
            <div class="d-flex justify-content-between align-items-end mb-4">
              <div>
                <span class="text-uppercase text-primary fw-bold small tracking-wider">Resources & Guides</span>
                <h2 class="fw-bold text-dark m-0">Latest Knowledge & Insights</h2>
              </div>
              <a href="/blogs.html" class="btn btn-outline-primary btn-sm fw-bold">View All Articles →</a>
            </div>
            <div class="row g-4">
              ${blogCardsHtml}
            </div>
          </div>
        </section>
      `;
    } catch (e) {
      console.warn('Home blogs section failed to render:', e);
    }
  },

  // -------------------------------------------------------------
  // CART STATE MANAGEMENT
  // -------------------------------------------------------------
  getCart() {
    try {
      return JSON.parse(localStorage.getItem(this.CART_KEY)) || [];
    } catch (e) {
      console.error('Error reading cart from localStorage:', e);
      return [];
    }
  },

  saveCart(cart) {
    try {
      localStorage.setItem(this.CART_KEY, JSON.stringify(cart));
      this.updateCartBadge();
    } catch (e) {
      console.error('Error saving cart to localStorage:', e);
    }
  },

  // Inside app.js -> addToCart(product, quantity = 1)

addToCart(product, quantity = 1) {
  const cart = this.getCart();
  const productId = String(product.id || product.asin);
  const existingIndex = cart.findIndex(item => String(item.id) === productId || String(item.asin) === productId);

  // Read price and image regardless of key formats
  const itemPrice = parseFloat(product.price || product.currentPrice) || 0;
  const itemImage = product.image || product.thumbnail || product.featuredImage || '';

  if (existingIndex > -1) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({
      id: productId,
      asin: product.asin || '',
      title: product.title || 'Product Item',
      brand: product.brand || '',
      price: itemPrice,             // Saves as 'price' for cart-renderer.js
      currentPrice: itemPrice,      // Keeps 'currentPrice' for backwards compatibility
      image: itemImage,             // Saves as 'image' for cart-renderer.js
      thumbnail: itemImage,         // Keeps 'thumbnail' for backwards compatibility
      quantity: quantity
    });
  }

  this.saveCart(cart);
  this.showToast(`Added "${product.title}" to cart!`);
},

  removeFromCart(productId) {
    let cart = this.getCart();
    const targetId = String(productId);
    cart = cart.filter(item => String(item.id) !== targetId && String(item.asin) !== targetId);
    this.saveCart(cart);
  },

  updateQuantity(productId, newQty) {
    const cart = this.getCart();
    const targetId = String(productId);
    const item = cart.find(i => String(i.id) === targetId || String(i.asin) === targetId);
    if (item) {
      item.quantity = Math.max(1, parseInt(newQty, 10) || 1);
      this.saveCart(cart);
    }
  },

  getCartSubtotal() {
    return this.getCart().reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0);
  },

  updateCartBadge() {
    const totalCount = this.getCart().reduce((sum, item) => sum + item.quantity, 0);
    const badges = document.querySelectorAll('.cart-count-badge, #cart-badge-count');
    badges.forEach(badge => {
      badge.textContent = totalCount;
      if (badge.tagName === 'SPAN' && badge.classList.contains('badge')) {
        badge.style.display = totalCount > 0 ? 'inline-block' : 'none';
      }
    });
  },

  // -------------------------------------------------------------
  // EVENTS & UTILITIES
  // -------------------------------------------------------------
  handleSearch(e) {
    e.preventDefault();
    const input = document.getElementById('global-search-input');
    const query = input ? input.value.trim() : '';
    if (query) {
      window.location.href = `/catalog.html?search=${encodeURIComponent(query)}`;
    }
  },

  bindGlobalEvents() {},

  showToast(msg) {
    let container = document.getElementById('app-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'app-toast-container';
      container.className = 'position-fixed bottom-0 end-0 p-3';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-dark border-0 show shadow-lg mb-2';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body font-medium text-sm">
          ${this.escapeHtml(msg)}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close" onclick="this.closest('.toast').remove()"></button>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.remove();
      }
    }, 3500);
  }
};


App.init();