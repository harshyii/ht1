/**
 * Global Ad Engine (JK Enterprises)
 * Handles loading, target link binding, and rendering of ad banners/sponsored cards
 */
const AdManager = {
  adsData: null,

  async init() {
    try {
      const res = await fetch('/data/ads.json');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      this.adsData = await res.json();
    } catch (e) {
      console.warn('Ad data loading failed or file missing:', e);
    }
  },

  /**
   * 1. Top Announcement Bar (Header)
   */
  async renderTopBar(containerId = 'top-announcement-bar') {
    if (!this.adsData) await this.init();
    const container = document.getElementById(containerId);
    const ad = this.adsData?.topBanner;

    if (!container || !ad || !ad.active) return;

    container.innerHTML = `
      <div class="bg-warning text-dark py-1 px-3 text-center small fw-semibold d-flex justify-content-center align-items-center">
        <span class="me-2">📢 <strong>${App.escapeHtml(ad.title)}:</strong> ${App.escapeHtml(ad.subtitle)}</span>
        <a href="${App.escapeHtml(ad.targetUrl)}" class="btn btn-dark btn-sm py-0 px-2 font-mono ms-2 fw-bold text-decoration-none">
          ${App.escapeHtml(ad.ctaText)} →
        </a>
      </div>
    `;
  },

  /**
   * 2. Sidebar Banner Placement (Catalog/Blogs)
   */
  async renderSidebarAd(containerId, placementKey) {
    if (!this.adsData) await this.init();
    const container = document.getElementById(containerId);
    if (!container) return;

    const ad = (this.adsData?.sidebarBanners || []).find(b => b.placement === placementKey && b.active);
    if (!ad) return;

    container.innerHTML = `
      <div class="card border-0 shadow-sm overflow-hidden mb-4">
        <a href="${App.escapeHtml(ad.targetUrl)}" target="_blank" rel="noopener">
          <img src="${App.escapeHtml(ad.image)}" alt="${App.escapeHtml(ad.alt)}" class="img-fluid w-100" onerror="this.style.display='none'">
        </a>
        <div class="card-body bg-light p-2 text-center">
          <small class="text-muted d-block font-mono fs-7">ADVERTISEMENT</small>
          <a href="${App.escapeHtml(ad.targetUrl)}" class="fw-bold text-dark text-decoration-none small">
            ${App.escapeHtml(ad.title)}
          </a>
        </div>
      </div>
    `;
  },

  /**
   * 3. Cart Cross-Sell Ad Unit
   */
  async renderCartCrossSell(containerId) {
    if (!this.adsData) await this.init();
    const container = document.getElementById(containerId);
    const ad = this.adsData?.cartCrossSell;

    if (!container || !ad || !ad.active) return;

    container.innerHTML = `
      <div class="alert alert-info d-flex justify-content-between align-items-center mt-3 shadow-sm mb-0">
        <div>
          <span class="badge bg-primary text-uppercase me-2">Special Offer</span>
          <strong>${App.escapeHtml(ad.title)}</strong>
        </div>
        <a href="${App.escapeHtml(ad.targetUrl)}" class="btn btn-sm btn-outline-primary fw-bold">
          Explore Deals →
        </a>
      </div>
    `;
  }
};